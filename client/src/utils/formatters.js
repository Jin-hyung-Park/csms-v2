import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

// 날짜 포맷팅
export const formatDate = (date, formatStr = 'yyyy-MM-dd') => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr, { locale: ko });
  } catch (error) {
    return '';
  }
};

// 시간 포맷팅
export const formatTime = (time, formatStr = 'HH:mm') => {
  if (!time) return '';
  
  try {
    if (typeof time === 'string') {
      return time.substring(0, 5); // HH:mm 형식으로 변환
    }
    return format(time, formatStr);
  } catch (error) {
    return '';
  }
};

// 날짜와 시간 포맷팅
export const formatDateTime = (dateTime, formatStr = 'yyyy-MM-dd HH:mm') => {
  if (!dateTime) return '';
  
  try {
    const dateObj = typeof dateTime === 'string' ? parseISO(dateTime) : dateTime;
    return format(dateObj, formatStr, { locale: ko });
  } catch (error) {
    return '';
  }
};

// 통화 포맷팅
export const formatCurrency = (amount, currency = 'KRW') => {
  if (amount === null || amount === undefined) return '0원';
  
  try {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency
    }).format(numAmount);
  } catch (error) {
    return '0원';
  }
};

// 숫자 포맷팅
export const formatNumber = (number, options = {}) => {
  if (number === null || number === undefined) return '0';
  
  try {
    const numValue = typeof number === 'string' ? parseFloat(number) : number;
    return new Intl.NumberFormat('ko-KR', options).format(numValue);
  } catch (error) {
    return '0';
  }
};

// 시간 포맷팅 (시간 단위)
export const formatHours = (hours, decimalPlaces = 1) => {
  if (hours === null || hours === undefined) return '0h';
  
  try {
    const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
    return `${numHours.toFixed(decimalPlaces)}h`;
  } catch (error) {
    return '0h';
  }
};

// 사용자명 포맷팅
export const formatUsername = (username) => {
  if (!username) return '';
  
  // 한글 이름인 경우 그대로 반환
  if (/[가-힣]/.test(username)) {
    return username;
  }
  
  // 영문 이름인 경우 첫 글자만 대문자로
  return username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
};

// 메모 포맷팅
export const formatNotes = (notes, maxLength = 50) => {
  if (!notes) return '';
  
  const trimmedNotes = notes.trim();
  if (trimmedNotes.length <= maxLength) {
    return trimmedNotes;
  }
  
  return trimmedNotes.substring(0, maxLength) + '...';
};

// 전화번호 포맷팅
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }
  
  return phoneNumber;
};

// 이메일 마스킹
export const maskEmail = (email) => {
  if (!email) return '';
  
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  
  if (localPart.length <= 2) {
    return email;
  }
  
  const maskedLocal = localPart.charAt(0) + '*'.repeat(localPart.length - 2) + localPart.charAt(localPart.length - 1);
  return `${maskedLocal}@${domain}`;
};

// 파일 크기 포맷팅
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 상대 시간 포맷팅
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  try {
    const now = new Date();
    const targetDate = typeof date === 'string' ? parseISO(date) : date;
    const diffInSeconds = Math.floor((now - targetDate) / 1000);
    
    if (diffInSeconds < 60) {
      return '방금 전';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}분 전`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}시간 전`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}일 전`;
    } else {
      return formatDate(targetDate, 'yyyy-MM-dd');
    }
  } catch (error) {
    return '';
  }
};

// 상태 텍스트 포맷팅
export const formatStatus = (status, statusLabels) => {
  return statusLabels[status] || status || '알 수 없음';
};

// 배열을 문자열로 변환
export const arrayToString = (array, separator = ', ') => {
  if (!Array.isArray(array)) return '';
  return array.filter(item => item).join(separator);
};

// 문자열을 배열로 변환
export const stringToArray = (str, separator = ',') => {
  if (!str) return [];
  return str.split(separator).map(item => item.trim()).filter(item => item);
};

// 카멜케이스를 스네이크케이스로 변환
export const camelToSnakeCase = (str) => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

// 스네이크케이스를 카멜케이스로 변환
export const snakeToCamelCase = (str) => {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

// 첫 글자를 대문자로 변환
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// 문자열을 제목 형식으로 변환
export const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}; 