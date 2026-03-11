const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Feedback = require('./models/Feedback');
const StudentDetails = require('./models/StudentDetails');

async function debugMismatches() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student_feedback');
        
        const feedbacks = await Feedback.find({});
        const details = await StudentDetails.find({});
        
        console.log(`Feedbacks: ${feedbacks.length}, Details: ${details.length}`);
        
        const feedbackEmails = [...new Set(feedbacks.map(f => f.email?.toLowerCase().trim()).filter(Boolean))];
        const detailEmails = [...new Set(details.map(d => d.email?.toLowerCase().trim()).filter(Boolean))];
        
        console.log('\n--- Emails in Feedbacks ---');
        feedbackEmails.forEach(e => console.log(`'${e}'`));
        
        console.log('\n--- Emails in StudentDetails ---');
        detailEmails.forEach(e => console.log(`'${e}'`));
        
        const missing = feedbackEmails.filter(e => !detailEmails.includes(e));
        console.log('\n--- Feedback Emails Missing in StudentDetails ---');
        missing.forEach(e => console.log(`'${e}'`));

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

debugMismatches();
