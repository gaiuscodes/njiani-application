import express from 'express';
import { protect } from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router = express.Router();

router.use(protect);

// Get all notifications for user
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate('order', '_id status')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      user: req.user._id, 
      read: false 
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark notification as read
router.put('/:notificationId/read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, user: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark all as read
router.put('/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

