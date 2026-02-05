const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  body('username').trim().isLength({ min: 2, max: 50 }).withMessage('사용자명은 2-50자 사이여야 합니다'),
  body('email').isEmail().withMessage('올바른 이메일 형식을 입력해주세요'),
  body('password').isLength({ min: 6 }).withMessage('비밀번호는 최소 6자 이상이어야 합니다'),
  body('role').isIn(['employee', 'manager', 'owner']).withMessage('올바른 역할을 선택해주세요'),
  body('storeId').optional().isMongoId().withMessage('올바른 점포를 선택해주세요')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: '입력 정보를 확인해주세요.',
        errorType: 'VALIDATION_ERROR',
        errors: errors.array() 
      });
    }

    const { username, email, password, role, storeId, hourlyWage, taxType, workSchedule } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ 
          message: '이미 등록된 이메일입니다. 다른 이메일을 사용하거나 로그인해주세요.',
          errorType: 'EMAIL_EXISTS'
        });
      } else {
        return res.status(400).json({ 
          message: '이미 사용 중인 사용자명입니다. 다른 사용자명을 선택해주세요.',
          errorType: 'USERNAME_EXISTS'
        });
      }
    }

    // Create user with default values
    const userData = {
      username,
      email,
      password,
      role: role || 'employee', // 기본값은 근로자
      storeId: storeId,
      hourlyWage: hourlyWage || 10030, // 최저시급 기본값
      taxType: '미신고', // 기본값으로 설정
      workSchedule: workSchedule || {
        monday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        tuesday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        wednesday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        thursday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        friday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        saturday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        sunday: { enabled: false, startTime: '09:00', endTime: '18:00' }
      }
    };

    const user = await User.create(userData);

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
        hourlyWage: user.hourlyWage,
        taxType: user.taxType,
        workSchedule: user.workSchedule,
        hireDate: user.hireDate,
        terminationDate: user.terminationDate,
        token: generateToken(user._id)
      });
    }
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('올바른 이메일 형식을 입력해주세요'),
  body('password').notEmpty().withMessage('비밀번호를 입력해주세요')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        message: '등록되지 않은 이메일입니다. 회원가입을 먼저 진행해주세요.',
        errorType: 'EMAIL_NOT_FOUND'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        message: '비활성화된 계정입니다. 관리자에게 문의해주세요.',
        errorType: 'ACCOUNT_INACTIVE'
      });
    }

    // 카카오 사용자인 경우 비밀번호 로그인 방지 (현재 비활성화됨)
    // if (user.kakaoId) {
    //   return res.status(401).json({ 
    //     message: '카카오 계정으로 가입된 사용자입니다. 카카오 로그인을 이용해주세요.',
    //     errorType: 'KAKAO_USER'
    //   });
    // }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        message: '비밀번호가 일치하지 않습니다. 비밀번호를 다시 확인해주세요.',
        errorType: 'INVALID_PASSWORD'
      });
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      workLocation: user.workLocation,
      hourlyWage: user.hourlyWage,
      taxType: user.taxType,
      profileImage: user.profileImage,
      hireDate: user.hireDate,
      terminationDate: user.terminationDate,
      token: generateToken(user._id)
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    console.log('GET /me - 사용자 정보:', {
      _id: user._id,
      username: user.username,
      email: user.email,
      hireDate: user.hireDate
    });
    
    const responseData = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
      hourlyWage: user.hourlyWage,
      taxType: user.taxType,
      profileImage: user.profileImage,
      phoneNumber: user.phoneNumber,
      address: user.address,
      emergencyContact: user.emergencyContact,
      hireDate: user.hireDate,
      terminationDate: user.terminationDate
    };
    
    console.log('GET /me - 응답 데이터:', responseData);
    res.json(responseData);
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, [
  body('username').optional().trim().isLength({ min: 2, max: 50 }).withMessage('사용자명은 2-50자 사이여야 합니다'),
  body('phoneNumber').optional().matches(/^[0-9-+()\s]+$/).withMessage('올바른 전화번호 형식을 입력해주세요'),
  body('address').optional().isLength({ max: 200 }).withMessage('주소는 200자를 초과할 수 없습니다'),
  body('currentPassword').optional().isLength({ min: 6 }).withMessage('현재 비밀번호는 6자 이상이어야 합니다'),
  body('newPassword').optional().isLength({ min: 6 }).withMessage('새 비밀번호는 6자 이상이어야 합니다')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, phoneNumber, address, emergencyContact, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }



    // 비밀번호 변경 요청이 있는 경우
    if (currentPassword && newPassword) {
      // 현재 비밀번호 확인
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: '현재 비밀번호가 일치하지 않습니다' });
      }
      
      // 새 비밀번호 설정
      user.password = newPassword;
    }

    // Update fields
    if (username) user.username = username;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (address) user.address = address;
    if (emergencyContact) user.emergencyContact = emergencyContact;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      storeId: updatedUser.storeId,
      hourlyWage: updatedUser.hourlyWage,
      taxType: updatedUser.taxType,
      profileImage: updatedUser.profileImage,
      phoneNumber: updatedUser.phoneNumber,
      address: updatedUser.address,
      emergencyContact: updatedUser.emergencyContact,
      hireDate: updatedUser.hireDate,
      terminationDate: updatedUser.terminationDate
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get owners list for registration
// @route   GET /api/auth/owners
// @access  Public
router.get('/owners', async (req, res) => {
  try {
    const owners = await User.find({ 
      role: 'owner', 
      isActive: { $ne: false } 
    })
      .select('_id username email')
      .sort({ username: 1 });
    
    res.json(owners);
  } catch (error) {
    logger.error('점주 목록 조회 오류:', error);
    res.status(500).json({ message: '점주 목록 조회 중 오류가 발생했습니다.' });
  }
});

// @desc    Kakao login/register (현재 비활성화됨)
// @route   POST /api/auth/kakao
// @access  Public
router.post('/kakao', (req, res) => {
  res.status(404).json({ 
    message: '카카오 로그인 기능이 현재 비활성화되어 있습니다.',
    errorType: 'KAKAO_DISABLED'
  });
});

module.exports = router; 