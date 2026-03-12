const mongoose = require('mongoose');

const counsellingSessionSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    session_date: { type: String, required: true },
    session_mode: { type: String, enum: ['In-Person', 'Online'], required: true },
    venue: { type: String, required: true },
    concern: { type: String, required: true },
    discussion_summary: { type: String, required: true },
    advice: { type: String, required: true },
    action_plan: { type: String, required: true },
    next_followup_date: { type: String, required: true },
    session_status: { type: String, enum: ['Completed', 'Follow-Up Required'], required: true },
    emotion_level: { type: Number, min: 1, max: 5, default: 3 },
    faculty_feedback: { type: String },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CounsellingSession', counsellingSessionSchema);
