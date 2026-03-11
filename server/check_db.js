const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Feedback = require('./models/Feedback');

async function checkData() {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/student_feedback";
        await mongoose.connect(mongoUri);
        const latest = await Feedback.find().sort({ timestamp: -1 }).limit(1);
        if (latest.length > 0) {
            const f = latest[0];
            console.log(`Emotion: ${f.emotion}`);
            console.log(`Domain: ${f.emotion_domain}`);
            console.log(`Duration: ${f.emotion_duration}`);
            console.log(`Triggers: ${f.emotion_triggers}`);
            console.log(`Impact Score: ${f.life_impact_score}`);
            console.log(`Support: ${f.support_type}`);
        } else {
            console.log("No feedback found.");
        }
        mongoose.connection.close();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkData();
