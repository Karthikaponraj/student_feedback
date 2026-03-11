const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Feedback = require('./models/Feedback');
const StudentDetails = require('./models/StudentDetails');

async function debugData() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student_feedback');
        console.log('✅ Connected to MongoDB');

        const feedbackCount = await Feedback.countDocuments();
        console.log(`Total Feedbacks: ${feedbackCount}`);

        const feedbacks = await Feedback.find().sort({ timestamp: -1 }).limit(10);
        console.log('\n--- Latest 10 Feedbacks ---');
        for (const f of feedbacks) {
            console.log(`ID: ${f._id} | Emotion: ${f.emotion} | Email: ${f.email} | Student: ${f.student}`);
            console.log(`Structured: Domain: ${f.emotion_domain}, Triggers: ${f.emotion_triggers.length}, Impact: ${f.life_impact_score}`);
        }

        const detailsCount = await StudentDetails.countDocuments();
        console.log(`\nTotal StudentDetails: ${detailsCount}`);
        const allDetails = await StudentDetails.find({});
        console.log('--- All StudentDetails Emails ---');
        allDetails.forEach(d => console.log(`- ${d.email} (${d.name}) [${d.regno}]`));

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

debugData();
