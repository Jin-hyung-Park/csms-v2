from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from datetime import datetime, timedelta
import os
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///convenience_store.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# 데이터베이스 모델
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), default='employee')  # employee, owner
    hourly_wage = db.Column(db.Float, default=0.0)
    tax_type = db.Column(db.String(20), default='일반')  # 일반, 청소년, 장애인
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class WorkSchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    work_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    total_hours = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, modified
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# 라우트
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for('dashboard'))
        else:
            flash('잘못된 사용자명 또는 비밀번호입니다.')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    if current_user.role == 'owner':
        return redirect(url_for('owner_dashboard'))
    else:
        return redirect(url_for('employee_dashboard'))

@app.route('/employee/dashboard')
@login_required
def employee_dashboard():
    if current_user.role != 'employee':
        return redirect(url_for('dashboard'))
    
    # 최근 근무 기록
    recent_schedules = WorkSchedule.query.filter_by(user_id=current_user.id).order_by(WorkSchedule.work_date.desc()).limit(5).all()
    
    # 미읽 알림
    unread_notifications = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()
    
    return render_template('employee/dashboard.html', 
                         recent_schedules=recent_schedules,
                         unread_notifications=unread_notifications)

@app.route('/owner/dashboard')
@login_required
def owner_dashboard():
    if current_user.role != 'owner':
        return redirect(url_for('dashboard'))
    
    # 승인 대기 중인 요청
    pending_requests = WorkSchedule.query.filter_by(status='pending').all()
    
    # 전체 근로자 수
    total_employees = User.query.filter_by(role='employee', is_active=True).count()
    
    return render_template('owner/dashboard.html',
                         pending_requests=pending_requests,
                         total_employees=total_employees)

@app.route('/employee/work-schedule', methods=['GET', 'POST'])
@login_required
def work_schedule():
    if current_user.role != 'employee':
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        work_date = datetime.strptime(request.form.get('work_date'), '%Y-%m-%d').date()
        start_time = datetime.strptime(request.form.get('start_time'), '%H:%M').time()
        end_time = datetime.strptime(request.form.get('end_time'), '%H:%M').time()
        
        # 기존 기록이 있는지 확인
        existing_schedule = WorkSchedule.query.filter_by(
            user_id=current_user.id, 
            work_date=work_date
        ).first()
        
        if existing_schedule:
            flash('해당 날짜에 이미 근무 기록이 있습니다.')
            return redirect(url_for('work_schedule'))
        
        # 총 근무 시간 계산
        start_dt = datetime.combine(work_date, start_time)
        end_dt = datetime.combine(work_date, end_time)
        total_hours = (end_dt - start_dt).total_seconds() / 3600
        
        new_schedule = WorkSchedule(
            user_id=current_user.id,
            work_date=work_date,
            start_time=start_time,
            end_time=end_time,
            total_hours=total_hours
        )
        
        db.session.add(new_schedule)
        db.session.commit()
        
        flash('근무 시간이 성공적으로 등록되었습니다. 점주님의 승인을 기다려주세요.')
        return redirect(url_for('employee_dashboard'))
    
    return render_template('employee/work_schedule.html')

@app.route('/owner/approve-requests')
@login_required
def approve_requests():
    if current_user.role != 'owner':
        return redirect(url_for('dashboard'))
    
    pending_requests = WorkSchedule.query.filter_by(status='pending').order_by(WorkSchedule.created_at.desc()).all()
    return render_template('owner/approve_requests.html', requests=pending_requests)

@app.route('/owner/approve/<int:schedule_id>', methods=['POST'])
@login_required
def approve_schedule(schedule_id):
    if current_user.role != 'owner':
        return jsonify({'success': False, 'message': '권한이 없습니다.'})
    
    schedule = WorkSchedule.query.get_or_404(schedule_id)
    action = request.form.get('action')
    
    if action == 'approve':
        schedule.status = 'approved'
        message = '근무 시간이 승인되었습니다.'
    elif action == 'reject':
        schedule.status = 'rejected'
        message = '근무 시간이 거절되었습니다.'
    elif action == 'modify':
        # 수정 로직
        new_start_time = datetime.strptime(request.form.get('start_time'), '%H:%M').time()
        new_end_time = datetime.strptime(request.form.get('end_time'), '%H:%M').time()
        
        schedule.start_time = new_start_time
        schedule.end_time = new_end_time
        schedule.status = 'modified'
        
        start_dt = datetime.combine(schedule.work_date, new_start_time)
        end_dt = datetime.combine(schedule.work_date, new_end_time)
        schedule.total_hours = (end_dt - start_dt).total_seconds() / 3600
        message = '근무 시간이 수정되었습니다.'
    
    # 알림 생성
    notification = Notification(
        user_id=schedule.user_id,
        title='근무 시간 승인 알림',
        message=message
    )
    db.session.add(notification)
    db.session.commit()
    
    return jsonify({'success': True, 'message': message})

@app.route('/employee/notifications')
@login_required
def notifications():
    if current_user.role != 'employee':
        return redirect(url_for('dashboard'))
    
    notifications = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.created_at.desc()).all()
    return render_template('employee/notifications.html', notifications=notifications)

@app.route('/owner/employee-management')
@login_required
def employee_management():
    if current_user.role != 'owner':
        return redirect(url_for('dashboard'))
    
    employees = User.query.filter_by(role='employee', is_active=True).all()
    return render_template('owner/employee_management.html', employees=employees)

@app.route('/owner/employee/<int:employee_id>')
@login_required
def employee_detail(employee_id):
    if current_user.role != 'owner':
        return redirect(url_for('dashboard'))
    
    employee = User.query.get_or_404(employee_id)
    schedules = WorkSchedule.query.filter_by(user_id=employee_id).order_by(WorkSchedule.work_date.desc()).all()
    notifications = Notification.query.filter_by(user_id=employee_id).order_by(Notification.created_at.desc()).all()
    
    return render_template('owner/employee_detail.html', 
                         employee=employee, 
                         schedules=schedules, 
                         notifications=notifications)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True) 