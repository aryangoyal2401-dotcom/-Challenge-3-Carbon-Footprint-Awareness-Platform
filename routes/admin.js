const express = require('express');
const db = require('../config/db');
const { verifyAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes here require admin access
router.use(verifyAdmin);

// ---------------------------------------------------------------------------
// GET /api/admin/stats – overall system stats
// ---------------------------------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await db.users.count({});
    const totalActivities = await db.activities.count({});
    
    // Calculate total CO2 saved across all users
    const allUsers = await db.users.find({});
    const totalCO2Saved = allUsers.reduce((sum, u) => sum + (u.totalCO2Saved || 0), 0);

    return res.json({
      success: true,
      data: { totalUsers, totalActivities, totalCO2Saved }
    });
  } catch (err) {
    console.error('GET /api/admin/stats error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch admin stats' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/users – list all users
// ---------------------------------------------------------------------------
router.get('/users', async (req, res) => {
  try {
    const users = await db.users.find({}).sort({ createdAt: -1 });
    
    const safeUsers = users.map(u => {
      const { password: _password, ...safe } = u;
      return safe;
    });

    return res.json({ success: true, data: safeUsers });
  } catch (err) {
    console.error('GET /api/admin/users error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/:id – delete a user and their data
// ---------------------------------------------------------------------------
router.delete('/users/:id', async (req, res) => {
  try {
    const targetUserId = req.params.id;
    
    // Don't let admin delete themselves easily
    if (targetUserId === req.user._id) {
        return res.status(400).json({ success: false, error: 'Admin cannot delete themselves here.' });
    }

    await db.activities.remove({ userId: targetUserId }, { multi: true });
    await db.challenges.remove({ userId: targetUserId }, { multi: true });
    await db.users.remove({ _id: targetUserId });

    return res.json({ success: true, data: { message: 'User deleted' } });
  } catch (err) {
    console.error('DELETE /api/admin/users/:id error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

module.exports = router;
