#!/usr/bin/env node

/**
 * Phase 0: WorkSchedule API 테스트 스크립트
 * 
 * 사용법:
 *   node scripts/test-api.js
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5001/api';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message) {
  console.log(`${colors.green}[테스트]${colors.reset} ${message}`);
}

function error(message) {
  console.error(`${colors.red}[실패]${colors.reset} ${message}`);
}

function success(message) {
  console.log(`${colors.blue}[성공]${colors.reset} ${message}`);
}

function info(message) {
  console.log(`${colors.yellow}[정보]${colors.reset} ${message}`);
}

async function testHealthCheck() {
  log('헬스체크 테스트...');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    if (response.data.message) {
      success(`헬스체크 통과: ${response.data.message}`);
      return true;
    }
    return false;
  } catch (err) {
    error(`헬스체크 실패: ${err.message}`);
    return false;
  }
}

async function testGetWorkSchedules() {
  log('근무일정 조회 테스트 (GET /work-schedule)...');
  try {
    const response = await axios.get(`${API_BASE_URL}/work-schedule`);
    const items = response.data.items || [];
    success(`${items.length}개의 근무일정 조회 성공`);
    if (items.length > 0) {
      info(`예시: ${JSON.stringify(items[0], null, 2)}`);
    }
    return items;
  } catch (err) {
    error(`근무일정 조회 실패: ${err.message}`);
    return [];
  }
}

async function testGetWorkSchedulesByMonth() {
  log('월별 근무일정 조회 테스트...');
  try {
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const response = await axios.get(`${API_BASE_URL}/work-schedule?month=${month}`);
    const items = response.data.items || [];
    success(`${month}월에 ${items.length}개의 근무일정 조회 성공`);
    return items;
  } catch (err) {
    error(`월별 조회 실패: ${err.message}`);
    return [];
  }
}

async function testCreateWorkSchedule(userId, storeId) {
  log('근무일정 생성 테스트 (POST /work-schedule)...');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const workDate = tomorrow.toISOString().split('T')[0];

  const payload = {
    userId,
    storeId,
    workDate,
    startTime: '09:00',
    endTime: '18:00',
    notes: 'API 테스트로 생성된 근무일정',
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/work-schedule`, payload);
    success(`근무일정 생성 성공: ${response.data.schedule._id}`);
    info(`생성된 데이터: ${JSON.stringify(response.data.schedule, null, 2)}`);
    return response.data.schedule;
  } catch (err) {
    error(`근무일정 생성 실패: ${err.response?.data?.message || err.message}`);
    return null;
  }
}

async function testUpdateWorkSchedule(scheduleId) {
  if (!scheduleId) {
    info('업데이트할 스케줄이 없어 건너뜀');
    return null;
  }

  log('근무일정 수정 테스트 (PUT /work-schedule/:id)...');
  
  const payload = {
    startTime: '10:00',
    endTime: '19:00',
    notes: '수정된 메모',
  };

  try {
    const response = await axios.put(`${API_BASE_URL}/work-schedule/${scheduleId}`, payload);
    success(`근무일정 수정 성공: ${scheduleId}`);
    info(`수정된 시간: ${payload.startTime} ~ ${payload.endTime}`);
    return response.data.schedule;
  } catch (err) {
    error(`근무일정 수정 실패: ${err.response?.data?.message || err.message}`);
    return null;
  }
}

async function testDeleteWorkSchedule(scheduleId) {
  if (!scheduleId) {
    info('삭제할 스케줄이 없어 건너뜀');
    return false;
  }

  log('근무일정 삭제 테스트 (DELETE /work-schedule/:id)...');
  
  try {
    await axios.delete(`${API_BASE_URL}/work-schedule/${scheduleId}`);
    success(`근무일정 삭제 성공: ${scheduleId}`);
    return true;
  } catch (err) {
    error(`근무일정 삭제 실패: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function getTestUserAndStore() {
  log('테스트용 사용자/점포 ID 조회 중...');
  try {
    // 먼저 근무일정 조회해서 userId, storeId 가져오기
    const response = await axios.get(`${API_BASE_URL}/work-schedule`);
    const items = response.data.items || [];
    
    if (items.length > 0) {
      const firstItem = items[0];
      return {
        userId: firstItem.userId,
        storeId: firstItem.storeId,
      };
    }
    
    info('기존 근무일정이 없습니다. 시딩 스크립트를 먼저 실행하세요.');
    return { userId: null, storeId: null };
  } catch (err) {
    error(`ID 조회 실패: ${err.message}`);
    return { userId: null, storeId: null };
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('Phase 0: WorkSchedule API 테스트');
  console.log('='.repeat(60) + '\n');

  info(`API URL: ${API_BASE_URL}\n`);

  try {
    // 1. 헬스체크
    const healthOk = await testHealthCheck();
    if (!healthOk) {
      error('서버가 실행 중이지 않습니다. 먼저 서버를 시작하세요.');
      process.exit(1);
    }

    console.log('');

    // 2. 근무일정 조회 (전체)
    const allSchedules = await testGetWorkSchedules();
    console.log('');

    // 3. 월별 조회
    await testGetWorkSchedulesByMonth();
    console.log('');

    // 4. 테스트용 사용자/점포 ID 가져오기
    const { userId, storeId } = await getTestUserAndStore();
    console.log('');

    if (!userId || !storeId) {
      warn('테스트용 사용자/점포 ID를 찾을 수 없습니다.');
      warn('시딩 스크립트를 먼저 실행하세요: node scripts/seed.js');
      process.exit(0);
    }

    // 5. 근무일정 생성
    const newSchedule = await testCreateWorkSchedule(userId, storeId);
    console.log('');

    // 6. 근무일정 수정
    if (newSchedule) {
      await testUpdateWorkSchedule(newSchedule._id);
      console.log('');

      // 7. 근무일정 삭제
      await testDeleteWorkSchedule(newSchedule._id);
    }

    console.log('\n' + '='.repeat(60));
    success('모든 테스트 완료!');
    console.log('='.repeat(60) + '\n');
  } catch (err) {
    error(`테스트 실행 중 오류: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  main();
}

module.exports = { main };

