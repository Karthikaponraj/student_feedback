const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');

// Middleware to authenticate token (duplicated to keep file self-contained or import from index if exported)
// Better to expect it's used after auth middleware in index.js, but index.js structure uses app.use('/api', authRoutes).
// We'll trust `req.user` is populated if this is used after auth middleware, 
// OR we recreate it here. Given `index.js` logic, let's assume this router is mounted at `/api/notifications` 
// and `index.js` applies auth middleware globally or we apply it here.
// Current `index.js` applies `authenticateToken` per route. 
// So we should probably export a middleware or just re-implement simple one here.

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// GET notifications for current user (Generic)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const query = { userId: req.user.id.toString() };
        const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin specific endpoint
router.get('/admin', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const query = { userId: req.user.id.toString() };
        const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Student specific endpoint
router.get('/student', authenticateToken, async (req, res) => {
    try {
        console.log(`[Student] Fetching notifications for userId: ${req.user.id}`);

        // Find by current Mongo ID or potentially legacy ID if user has one
        // We'll trust the creation logic is fixing it, but let's be safe for existing notifs
        const query = {
            $or: [
                { userId: req.user.id.toString() },
                { userId: req.user.email } // Fallback for some older ones
            ],
            role: 'student'
        };

        const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);
        console.log(`[Student] Found ${notifications.length} notifications.`);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ message: "Notification not found" });

        if (!notification.isRead) {
            notification.isRead = true;
            await notification.save();
        }
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark all as read
router.patch('/read-all', authenticateToken, async (req, res) => {
    try {
        const query = {
            $or: [
                { userId: req.user.id.toString() },
                { userId: req.user.email }
            ]
        };
        const result = await Notification.updateMany(query, { isRead: true });
        console.log(`[Notifications] Mark all as read for ${req.user.role} (${req.user.id}). Fixed ${result.modifiedCount} docs.`);
        res.json({ message: "All notifications marked as read", modifiedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE notification
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ message: "Notification not found" });

        // Ensure user owns the notification
        if (notification.userId !== req.user.id.toString() && notification.userId !== req.user.email) {
            return res.status(403).json({ message: "Not authorized to delete this notification" });
        }

        await Notification.findByIdAndDelete(req.params.id);
        res.json({ message: "Notification deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
