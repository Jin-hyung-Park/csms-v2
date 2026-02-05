const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, isRead, type } = req.query;
    
    const query = { userId: req.user._id };
    
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }
    
    if (type) {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Notification.countDocuments(query);

    res.json({
      notifications,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalCount: count
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread-count
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false
    });

    res.json({ count });
  } catch (error) {
    logger.error('Get unread count error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: '알림을 찾을 수 없습니다' });
    }

    // Check if user owns this notification
    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json(notification);
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ message: '모든 알림이 읽음으로 표시되었습니다' });
  } catch (error) {
    logger.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: '알림을 찾을 수 없습니다' });
    }

    // Check if user owns this notification
    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다' });
    }

    await notification.remove();

    res.json({ message: '알림이 삭제되었습니다' });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Delete all read notifications
// @route   DELETE /api/notifications/delete-read
// @access  Private
router.delete('/delete-read', protect, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      userId: req.user._id,
      isRead: true
    });

    res.json({ 
      message: `${result.deletedCount}개의 읽은 알림이 삭제되었습니다`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    logger.error('Delete read notifications error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

module.exports = router; 