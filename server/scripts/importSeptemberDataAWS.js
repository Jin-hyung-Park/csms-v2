const ExcelJS = require('exceljs');
const path = require('path');
const mongoose = require('mongoose');

// AWS 서버에서 사용할 환경변수
const AWS_MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/convenience_store';

const User = require('../models/User');
const Store = require('../models/Store');
const WorkSchedule = require('../models/WorkSchedule');

async function importData() {
  try {
    await mongoose.connect(AWS_MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ AWS MongoDB 연결 성공');
    
    // 1. 점포 확인/생성
    let store = await Store.findOne({ name: '대치메가' });
    if (!store) {
      const owner = await User.findOne({ role: 'owner' });
      if (!owner) throw new Error('점주가 없습니다');
      store = await Store.create({
        ownerId: owner._id,
        name: '대치메가',
        address: '대치동',
        ownerName: owner.username
      });
      console.log('✅ 새 점포 생성: 대치메가');
    }
    
    // 2. 9월 데이터 삭제
    console.log('\n🗑️  9월 근무일정 삭제 중...');
    const deletedSchedules = await WorkSchedule.deleteMany({
      workDate: { $gte: new Date('2025-09-01'), $lt: new Date('2025-10-01') },
      storeId: store._id
    });
    console.log(`   삭제된 일정: ${deletedSchedules.deletedCount}개`);
    
    // 3. 엑셀 읽기
    const fs = require('fs');
    
    // 여러 가능한 경로 시도
    let sampleDir = '';
    const possiblePaths = [
      path.join(__dirname, '../../sample data/'),
      '/var/www/convenience-store/sample data/',
      './sample data/',
      path.join(__dirname, '../../../sample data/')
    ];
    
    for (const tryPath of possiblePaths) {
      if (fs.existsSync(tryPath)) {
        sampleDir = tryPath;
        break;
      }
    }
    
    if (!sampleDir) {
      throw new Error('sample data 폴더를 찾을 수 없습니다.');
    }
    
    const files = fs.readdirSync(sampleDir);
    const xlsxFile = files.find(f => f.endsWith('.xlsx'));
    const filePath = path.join(sampleDir, xlsxFile);
    
    console.log('\n📖 엑셀 파일 읽기:', filePath);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(2);
    
    console.log('📋 워크시트:', worksheet.name);
    
    // 4. 데이터 파싱: 근무자별 일자와 시간만
    const workSchedules = [];
    let currentWeekStartDate = null;
    let currentWeekNumber = 0;
    
    for (let rowIndex = 4; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      const col1 = row.getCell(1)?.value;
      const col2 = row.getCell(2)?.value;
      
      // 일자 행 건너뛰기
      if (col2 === '일자') continue;
      
      // 주차 확인 (주차가 있으면 시작일 갱신)
      if (typeof col1 === 'string' && col1.includes('주차')) {
        currentWeekNumber = parseInt(col1.replace('주차', ''));
        // 9월 1일 월요일부터 시작
        currentWeekStartDate = new Date(2025, 8, 1 + (currentWeekNumber - 1) * 7);
      }
      
      // 일자가 숫자가 아니면 건너뛰기
      const dayOfWeek = parseInt(col2);
      if (isNaN(dayOfWeek) || !currentWeekStartDate) continue;
      
      // 각 요일별 데이터 수집 (월~일)
      const daysMapping = [
        { name: 3, start: 4, end: 5 },   // 월
        { name: 8, start: 9, end: 10 },  // 화
        { name: 13, start: 14, end: 15 }, // 수
        { name: 18, start: 19, end: 20 }, // 목
        { name: 23, start: 24, end: 25 }, // 금
        { name: 28, start: 29, end: 30 }, // 토
        { name: 33, start: 34, end: 35 }  // 일
      ];
      
      for (let weekDay = 0; weekDay < daysMapping.length; weekDay++) {
        const colInfo = daysMapping[weekDay];
        const nameCell = row.getCell(colInfo.name);
        const startCell = row.getCell(colInfo.start);
        const endCell = row.getCell(colInfo.end);
        
        const employeeName = nameCell?.value;
        const startTime = startCell?.value;
        const endTime = endCell?.value;
        
        // 기본 검증
        if (!employeeName || !startTime || !endTime) continue;
        if (typeof employeeName !== 'string') continue;
        
        // 시간 문자열 생성 (Excel 시간은 UTC 기준으로 저장됨)
        let startStr, endStr;
        
        if (typeof startTime === 'object' && startTime.getUTCHours !== undefined) {
          startStr = `${startTime.getUTCHours().toString().padStart(2, '0')}:${startTime.getUTCMinutes().toString().padStart(2, '0')}`;
        } else if (typeof startTime === 'object' && startTime.getHours) {
          startStr = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;
        } else {
          startStr = String(startTime);
        }
        
        if (typeof endTime === 'object' && endTime.getUTCHours !== undefined) {
          endStr = `${endTime.getUTCHours().toString().padStart(2, '0')}:${endTime.getUTCMinutes().toString().padStart(2, '0')}`;
        } else if (typeof endTime === 'object' && endTime.getHours) {
          endStr = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
        } else {
          endStr = String(endTime);
        }
        
        // 시간 형식 확인 (HH:MM)
        if (!/^\d{2}:\d{2}$/.test(startStr) || !/^\d{2}:\d{2}$/.test(endStr)) continue;
        
        // 날짜 계산: 현재 주차 시작일 + 주차 내 일자 + 요일 오프셋
        const actualDate = new Date(currentWeekStartDate);
        actualDate.setDate(currentWeekStartDate.getDate() + (dayOfWeek - 1) * 7 + weekDay);
        
        workSchedules.push({
          employeeName: employeeName.trim(),
          date: actualDate.toISOString().split('T')[0],
          startTime: startStr,
          endTime: endStr
        });
      }
    }
    
    console.log(`\n✅ 총 근무일정: ${workSchedules.length}개`);
    
    // 9월 데이터만 필터링
    const septemberSchedules = workSchedules.filter(s => {
      const date = new Date(s.date);
      return date.getMonth() === 8 && date.getFullYear() === 2025;
    });
    
    console.log(`✅ 9월 일정: ${septemberSchedules.length}개`);
    
    // 처음 10개 미리보기
    console.log('\n📋 처음 10개 일정:');
    septemberSchedules.slice(0, 10).forEach((s, i) => {
      console.log(`${i+1}. ${s.employeeName} - ${s.date}: ${s.startTime} ~ ${s.endTime}`);
    });
    
    // 5. DB 저장
    console.log('\n📝 근무일정 저장 중...');
    let successCount = 0, failCount = 0;
    const notFoundUsers = new Set();
    
    for (const schedule of septemberSchedules) {
      try {
        const user = await User.findOne({ username: schedule.employeeName });
        if (!user) {
          notFoundUsers.add(schedule.employeeName);
          failCount++;
          continue;
        }
        
        await WorkSchedule.create({
          userId: user._id,
          storeId: store._id,
          workDate: new Date(schedule.date),
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          status: 'approved',
          approvedBy: store.ownerId,
          approvedAt: new Date()
        });
        
        successCount++;
      } catch (error) {
        console.log(`⚠️  저장 실패: ${schedule.employeeName} - ${schedule.date}`, error.message);
        failCount++;
      }
    }
    
    console.log(`\n✅ 저장 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
    
    if (notFoundUsers.size > 0) {
      console.log(`\n⚠️  사용자를 찾을 수 없음 (${notFoundUsers.size}명):`);
      notFoundUsers.forEach(name => console.log(`   - ${name}`));
    }
    
  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
  }
}

importData();

