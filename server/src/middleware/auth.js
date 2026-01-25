const User = require('../models/User');
const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');

/**
 * JWT 인증 미들웨어
 * 요청에 유효한 JWT 토큰이 있는지 확인하고, 사용자 정보를 req.user에 추가
 */
async function authenticate(req, res, next) {
  try {
    // 토큰 추출
    const token = extractTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        message: '인증 토큰이 제공되지 않았습니다.',
      });
    }

    // 토큰 검증
    const decoded = verifyToken(token);

    // 사용자 조회 (비밀번호 제외)
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        message: '인증 토큰에 해당하는 사용자를 찾을 수 없습니다.',
      });
    }

    // req.user에 사용자 정보 추가
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: error.message || '인증에 실패했습니다.',
    });
  }
}

/**
 * 역할(role) 기반 권한 확인 미들웨어
 * @param {String[]} allowedRoles - 허용된 역할 배열 (예: ['owner', 'employee'])
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    // authenticate 미들웨어를 먼저 실행해야 함
    if (!req.user) {
      return res.status(401).json({
        message: '인증이 필요합니다.',
      });
    }

    // 역할 확인
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: '접근 권한이 없습니다.',
      });
    }

    next();
  };
}

/**
 * 점주만 접근 가능한 미들웨어
 */
const requireOwner = authorize('owner');

/**
 * 근로자만 접근 가능한 미들웨어
 */
const requireEmployee = authorize('employee');

/**
 * 점주 또는 근로자 모두 접근 가능한 미들웨어
 */
const requireUser = authorize('owner', 'employee');

module.exports = {
  authenticate,
  authorize,
  requireOwner,
  requireEmployee,
  requireUser,
};

