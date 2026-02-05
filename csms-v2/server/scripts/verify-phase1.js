#!/usr/bin/env node

/**
 * Phase 1 검증 스크립트
 * 
 * 실제로 API가 동작하는지 확인합니다.
 * 서버가 실행 중이어야 합니다.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5001/api';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

let testResults = {
  passed: 0,
  failed: 0,
  errors: [],
};

function log(message) {
  console.log(`${colors.green}[검증]${colors.reset} ${message}`);
}

function error(message) {
  console.error(`${colors.red}[실패]${colors.reset} ${message}`);
  testResults.failed++;
  testResults.errors.push(message);
}

function success(message) {
  console.log(`${colors.blue}[성공]${colors.reset} ${message}`);
  testResults.passed++;
}

function info(message) {
  console.log(`${colors.yellow}[정보]${colors.reset} ${message}`);
}

async function verifyServerHealth() {
  log('1. 서버 헬스체크...');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    if (response.data.message) {
      success('서버가 정상적으로 실행 중입니다.');
      return true;
    }
    error('헬스체크 응답 형식이 올바르지 않습니다.');
    return false;
  } catch (err) {
    error(`서버 연결 실패: ${err.message}`);
    info('서버가 실행 중인지 확인하세요: npm run dev');
    return false;
  }
}

async function verifyRegister() {
  log('2. 회원가입 API 검증...');
  
  const testEmail = `verify-${Date.now()}@test.com`;
  const payload = {
    name: '검증 테스트 사용자',
    email: testEmail,
    password: 'password123',
    role: 'employee',
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, payload);
    
    if (response.status === 201 && response.data.token) {
      success(`회원가입 성공: ${testEmail}`);
      return { user: response.data.user, token: response.data.token, email: testEmail };
    }
    error('회원가입 응답 형식이 올바르지 않습니다.');
    return null;
  } catch (err) {
    if (err.response?.status === 409) {
      error('이미 존재하는 이메일입니다.');
    } else {
      error(`회원가입 실패: ${err.response?.data?.message || err.message}`);
    }
    return null;
  }
}

async function verifyLogin() {
  log('3. 로그인 API 검증...');
  
  // 시딩으로 생성된 계정 사용
  const payload = {
    email: 'employee1@test.com',
    password: 'password123',
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, payload);
    
    if (response.status === 200 && response.data.token) {
      success('로그인 성공');
      return response.data.token;
    }
    error('로그인 응답 형식이 올바르지 않습니다.');
    return null;
  } catch (err) {
    error(`로그인 실패: ${err.response?.data?.message || err.message}`);
    info('시딩 스크립트를 먼저 실행하세요: npm run seed');
    return null;
  }
}

async function verifyAuthMe(token) {
  log('4. 사용자 정보 조회 API 검증...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (response.status === 200 && response.data.user) {
      success(`사용자 정보 조회 성공: ${response.data.user.email}`);
      return true;
    }
    error('사용자 정보 조회 응답 형식이 올바르지 않습니다.');
    return false;
  } catch (err) {
    if (err.response?.status === 401) {
      error('인증 실패: 토큰이 유효하지 않습니다.');
    } else {
      error(`사용자 정보 조회 실패: ${err.response?.data?.message || err.message}`);
    }
    return false;
  }
}

async function verifyProtectedAPI(token) {
  log('5. 보호된 API 검증 (WorkSchedule)...');
  
  // 토큰 없이 접근 시도
  try {
    await axios.get(`${API_BASE_URL}/work-schedule`);
    error('토큰 없이 API 접근 시 401이 발생해야 합니다.');
    return false;
  } catch (err) {
    if (err.response?.status === 401) {
      success('토큰 없이 접근 시 401 에러 반환 확인');
    } else {
      error(`예상과 다른 응답: ${err.response?.status}`);
      return false;
    }
  }
  
  // 토큰과 함께 접근
  try {
    const response = await axios.get(`${API_BASE_URL}/work-schedule`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (response.status === 200 && Array.isArray(response.data.items)) {
      success(`보호된 API 접근 성공: ${response.data.items.length}개의 근무일정 조회`);
      return true;
    }
    error('보호된 API 응답 형식이 올바르지 않습니다.');
    return false;
  } catch (err) {
    if (err.response?.status === 401) {
      error('토큰이 있음에도 401 에러 발생');
    } else {
      error(`보호된 API 접근 실패: ${err.response?.data?.message || err.message}`);
    }
    return false;
  }
}

async function verifyInvalidToken() {
  log('6. 유효하지 않은 토큰 검증...');
  
  try {
    await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer invalid-token-12345' },
    });
    error('유효하지 않은 토큰 시 401이 발생해야 합니다.');
    return false;
  } catch (err) {
    if (err.response?.status === 401) {
      success('유효하지 않은 토큰 시 401 에러 반환 확인');
      return true;
    }
    error(`예상과 다른 응답: ${err.response?.status}`);
    return false;
  }
}

async function verifyWorkScheduleCRUD(token) {
  log('7. WorkSchedule CRUD 검증...');
  
  let createdScheduleId;
  
  try {
    // 생성
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const workDate = tomorrow.toISOString().split('T')[0];
    
    const createResponse = await axios.post(
      `${API_BASE_URL}/work-schedule`,
      {
        workDate,
        startTime: '09:00',
        endTime: '18:00',
        notes: '검증 테스트 근무일정',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    if (createResponse.status === 201 && createResponse.data.schedule?._id) {
      createdScheduleId = createResponse.data.schedule._id;
      success('근무일정 생성 성공');
    } else {
      error('근무일정 생성 실패');
      return false;
    }
    
    // 조회
    const getResponse = await axios.get(`${API_BASE_URL}/work-schedule`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (getResponse.status === 200) {
      const found = getResponse.data.items.find(
        (item) => item._id === createdScheduleId
      );
      if (found) {
        success('생성한 근무일정 조회 성공');
      }
    }
    
    // 수정
    if (createdScheduleId) {
      const updateResponse = await axios.put(
        `${API_BASE_URL}/work-schedule/${createdScheduleId}`,
        {
          startTime: '10:00',
          endTime: '19:00',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (updateResponse.status === 200) {
        success('근무일정 수정 성공');
      }
    }
    
    // 삭제
    if (createdScheduleId) {
      const deleteResponse = await axios.delete(
        `${API_BASE_URL}/work-schedule/${createdScheduleId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (deleteResponse.status === 200) {
        success('근무일정 삭제 성공');
      }
    }
    
    return true;
  } catch (err) {
    error(`CRUD 검증 실패: ${err.response?.data?.message || err.message}`);
    
    // 정리
    if (createdScheduleId) {
      try {
        await axios.delete(`${API_BASE_URL}/work-schedule/${createdScheduleId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        // 무시
      }
    }
    
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('Phase 1 인증 시스템 검증');
  console.log('='.repeat(60) + '\n');

  info(`API URL: ${API_BASE_URL}\n`);

  // 1. 서버 헬스체크
  const serverOk = await verifyServerHealth();
  if (!serverOk) {
    console.log('\n' + '='.repeat(60));
    error('서버가 실행되지 않았습니다. 먼저 서버를 실행하세요.');
    console.log('='.repeat(60) + '\n');
    process.exit(1);
  }

  console.log('');

  // 2. 회원가입
  const registerResult = await verifyRegister();
  console.log('');

  // 3. 로그인
  const loginToken = await verifyLogin();
  if (!loginToken) {
    console.log('\n' + '='.repeat(60));
    error('로그인 실패로 인해 나머지 검증을 진행할 수 없습니다.');
    console.log('='.repeat(60) + '\n');
    process.exit(1);
  }

  console.log('');

  // 4. 사용자 정보 조회
  await verifyAuthMe(loginToken);
  console.log('');

  // 5. 보호된 API
  await verifyProtectedAPI(loginToken);
  console.log('');

  // 6. 유효하지 않은 토큰
  await verifyInvalidToken();
  console.log('');

  // 7. WorkSchedule CRUD
  await verifyWorkScheduleCRUD(loginToken);
  console.log('');

  // 결과 요약
  console.log('='.repeat(60));
  console.log('검증 결과 요약');
  console.log('='.repeat(60));
  success(`성공: ${testResults.passed}개`);
  if (testResults.failed > 0) {
    error(`실패: ${testResults.failed}개`);
    console.log('\n실패한 항목:');
    testResults.errors.forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err}`);
    });
  } else {
    console.log('');
    console.log('✅ 모든 검증이 완료되었습니다!');
  }
  console.log('='.repeat(60) + '\n');

  process.exit(testResults.failed > 0 ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { main };

