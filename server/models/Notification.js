const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin', 'faculty'], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedFeedbackId: { type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' },
    isRead: { type: Boolean, default: false },
    type: { type: String, enum: ['help_request', 'mentor_assigned', 'request_resolved', 'info'], default: 'info' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
