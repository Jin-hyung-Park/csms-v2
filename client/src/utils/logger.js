// 클라이언트용 로거 유틸리티
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  info: (message, data = null) => {
    if (isDevelopment) {
      if (data) {
        console.log(`[INFO] ${message}`, data);
      } else {
        console.log(`[INFO] ${message}`);
      }
    }
  },
  
  warn: (message, data = null) => {
    if (isDevelopment) {
      if (data) {
        console.warn(`[WARN] ${message}`, data);
      } else {
        console.warn(`[WARN] ${message}`);
      }
    }
  },
  
  error: (message, error = null) => {
    if (isDevelopment) {
      if (error) {
        console.error(`[ERROR] ${message}`, error);
      } else {
        console.error(`[ERROR] ${message}`);
      }
    }
  },
  
  debug: (message, data = null) => {
    if (isDevelopment) {
      if (data) {
        console.log(`[DEBUG] ${message}`, data);
      } else {
        console.log(`[DEBUG] ${message}`);
      }
    }
  }
};

export default logger; 