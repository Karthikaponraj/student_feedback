const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const FeedbackSchema = new mongoose.Schema({
    emotion: String,
    emotion_intensity: Number,
    emotion_domain: String,
    emotion_triggers: [String],
    emotion_duration: String,
    life_impact_score: Number,
    support_type: String,
    comment: String,
    date: String
}, { strict: false });

const Feedback = mongoose.model('Feedback', FeedbackSchema, 'feedbacks');

async function checkData() {
    try {
        const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/student_feedback";
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB");

        const latest = await Feedback.find().sort({ _id: -1 }).limit(5);
        console.log(JSON.stringify(latest, null, 2));

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
