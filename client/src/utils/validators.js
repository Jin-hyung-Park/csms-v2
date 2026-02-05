// 검증 유틸리티 함수들

// 이메일 검증
export const isValidEmail = (email) => {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 비밀번호 검증
export const isValidPassword = (password) => {
  if (!password) return false;
  
  // 최소 8자, 영문/숫자/특수문자 조합
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// 전화번호 검증
export const isValidPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return false;
  
  const cleaned = phoneNumber.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 11;
};

// 시간 형식 검증 (HH:mm)
export const isValidTime = (time) => {
  if (!time) return false;
  
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

// 날짜 형식 검증 (YYYY-MM-DD)
export const isValidDate = (date) => {
  if (!date) return false;
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj);
};

// 숫자 검증
export const isValidNumber = (value) => {
  if (value === null || value === undefined) return false;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && isFinite(num);
};

// 양수 검증
export const isValidPositiveNumber = (value) => {
  if (!isValidNumber(value)) return false;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num > 0;
};

// 정수 검증
export const isValidInteger = (value) => {
  if (!isValidNumber(value)) return false;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isInteger(num);
};

// 문자열 길이 검증
export const isValidLength = (str, minLength = 0, maxLength = Infinity) => {
  if (typeof str !== 'string') return false;
  
  const length = str.trim().length;
  return length >= minLength && length <= maxLength;
};

// 필수 필드 검증
export const isRequired = (value) => {
  if (value === null || value === undefined) return false;
  
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  
  return true;
};

// URL 검증
export const isValidUrl = (url) => {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// 파일 크기 검증
export const isValidFileSize = (file, maxSizeInMB = 10) => {
  if (!file) return false;
  
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

// 파일 타입 검증
export const isValidFileType = (file, allowedTypes = []) => {
  if (!file || !allowedTypes.length) return false;
  
  return allowedTypes.includes(file.type);
};

// 시간 범위 검증 (시작 시간이 종료 시간보다 이전인지)
export const isValidTimeRange = (startTime, endTime) => {
  if (!isValidTime(startTime) || !isValidTime(endTime)) return false;
  
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  
  return start < end;
};

// 날짜 범위 검증 (시작 날짜가 종료 날짜보다 이전인지)
export const isValidDateRange = (startDate, endDate) => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return start <= end;
};

// 한글 검증
export const isValidKorean = (text) => {
  if (!text) return false;
  
  const koreanRegex = /^[가-힣\s]+$/;
  return koreanRegex.test(text);
};

// 영문 검증
export const isValidEnglish = (text) => {
  if (!text) return false;
  
  const englishRegex = /^[A-Za-z\s]+$/;
  return englishRegex.test(text);
};

// 숫자와 영문 조합 검증
export const isValidAlphanumeric = (text) => {
  if (!text) return false;
  
  const alphanumericRegex = /^[A-Za-z0-9]+$/;
  return alphanumericRegex.test(text);
};

// 특수문자 포함 여부 검증
export const containsSpecialCharacters = (text) => {
  if (!text) return false;
  
  const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
  return specialCharRegex.test(text);
};

// 공백만 있는지 검증
export const isOnlyWhitespace = (text) => {
  if (!text) return true;
  
  return text.trim().length === 0;
};

// 배열 검증
export const isValidArray = (value) => {
  return Array.isArray(value);
};

// 객체 검증
export const isValidObject = (value) => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

// 함수 검증
export const isValidFunction = (value) => {
  return typeof value === 'function';
};

// UUID 검증
export const isValidUUID = (uuid) => {
  if (!uuid) return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// MongoDB ObjectId 검증
export const isValidObjectId = (id) => {
  if (!id) return false;
  
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

// 복합 검증 함수
export const validateField = (value, validations = []) => {
  for (const validation of validations) {
    const { validator, message } = validation;
    
    if (!validator(value)) {
      return { isValid: false, message };
    }
  }
  
  return { isValid: true, message: '' };
};

// 폼 전체 검증
export const validateForm = (formData, validationRules) => {
  const errors = {};
  
  for (const [fieldName, validations] of Object.entries(validationRules)) {
    const value = formData[fieldName];
    const result = validateField(value, validations);
    
    if (!result.isValid) {
      errors[fieldName] = result.message;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}; 