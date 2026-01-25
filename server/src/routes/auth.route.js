const { Router } = require('express');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');

const router = Router();

/**
 * POST /api/auth/register
 * 회원가입
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, storeId } = req.body;

    // 필수 항목 검증
    if (!name || !email || !password) {
      return res.status(400).json({
        message: '이름, 이메일, 비밀번호는 필수 항목입니다.',
      });
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return res.status(400).json({
        message: '비밀번호는 최소 6자 이상이어야 합니다.',
      });
    }

    // 이메일 형식 검증 (간단한 검증)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: '올바른 이메일 형식이 아닙니다.',
      });
    }

    // 이미 존재하는 이메일인지 확인
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: '이미 사용 중인 이메일입니다.',
      });
    }

    // 사용자 생성
    const user = await User.create({
      name,
      email,
      password, // pre-save hook에서 자동 해싱
      phone: phone || '',
      role: role || 'employee',
      storeId: storeId || null,
    });

    // 비밀번호 제외한 사용자 정보
    const userObject = user.toJSON();

    // JWT 토큰 생성
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      user: userObject,
      token,
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    return res.status(500).json({
      message: '회원가입 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/login
 * 로그인
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 필수 항목 검증
    if (!email || !password) {
      return res.status(400).json({
        message: '이메일과 비밀번호를 입력해주세요.',
      });
    }

    // 사용자 조회 (비밀번호 포함)
    // select: false로 설정된 password를 조회하기 위해 select('+password') 사용
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    // 비밀번호 확인
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    // 비밀번호 제외한 사용자 정보
    const userObject = user.toJSON();

    // JWT 토큰 생성
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return res.json({
      message: '로그인 성공',
      user: userObject,
      token,
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    return res.status(500).json({
      message: '로그인 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * GET /api/auth/me
 * 현재 로그인한 사용자 정보 조회 (인증 필요)
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    // req.user는 authenticate 미들웨어에서 설정됨
    return res.json({
      user: req.user,
    });
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    return res.status(500).json({
      message: '사용자 정보 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

module.exports = router;

