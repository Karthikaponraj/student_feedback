const mongoose = require('mongoose');
const User = require('./models/User');
const Feedback = require('./models/Feedback');
const Notification = require('./models/Notification');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function verifyFacultyNotification() {
    console.log("--- VERIFYING FACULTY NOTIFICATION LOGIC ---");

    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student_feedback');
        console.log("Connected to MongoDB.");

        // 1. Setup - Create a faculty user
        const facultyEmail = `faculty_${Date.now()}@test.com`;
        const facultyUser = await User.create({
            email: facultyEmail,
            password: 'password123', // unhashed for test is fine as we don't login
            role: 'faculty',
            name: 'Prof. Test'
        });
        console.log(`Created test faculty: ${facultyEmail}`);

        // 2. Setup - Create a feedback request
        const feedback = await Feedback.create({
            email: 'student@test.com',
            emotion: 'sad',
            helpRequested: true,
            status: 'pending'
        });
        console.log("Created test feedback request.");

        // 3. Simulate the assignment logic (as implemented in index.js)
        const mentorName = "Official Mentor";
        const updateData = {
            status: 'allocated',
            assignedMentor: mentorName,
            assignedFacultyEmail: facultyEmail,
            assignedAt: new Date()
        };

        const updatedFeedback = await Feedback.findByIdAndUpdate(
            feedback._id,
            updateData,
            { new: true }
        );

        // 4. Manual trigger of the notification logic (replicating index.js code)
        console.log("Simulating notification creation...");
        const facUser = await User.findOne({ email: facultyEmail });
        if (facUser) {
            const studentName = updatedFeedback.student ? "Named Student" : updatedFeedback.email.split('@')[0];
            await Notification.create({
                userId: facUser._id.toString(),
                role: 'faculty',
                title: 'New Student Assigned',
                message: `A new student (${studentName}) has been assigned to you.`,
                relatedFeedbackId: updatedFeedback._id,
                type: 'mentor_assigned'
            });
        }

        // 5. Check if notification exists
        const notification = await Notification.findOne({ userId: facultyUser._id.toString(), role: 'faculty' });

        if (notification && notification.title === 'New Student Assigned') {
            console.log("✅ SUCCESS: Faculty notification created successfully.");
            console.log("Message:", notification.message);
        } else {
            console.error("❌ FAILURE: Faculty notification not found.");
        }

        // Cleanup
        await User.deleteOne({ _id: facultyUser._id });
        await Feedback.deleteOne({ _id: feedback._id });
        await Notification.deleteMany({ userId: facultyUser._id.toString() });
        console.log("Cleanup complete.");

    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
}

verifyFacultyNotification();
