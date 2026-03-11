const mongoose = require('mongoose');
const User = require('./models/User');
const Feedback = require('./models/Feedback');
const Notification = require('./models/Notification');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function verifyFacultyNotification() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student_feedback');

        console.log("--- FINDING TEST DATA ---");
        const student = await User.findOne({ role: 'student' });
        const faculty = await User.findOne({ role: 'faculty' });

        if (!student || !faculty) {
            console.error("Missing student or faculty for testing.");
            process.exit(1);
        }

        console.log(`Using Student: ${student.email}, Faculty: ${faculty.email}`);

        const testFeedback = new Feedback({
            student: student._id,
            email: student.email,
            emotion: 'Neutral',
            comment: 'Testing faculty notification',
            helpRequested: true,
            status: 'pending'
        });
        await testFeedback.save();

        console.log("--- SIMULATING ALLOCATION ---");
        const studentName = student.name || student.email.split('@')[0];

        await Notification.create({
            userId: faculty._id.toString(),
            role: 'faculty',
            title: 'New Student Assigned',
            message: `${studentName} is allocated to you.`,
            relatedFeedbackId: testFeedback._id,
            type: 'assignment'
        });

        console.log("--- VERIFYING NOTIFICATION ---");
        const notif = await Notification.findOne({
            userId: faculty._id.toString(),
            type: 'assignment'
        }).sort({ createdAt: -1 });

        if (notif && notif.message === `${studentName} is allocated to you.`) {
            console.log("✅ SUCCESS: Notification message matches!");
            console.log("Message:", notif.message);
        } else {
            console.log("❌ FAILURE: Notification message mismatch or not found.");
            if (notif) console.log("Found message:", notif.message);
        }

        // Cleanup
        await Feedback.findByIdAndDelete(testFeedback._id);
        await Notification.findByIdAndDelete(notif._id);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

verifyFacultyNotification();
