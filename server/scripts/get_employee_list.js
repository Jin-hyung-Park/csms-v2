const mongoose = require('mongoose');
const User = require('../models/User');
const Store = require('../models/Store');

// MongoDB 연결
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/convenience_store', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const getEmployeeList = async () => {
  try {
    // 대치메가점 찾기
    const store = await Store.findOne({ name: /대치메가/i });
    
    if (!store) {
      console.log('대치메가점을 찾을 수 없습니다.');
      console.log('등록된 점포 목록:');
      const allStores = await Store.find({}, 'name address');
      allStores.forEach(s => console.log(`- ${s.name} (${s.address})`));
      return;
    }

    console.log(`\n📍 대치메가점 정보:`);
    console.log(`점포명: ${store.name}`);
    console.log(`주소: ${store.address}`);
    console.log(`점포 ID: ${store._id}`);

    // 해당 점포의 모든 근무자 조회 (비밀번호 포함)
    const employees = await User.find({ 
      storeId: store._id,
      role: { $in: ['employee', 'manager'] },
      isActive: { $ne: false }
    }).select('+password');

    console.log(`\n👥 근무자 목록 (총 ${employees.length}명):`);
    console.log('='.repeat(80));
    
    employees.forEach((employee, index) => {
      console.log(`\n${index + 1}. ${employee.username} (${employee.role === 'manager' ? '매니저' : '근로자'})`);
      console.log(`   이메일: ${employee.email}`);
      console.log(`   시급: ${employee.hourlyWage?.toLocaleString() || 'N/A'}원`);
      console.log(`   세금유형: ${employee.taxType || 'N/A'}`);
      console.log(`   입사일: ${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('ko-KR') : 'N/A'}`);
      console.log(`   상태: ${employee.isActive === false ? '비활성' : '활성'}`);
      
      // 비밀번호는 해시되어 있으므로 원본을 알 수 없음
      console.log(`   비밀번호: [암호화됨] (원본 비밀번호는 복구 불가능)`);
      
      if (employee.phoneNumber) {
        console.log(`   전화번호: ${employee.phoneNumber}`);
      }
      if (employee.address) {
        console.log(`   주소: ${employee.address}`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('📝 참고사항:');
    console.log('- 비밀번호는 bcrypt로 암호화되어 있어 원본을 확인할 수 없습니다.');
    console.log('- 비밀번호 재설정이 필요한 경우 관리자 페이지에서 진행하세요.');
    console.log('- 기본 비밀번호는 보통 "123456" 또는 "password123"입니다.');

  } catch (error) {
    console.error('Error:', error);
  }
};

// 스크립트 실행
const run = async () => {
  await connectDB();
  await getEmployeeList();
  process.exit(0);
};

run();
