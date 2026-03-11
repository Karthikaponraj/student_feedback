const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Feedback = require('./models/Feedback');
const StudentDetails = require('./models/StudentDetails');

async function inspectEmails() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student_feedback');
        
        console.log('\n--- SUHITA Feedback ---');
        const f = await Feedback.findOne({ email: /suhita/i });
        if (f) {
            console.log(`Email in DB: "${f.email}"`);
            console.log(`Length: ${f.email.length}`);
        } else {
            console.log('No feedback for suhita found by regex');
        }

        console.log('\n--- SUHITA StudentDetails ---');
        const d = await StudentDetails.findOne({ email: /suhita/i });
        if (d) {
            console.log(`Email in DB: "${d.email}"`);
            console.log(`Length: ${d.email.length}`);
        } else {
            console.log('No details for suhita found by regex');
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

inspectEmails();
