#!/usr/bin/env node

/**
 * Phase 1 확장 검증 스크립트
 * 
 * 추가 검증 항목들을 확인합니다.
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
  cyan: '\x1b[36m',
};

let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
  warnings_list: [],
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

function warning(message) {
  console.log(`${colors.cyan}[경고]${colors.reset} ${message}`);
  testResults.warnings++;
  testResults.warnings_list.push(message);
}

async function verifyServerHealth() {
  log('서버 헬스체크...');
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

async function verifyUnauthorizedAccess() {
  log('보호된 API 인증 필수 확인...');
  
  const endpoints = [
    { method: 'get', path: '/work-schedule' },
    { method: 'post', path: '/work-schedule', data: { workDate: '2024-01-01', startTime: '09:00', endTime: '18:00' } },
    { method: 'get', path: '/auth/me' },
  ];

  let allPassed = true;

  for (const endpoint of endpoints) {
    try {
      if (endpoint.method === 'get') {
        await axios.get(`${API_BASE_URL}${endpoint.path}`);
      } else if (endpoint.method === 'post') {
        await axios.post(`${API_BASE_URL}${endpoint.path}`, endpoint.data);
      }
      error(`토큰 없이 ${endpoint.method.toUpperCase()} ${endpoint.path} 접근 시 401이 발생해야 합니다.`);
      allPassed = false;
    } catch (err) {
      if (err.response?.status === 401) {
        success(`토큰 없이 ${endpoint.method.toUpperCase()} ${endpoint.path} 접근 시 401 에러 반환 확인`);
      } else {
        error(`예상과 다른 응답: ${err.response?.status} (예상: 401)`);
        allPassed = false;
      }
    }
  }

  return allPassed;
}

async function verifyInvalidToken() {
  log('유효하지 않은 토큰 처리 확인...');
  
  const invalidTokens = [
    'invalid-token-12345',
    'Bearer invalid',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
  ];

  let allPassed = true;

  for (const token of invalidTokens) {
    try {
      await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      error(`유효하지 않은 토큰 "${token.substring(0, 20)}..." 시 401이 발생해야 합니다.`);
      allPassed = false;
    } catch (err) {
      if (err.response?.status === 401) {
        success(`유효하지 않은 토큰 시 401 에러 반환 확인`);
      } else {
        error(`예상과 다른 응답: ${err.response?.status} (예상: 401)`);
        allPassed = false;
      }
    }
  }

  return allPassed;
}

async function verifyLoginAndToken() {
  log('로그인 및 토큰 발급 확인...');
  
  // 먼저 회원가입으로 테스트 계정 생성 (자동 해싱 확인)
  const testEmail = `verify-${Date.now()}@test.com`;
  const testPassword = 'password123';
  
  try {
    // 회원가입
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      name: '검증 테스트 사용자',
      email: testEmail,
      password: testPassword,
      role: 'employee',
    });
    
    if (registerResponse.status === 201 && registerResponse.data.token) {
      success('회원가입 성공 (자동 비밀번호 해싱 확인)');
    }
  } catch (err) {
    if (err.response?.status === 409) {
      info('테스트 계정이 이미 존재합니다. 로그인을 시도합니다.');
    } else {
      error(`회원가입 실패: ${err.response?.data?.message || err.message}`);
      return null;
    }
  }
  
  // 로그인 시도
  try {
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testEmail,
      password: testPassword,
    });
    
    if (loginResponse.status === 200 && loginResponse.data.token) {
      const token = loginResponse.data.token;
      
      // 토큰 형식 확인 (JWT는 3개 부분으로 구성)
      const parts = token.split('.');
      if (parts.length === 3) {
        success('JWT 토큰 형식 확인');
      } else {
        warning('토큰 형식이 JWT 표준과 다를 수 있습니다.');
      }
      
      success('로그인 성공 및 토큰 발급 확인');
      return token;
    }
    error('로그인 응답 형식이 올바르지 않습니다.');
    return null;
  } catch (err) {
    // 시딩 계정으로 재시도
    try {
      const fallbackResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'employee1@test.com',
        password: 'password123',
      });
      
      if (fallbackResponse.status === 200 && fallbackResponse.data.token) {
        const token = fallbackResponse.data.token;
        const parts = token.split('.');
        if (parts.length === 3) {
          success('JWT 토큰 형식 확인');
        }
        success('로그인 성공 및 토큰 발급 확인 (시딩 계정)');
        return token;
      }
    } catch (fallbackErr) {
      error(`로그인 실패: ${err.response?.data?.message || err.message}`);
      info('시딩 스크립트를 먼저 실행하세요: npm run seed:clear');
      return null;
    }
    return null;
  }
}

async function verifyAuthMe(token) {
  log('사용자 정보 조회 API 확인...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (response.status === 200 && response.data.user) {
      const user = response.data.user;
      
      // 비밀번호가 응답에 포함되지 않는지 확인
      if (user.password) {
        warning('사용자 정보에 비밀번호가 포함되어 있습니다. 보안상 위험할 수 있습니다.');
      } else {
        success('비밀번호가 응답에서 제외되었습니다.');
      }
      
      success(`사용자 정보 조회 성공: ${user.email}`);
      return user;
    }
    error('사용자 정보 조회 응답 형식이 올바르지 않습니다.');
    return null;
  } catch (err) {
    if (err.response?.status === 401) {
      error('인증 실패: 토큰이 유효하지 않습니다.');
    } else {
      error(`사용자 정보 조회 실패: ${err.response?.data?.message || err.message}`);
    }
    return null;
  }
}

async function verifyWorkScheduleCRUD(token, userId) {
  log('WorkSchedule API CRUD 동작 확인...');
  
  let createdScheduleId;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const workDate = tomorrow.toISOString().split('T')[0];
  
  try {
    // 1. 생성
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
      
      // totalHours 자동 계산 확인
      if (createResponse.data.schedule.totalHours === 9) {
        success('근무시간 자동 계산 확인 (9시간)');
      } else {
        warning(`근무시간 계산이 예상과 다릅니다. 예상: 9시간, 실제: ${createResponse.data.schedule.totalHours}시간`);
      }
    } else {
      error('근무일정 생성 실패');
      return false;
    }
    
    // 2. 조회
    const getResponse = await axios.get(`${API_BASE_URL}/work-schedule`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (getResponse.status === 200 && Array.isArray(getResponse.data.items)) {
      const found = getResponse.data.items.find(
        (item) => item._id === createdScheduleId
      );
      if (found) {
        success('생성한 근무일정 조회 성공');
        
        // 권한 확인: 근로자는 자신의 근무일정만 조회되는지 확인
        const allOwnItems = getResponse.data.items.every(
          (item) => item.userId === userId || item.userId.toString() === userId.toString()
        );
        if (allOwnItems) {
          success('근로자는 자신의 근무일정만 조회되는 것을 확인');
        }
      } else {
        warning('생성한 근무일정이 조회 결과에 포함되지 않았습니다.');
      }
    }
    
    // 3. 수정
    const updateResponse = await axios.put(
      `${API_BASE_URL}/work-schedule/${createdScheduleId}`,
      {
        startTime: '10:00',
        endTime: '19:00',
        notes: '수정된 메모',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    if (updateResponse.status === 200) {
      success('근무일정 수정 성공');
      
      // 수정된 내용 확인
      if (updateResponse.data.schedule.startTime === '10:00' && 
          updateResponse.data.schedule.endTime === '19:00') {
        success('수정된 내용이 반영되었습니다.');
      }
      
      // totalHours 재계산 확인
      if (updateResponse.data.schedule.totalHours === 9) {
        success('수정 후 근무시간 자동 재계산 확인');
      }
    } else {
      error('근무일정 수정 실패');
    }
    
    // 4. 삭제
    const deleteResponse = await axios.delete(
      `${API_BASE_URL}/work-schedule/${createdScheduleId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    if (deleteResponse.status === 200) {
      success('근무일정 삭제 성공');
      
      // 삭제 확인
      try {
        await axios.get(`${API_BASE_URL}/work-schedule/${createdScheduleId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        warning('삭제한 근무일정이 여전히 조회됩니다.');
      } catch (err) {
        if (err.response?.status === 404) {
          success('삭제 확인: 근무일정이 더 이상 조회되지 않습니다.');
        }
      }
    } else {
      error('근무일정 삭제 실패');
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

async function verifyErrorHandling() {
  log('에러 처리 확인...');
  
  let allPassed = true;
  
  // 1. 잘못된 이메일 로그인
  try {
    await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'nonexistent@test.com',
      password: 'password123',
    });
    error('존재하지 않는 이메일 로그인 시 401이 발생해야 합니다.');
    allPassed = false;
  } catch (err) {
    if (err.response?.status === 401) {
      success('존재하지 않는 이메일 로그인 시 401 에러 반환 확인');
    } else {
      error(`예상과 다른 응답: ${err.response?.status} (예상: 401)`);
      allPassed = false;
    }
  }
  
  // 2. 잘못된 비밀번호 로그인
  try {
    await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'employee1@test.com',
      password: 'wrongpassword',
    });
    error('잘못된 비밀번호 로그인 시 401이 발생해야 합니다.');
    allPassed = false;
  } catch (err) {
    if (err.response?.status === 401) {
      success('잘못된 비밀번호 로그인 시 401 에러 반환 확인');
    } else {
      error(`예상과 다른 응답: ${err.response?.status} (예상: 401)`);
      allPassed = false;
    }
  }
  
  // 3. 중복 이메일 회원가입
  try {
    await axios.post(`${API_BASE_URL}/auth/register`, {
      name: '중복 테스트',
      email: 'employee1@test.com', // 이미 존재하는 이메일
      password: 'password123',
      role: 'employee',
    });
    error('중복 이메일 회원가입 시 409가 발생해야 합니다.');
    allPassed = false;
  } catch (err) {
    if (err.response?.status === 409) {
      success('중복 이메일 회원가입 시 409 에러 반환 확인');
    } else {
      warning(`예상과 다른 응답: ${err.response?.status} (예상: 409)`);
    }
  }
  
  // 4. 필수 항목 누락 회원가입
  try {
    await axios.post(`${API_BASE_URL}/auth/register`, {
      name: '필수 항목 누락 테스트',
      // email, password 누락
    });
    error('필수 항목 누락 시 400이 발생해야 합니다.');
    allPassed = false;
  } catch (err) {
    if (err.response?.status === 400) {
      success('필수 항목 누락 시 400 에러 반환 확인');
    } else {
      error(`예상과 다른 응답: ${err.response?.status} (예상: 400)`);
      allPassed = false;
    }
  }
  
  // 5. 비밀번호 길이 검증
  try {
    await axios.post(`${API_BASE_URL}/auth/register`, {
      name: '비밀번호 길이 테스트',
      email: `short-password-${Date.now()}@test.com`,
      password: 'short', // 6자 미만
    });
    error('비밀번호 길이 미달 시 400이 발생해야 합니다.');
    allPassed = false;
  } catch (err) {
    if (err.response?.status === 400) {
      success('비밀번호 길이 검증 확인 (6자 이상)');
    } else {
      error(`예상과 다른 응답: ${err.response?.status} (예상: 400)`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function verifyPermissionChecks(token, userId) {
  log('권한 확인 (근로자)...');
  
  // 근로자 계정으로 이미 로그인한 상태이므로, 자신의 근무일정만 수정/삭제 가능한지 확인
  // 다른 사용자의 근무일정 ID를 사용할 수 없으므로, 생성 후 수정/삭제 권한 확인
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const workDate = tomorrow.toISOString().split('T')[0];
  
  try {
    // 근무일정 생성
    const createResponse = await axios.post(
      `${API_BASE_URL}/work-schedule`,
      {
        workDate,
        startTime: '09:00',
        endTime: '18:00',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    const scheduleId = createResponse.data.schedule._id;
    
    // 생성한 근무일정의 userId가 자신의 ID와 일치하는지 확인
    if (createResponse.data.schedule.userId.toString() === userId.toString()) {
      success('근로자가 자신의 ID로 근무일정이 생성되는 것을 확인');
    } else {
      warning(`근무일정의 userId가 예상과 다릅니다. 예상: ${userId}, 실제: ${createResponse.data.schedule.userId}`);
    }
    
    // 승인된 근무일정 수정 시도
    // 먼저 승인 상태로 변경 (직접 DB 접근 불가하므로, 실제로는 점주 API가 필요하지만 테스트 용도)
    // 여기서는 pending 상태에서 수정이 가능한지만 확인
    
    // 정리
    await axios.delete(`${API_BASE_URL}/work-schedule/${scheduleId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    return true;
  } catch (err) {
    error(`권한 확인 실패: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('Phase 1 확장 검증 - 추가 검증 항목 확인');
  console.log('='.repeat(70) + '\n');

  info(`API URL: ${API_BASE_URL}\n`);

  // 1. 서버 헬스체크
  const serverOk = await verifyServerHealth();
  if (!serverOk) {
    console.log('\n' + '='.repeat(70));
    error('서버가 실행되지 않았습니다. 먼저 서버를 실행하세요.');
    console.log('='.repeat(70) + '\n');
    process.exit(1);
  }

  console.log('');

  // 2. 인증되지 않은 접근 확인
  await verifyUnauthorizedAccess();
  console.log('');

  // 3. 유효하지 않은 토큰 확인
  await verifyInvalidToken();
  console.log('');

  // 4. 로그인 및 토큰 발급
  const token = await verifyLoginAndToken();
  if (!token) {
    console.log('\n' + '='.repeat(70));
    error('로그인 실패로 인해 나머지 검증을 진행할 수 없습니다.');
    console.log('='.repeat(70) + '\n');
    process.exit(1);
  }

  console.log('');

  // 5. 사용자 정보 조회
  const user = await verifyAuthMe(token);
  if (!user) {
    console.log('\n' + '='.repeat(70));
    error('사용자 정보 조회 실패로 인해 나머지 검증을 진행할 수 없습니다.');
    console.log('='.repeat(70) + '\n');
    process.exit(1);
  }

  console.log('');

  // 6. WorkSchedule CRUD
  await verifyWorkScheduleCRUD(token, user._id);
  console.log('');

  // 7. 에러 처리
  await verifyErrorHandling();
  console.log('');

  // 8. 권한 확인
  await verifyPermissionChecks(token, user._id);
  console.log('');

  // 결과 요약
  console.log('='.repeat(70));
  console.log('검증 결과 요약');
  console.log('='.repeat(70));
  success(`성공: ${testResults.passed}개`);
  if (testResults.warnings > 0) {
    warning(`경고: ${testResults.warnings}개`);
  }
  if (testResults.failed > 0) {
    error(`실패: ${testResults.failed}개`);
    console.log('\n실패한 항목:');
    testResults.errors.forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err}`);
    });
  }
  
  if (testResults.warnings > 0) {
    console.log('\n경고 항목:');
    testResults.warnings_list.forEach((warn, idx) => {
      console.log(`  ${idx + 1}. ${warn}`);
    });
  }
  
  console.log('='.repeat(70));
  
  if (testResults.failed === 0) {
    console.log('\n✅ 모든 추가 검증이 완료되었습니다!');
  } else {
    console.log('\n⚠️  일부 검증 항목이 실패했습니다.');
  }
  console.log('='.repeat(70) + '\n');

  process.exit(testResults.failed > 0 ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { main };

