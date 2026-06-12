import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import Complaint from '../models/Complaint.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create a new complaint (all users)
router.post('/', async (req, res) => {
  try {
    const { complaintType, subject, description, orderId, relatedUserId, priority } = req.body;

    // Validate required fields
    if (!complaintType || !subject || !description) {
      return res.status(400).json({ 
        message: 'Complaint type, subject, and description are required' 
      });
    }

    // Validate complaint type
    const validTypes = ['order', 'payment', 'rider', 'shop', 'technical', 'other'];
    if (!validTypes.includes(complaintType)) {
      return res.status(400).json({ 
        message: 'Invalid complaint type' 
      });
    }

    // Create complaint
    const complaint = new Complaint({
      user: req.user._id,
      userRole: req.user.role,
      complaintType,
      subject: subject.trim(),
      description: description.trim(),
      order: orderId || undefined,
      relatedUser: relatedUserId || undefined,
      priority: priority || 'medium'
    });

    await complaint.save();

    // Populate user info for response
    await complaint.populate('user', 'name shopName phone username role');

    // Create notification for admin
    await Notification.create({
      user: req.user._id, // Also notify the user who submitted
      title: 'Complaint Submitted',
      message: `Your complaint "${subject}" has been submitted and will be reviewed by our team.`,
      type: 'info'
    });

    // TODO: Create admin notification (you may want to create a system admin user or use a different approach)
    // For now, admins can check complaints in their dashboard

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user's own complaints (all users)
router.get('/my-complaints', async (req, res) => {
  try {
    const { status, type } = req.query;
    
    const query = { user: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.complaintType = type;
    }

    const complaints = await Complaint.find(query)
      .populate('order', 'orderNumber status')
      .populate('relatedUser', 'name shopName phone username role')
      .populate('resolvedBy', 'name username role')
      .sort({ createdAt: -1 });

    res.json({ complaints });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single complaint (user can only see their own, admin can see all)
router.get('/:complaintId', async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.complaintId)
      .populate('user', 'name shopName phone username role')
      .populate('order', 'orderNumber status')
      .populate('relatedUser', 'name shopName phone username role')
      .populate('resolvedBy', 'name username role');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check if user has access (own complaint or admin)
    const isOwner = complaint.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ complaint });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    res.status(500).json({ message: error.message });
  }
});

// Admin routes
// Get all complaints (admin only)
router.get('/admin/all', adminOnly, async (req, res) => {
  try {
    const { status, type, priority } = req.query;
    
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.complaintType = type;
    }
    
    if (priority) {
      query.priority = priority;
    }

    const complaints = await Complaint.find(query)
      .populate('user', 'name shopName phone username role')
      .populate('order', 'orderNumber status')
      .populate('relatedUser', 'name shopName phone username role')
      .populate('resolvedBy', 'name username role')
      .sort({ createdAt: -1 });

    res.json({ complaints });
  } catch (error) {
    console.error('Error fetching all complaints:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update complaint status (admin only)
router.patch('/:complaintId/status', adminOnly, async (req, res) => {
  try {
    const { status, adminResponse, adminNotes } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const complaint = await Complaint.findById(req.params.complaintId);
    
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.status = status;
    
    if (adminResponse) {
      complaint.adminResponse = adminResponse.trim();
    }
    
    if (adminNotes) {
      complaint.adminNotes = adminNotes.trim();
    }

    // If resolved, set resolvedAt and resolvedBy
    if (status === 'resolved' || status === 'closed') {
      complaint.resolvedAt = new Date();
      complaint.resolvedBy = req.user._id;
    }

    await complaint.save();

    // Notify the user about status update
    await Notification.create({
      user: complaint.user,
      title: 'Complaint Status Updated',
      message: `Your complaint "${complaint.subject}" status has been updated to ${status}.`,
      type: 'info'
    });

    await complaint.populate('user', 'name shopName phone username role');
    await complaint.populate('resolvedBy', 'name username role');

    res.json({
      message: 'Complaint status updated successfully',
      complaint
    });
  } catch (error) {
    console.error('Error updating complaint status:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update complaint priority (admin only)
router.patch('/:complaintId/priority', adminOnly, async (req, res) => {
  try {
    const { priority } = req.body;

    if (!priority) {
      return res.status(400).json({ message: 'Priority is required' });
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority' });
    }

    const complaint = await Complaint.findById(req.params.complaintId);
    
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.priority = priority;
    await complaint.save();

    await complaint.populate('user', 'name shopName phone username role');

    res.json({
      message: 'Complaint priority updated successfully',
      complaint
    });
  } catch (error) {
    console.error('Error updating complaint priority:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get complaint statistics (admin only)
router.get('/admin/stats', adminOnly, async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const pending = await Complaint.countDocuments({ status: 'pending' });
    const inProgress = await Complaint.countDocuments({ status: 'in_progress' });
    const resolved = await Complaint.countDocuments({ status: 'resolved' });
    const closed = await Complaint.countDocuments({ status: 'closed' });

    const byType = await Complaint.aggregate([
      {
        $group: {
          _id: '$complaintType',
          count: { $sum: 1 }
        }
      }
    ]);

    const byPriority = await Complaint.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      stats: {
        total,
        pending,
        inProgress,
        resolved,
        closed,
        byType,
        byPriority
      }
    });
  } catch (error) {
    console.error('Error fetching complaint stats:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;





