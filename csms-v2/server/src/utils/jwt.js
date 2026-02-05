const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

/**
 * JWT 토큰 생성
 * @param {Object} payload - 토큰에 포함할 데이터 (userId, email, role 등)
 * @returns {String} JWT 토큰
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  });
}

/**
 * JWT 토큰 검증
 * @param {String} token - 검증할 JWT 토큰
 * @returns {Object} 디코딩된 토큰 데이터
 * @throws {Error} 토큰이 유효하지 않으면 에러 발생
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('유효하지 않은 토큰입니다.');
  }
}

/**
 * 요청 헤더에서 토큰 추출
 * @param {Object} req - Express 요청 객체
 * @returns {String|null} 토큰 또는 null
 */
function extractTokenFromHeader(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Bearer 토큰 형식: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
};

