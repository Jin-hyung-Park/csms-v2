// 애플리케이션 상수 정의

// API 관련
export const API_ENDPOINTS = {
  AUTH: '/auth',
  WORK_SCHEDULE: '/work-schedule',
  EMPLOYEE: '/employee',
  OWNER: '/owner',
  OWNER_SCHEDULES: '/owner/schedules',
  STORE: '/store',
  EXPENSE: '/expense',
  NOTIFICATION: '/notification'
};

// 사용자 역할
export const USER_ROLES = {
  OWNER: 'owner',
  EMPLOYEE: 'employee',
  MANAGER: 'manager'
};

// 근무 상태
export const WORK_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  MODIFIED: 'modified',
  OWNER_MODIFIED: 'owner_modified'
};

// 근무 상태 라벨
export const WORK_STATUS_LABELS = {
  [WORK_STATUS.PENDING]: '승인 대기',
  [WORK_STATUS.APPROVED]: '승인됨',
  [WORK_STATUS.REJECTED]: '거절됨',
  [WORK_STATUS.MODIFIED]: '수정됨',
  [WORK_STATUS.OWNER_MODIFIED]: '점주 수정 대기'
};

// 근무 상태 색상
export const WORK_STATUS_COLORS = {
  [WORK_STATUS.PENDING]: 'warning',
  [WORK_STATUS.APPROVED]: 'success',
  [WORK_STATUS.REJECTED]: 'error',
  [WORK_STATUS.MODIFIED]: 'info',
  [WORK_STATUS.OWNER_MODIFIED]: 'secondary'
};

// 요일
export const DAYS_OF_WEEK = {
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
  FRIDAY: 'friday',
  SATURDAY: 'saturday',
  SUNDAY: 'sunday'
};

// 요일 라벨
export const DAYS_OF_WEEK_LABELS = {
  [DAYS_OF_WEEK.MONDAY]: '월요일',
  [DAYS_OF_WEEK.TUESDAY]: '화요일',
  [DAYS_OF_WEEK.WEDNESDAY]: '수요일',
  [DAYS_OF_WEEK.THURSDAY]: '목요일',
  [DAYS_OF_WEEK.FRIDAY]: '금요일',
  [DAYS_OF_WEEK.SATURDAY]: '토요일',
  [DAYS_OF_WEEK.SUNDAY]: '일요일'
};

// 세금 유형
export const TAX_TYPES = {
  NORMAL: 'normal',
  SIMPLIFIED: 'simplified'
};

// 세금 유형 라벨
export const TAX_TYPE_LABELS = {
  [TAX_TYPES.NORMAL]: '일반과세',
  [TAX_TYPES.SIMPLIFIED]: '간이과세'
};

// 결제 방법
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  TRANSFER: 'transfer'
};

// 결제 방법 라벨
export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CASH]: '현금',
  [PAYMENT_METHODS.CARD]: '카드',
  [PAYMENT_METHODS.TRANSFER]: '계좌이체'
};

// 페이지네이션
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50]
};

// 시간 형식
export const TIME_FORMATS = {
  DISPLAY: 'HH:mm',
  API: 'HH:mm:ss',
  FULL: 'YYYY-MM-DD HH:mm:ss'
};

// 날짜 형식
export const DATE_FORMATS = {
  DISPLAY: 'YYYY-MM-DD',
  API: 'YYYY-MM-DD',
  FULL: 'YYYY-MM-DD HH:mm:ss'
};

// 기본값
export const DEFAULTS = {
  HOURLY_WAGE: 9860,
  WORK_START_TIME: '09:00',
  WORK_END_TIME: '18:00'
};

// 에러 메시지
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '네트워크 오류가 발생했습니다.',
  UNAUTHORIZED: '인증이 필요합니다.',
  FORBIDDEN: '접근 권한이 없습니다.',
  NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',
  SERVER_ERROR: '서버 오류가 발생했습니다.',
  VALIDATION_ERROR: '입력 데이터가 올바르지 않습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.'
};

// 성공 메시지
export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: '저장되었습니다.',
  DELETE_SUCCESS: '삭제되었습니다.',
  UPDATE_SUCCESS: '수정되었습니다.',
  CREATE_SUCCESS: '생성되었습니다.',
  APPROVE_SUCCESS: '승인되었습니다.',
  REJECT_SUCCESS: '거절되었습니다.'
};

// 알림 타입
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

// 테마
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark'
};

// 언어
export const LANGUAGES = {
  KOREAN: 'ko',
  ENGLISH: 'en'
};

// 로컬 스토리지 키
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language'
};

// 라우트 경로
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  WORK_SCHEDULE: '/work-schedule',
  PROFILE: '/profile',
  NOTIFICATIONS: '/notifications',
  STATISTICS: '/statistics',
  EMPLOYEE_MANAGEMENT: '/employee-management',
  STORE_MANAGEMENT: '/store-management',
  EXPENSE_MANAGEMENT: '/expense-management',
  APPROVE_REQUESTS: '/approve-requests'
};

// 권한
export const PERMISSIONS = {
  VIEW_SCHEDULES: 'view_schedules',
  CREATE_SCHEDULES: 'create_schedules',
  EDIT_SCHEDULES: 'edit_schedules',
  DELETE_SCHEDULES: 'delete_schedules',
  APPROVE_SCHEDULES: 'approve_schedules',
  VIEW_STATISTICS: 'view_statistics',
  MANAGE_EMPLOYEES: 'manage_employees',
  MANAGE_STORES: 'manage_stores',
  MANAGE_EXPENSES: 'manage_expenses'
};

// 필터 기본값
export const FILTER_DEFAULTS = {
  ALL: 'all',
  PENDING: WORK_STATUS.PENDING
};

// 근무 장소
export const WORK_LOCATIONS = {
  DAEJI: '대치메가점',
  SAMSUNG: '삼성점'
}; 