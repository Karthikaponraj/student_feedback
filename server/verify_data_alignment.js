const mongoose = require('mongoose');
const User = require('./models/User');
const Feedback = require('./models/Feedback');
const StudentDetails = require('./models/StudentDetails');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env') });

async function verifyAlignment() {
    let output = "";
    const log = (msg) => {
        console.log(msg);
        output += msg + "\n";
    };

    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student_feedback');

        const allDetails = await StudentDetails.find({});
        const detailsMap = {};
        allDetails.forEach(d => {
            if (d.email) {
                const key = d.email.toLowerCase().trim();
                detailsMap[key] = d;
            }
        });

        const feedbacks = await Feedback.find({}).populate('student', 'name email');

        log("--- DETAILED INSPECTION ---");
        feedbacks.forEach(f => {
            const studentEmail = f.student ? f.student.email : f.email;
            const normalizedEmail = studentEmail ? studentEmail.toLowerCase().trim() : null;
            const match = normalizedEmail ? detailsMap[normalizedEmail] : null;

            log(`\nFeedback ID: ${f._id}`);
            log(`  studentEmail (raw): ${JSON.stringify(studentEmail)}`);
            log(`  normalizedEmail: ${JSON.stringify(normalizedEmail)}`);

            if (match) {
                log(`  MATCHED in StudentDetails: "${match.email}"`);
            } else {
                log(`  !!! NO MATCH FOUND !!!`);
            }
        });

        fs.writeFileSync(path.join(__dirname, 'alignment_log.txt'), output, 'utf8');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

verifyAlignment();
