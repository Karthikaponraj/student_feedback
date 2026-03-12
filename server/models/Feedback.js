const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    uid: String, // Keep for backward compatibility
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    name: String,
    regno: String,
    department: String,
    batch: String,
    mobile: String,
    place: String,
    emotion: { type: String, required: true },
    emotion_intensity: { type: Number, default: 3 },
    emotion_domain: { type: String, default: null },
    emotion_triggers: { type: [String], default: [] },
    emotion_duration: { type: String, default: null },
    life_impact_score: { type: Number, default: 3 },
    support_type: { type: String, default: 'Self-managed' },
    needs_immediate_help: { type: Boolean, default: false },
    helpRequested: { type: Boolean, default: false },
    comment: String,
    status: {
        type: String,
        enum: ['none', 'pending', 'allocated', 'yet_to_meet', 'ongoing', 'resolved'],
        default: 'none'
    },
    assignedMentor: { type: String, default: null },
    assignedFacultyEmail: { type: String, default: null },
    assignedFacultyName: { type: String, default: null },
    assignedAt: { type: Date, default: null },
    meetingTimeSlot: { type: String, default: null },
    meetingMode: { type: String, enum: ['online', 'offline'], default: 'offline' },
    meetingVenue: { type: String, default: null },
    sos_adoption: { 
        type: String, 
        enum: ['Adopted', 'Not Adopted', 'Pending'], 
        default: 'Pending' 
    },
    faculty_feedback: { type: String, default: null },
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
