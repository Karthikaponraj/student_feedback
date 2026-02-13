const mongoose = require('mongoose');
const User = require('./models/User');
const Feedback = require('./models/Feedback');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function inspectFeedback() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student_feedback');

        console.log("--- ALL ACTIVE HELP REQUESTS ---");
        const feedbacks = await Feedback.find({ helpRequested: true });
        feedbacks.forEach(f => {
            console.log(`ID: ${f._id} | Email: ${f.email} | Status: ${f.status} | FacultyEmail: ${f.assignedFacultyEmail}`);
        });

        console.log("\n--- FACULTY USERS ---");
        const faculty = await User.find({ role: 'faculty' });
        faculty.forEach(u => {
            console.log(`Faculty: ${u.email} | ID: ${u._id}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

inspectFeedback();
