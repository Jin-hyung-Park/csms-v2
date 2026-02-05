const { Router } = require('express');
const User = require('../models/User');
const Store = require('../models/Store');
const { generateToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');

const router = Router();

/**
 * GET /api/auth/validate-store-code?code=XXXXX
 * 매장코드(5자리) 검증 — 근로자 회원가입 전 호출 가능
 */
router.get('/validate-store-code', async (req, res) => {
  try {
    const code = (req.query.code || '').trim().toUpperCase();
    if (code.length !== 5) {
      return res.status(400).json({
        valid: false,
        message: '매장코드는 5자리입니다.',
      });
    }
    const store = await Store.findOne({ storeCode: code, isActive: true }).select('name storeCode').lean();
    if (!store) {
      return res.status(404).json({
        valid: false,
        message: '등록되지 않았거나 사용 중지된 매장코드입니다.',
      });
    }
    return res.json({
      valid: true,
      storeName: store.name,
      storeCode: store.storeCode,
    });
  } catch (error) {
    console.error('매장코드 검증 오류:', error);
    return res.status(500).json({ valid: false, message: '검증 중 오류가 발생했습니다.' });
  }
});

/**
 * POST /api/auth/register
 * 회원가입
 * - 근로자(employee): storeCode(5자리) 필수, 검증 후 해당 매장으로 초기 맵핑·승인 대기(pending)
 * - 점주(owner): storeCode 불필요
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, storeId, storeCode } = req.body;
    const isEmployee = (role || 'employee') === 'employee';

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

    // 근로자일 때 매장코드(5자리) 필수 및 검증
    let resolvedStoreId = storeId || null;
    let approvalStatus = 'approved';

    if (isEmployee) {
      const code = (storeCode || '').trim().toUpperCase();
      if (code.length !== 5) {
        return res.status(400).json({
          message: '근로자 가입을 위해 5자리 매장코드를 입력해 주세요.',
        });
      }
      const store = await Store.findOne({ storeCode: code, isActive: true });
      if (!store) {
        return res.status(400).json({
          message: '등록되지 않았거나 사용 중지된 매장코드입니다. 매장코드를 확인해 주세요.',
        });
      }
      resolvedStoreId = store._id;
      approvalStatus = 'pending'; // 점주 승인 후 활성화
    }

    // 사용자 생성
    const user = await User.create({
      name,
      email,
      password, // pre-save hook에서 자동 해싱
      phone: phone || '',
      role: role || 'employee',
      storeId: resolvedStoreId,
      approvalStatus,
    });

    // 비밀번호 제외한 사용자 정보
    const userObject = user.toJSON();

    // JWT 토큰 생성
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const message = isEmployee && approvalStatus === 'pending'
      ? '가입 요청이 완료되었습니다. 점주 승인 후 서비스를 이용할 수 있습니다.'
      : '회원가입이 완료되었습니다.';

    return res.status(201).json({
      message,
      user: userObject,
      token,
      approvalStatus: user.approvalStatus,
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

