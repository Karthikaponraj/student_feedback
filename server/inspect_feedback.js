const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
if (!process.env.MONGO_URI) dotenv.config({ path: 'server/.env' });

// Define Feedback Schema (copied from index.js)
const feedbackSchema = new mongoose.Schema({
    uid: String,
    email: String,
    emotion: String,
    emotion_intensity: Number,
    helpRequested: Boolean,
    comment: String,
    status: {
        type: String,
        enum: ['none', 'pending', 'allocated', 'resolved'],
        default: 'none'
    },
    assignedMentor: { type: String, default: null },
    assignedAt: { type: Date, default: null },
    date: String,
    timestamp: { type: Date, default: Date.now }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

async function inspectFeedback() {
    console.log("--- FEEDBACK INSPECTION ---");
    if (!process.env.MONGO_URI) {
        console.error("No MONGO_URI found.");
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const feedbacks = await Feedback.find({}).sort({ timestamp: -1 }).limit(10);
        console.log(`Found ${feedbacks.length} recent feedbacks:`);

        feedbacks.forEach(f => {
            console.log("------------------------------------------------");
            console.log(`ID:            ${f._id}`);
            console.log(`Email:         ${f.email}`);
            console.log(`Emotion:       ${f.emotion}`);
            console.log(`HelpRequested: ${f.helpRequested} (${typeof f.helpRequested})`);
            console.log(`Status:        '${f.status}'`);
            console.log(`Comment:       ${f.comment}`);
            console.log("------------------------------------------------");
        });

        const pendingCount = await Feedback.countDocuments({ helpRequested: true });
        console.log(`Total Pending Help Requests (helpRequested: true): ${pendingCount}`);

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
        process.exit();
    }
}

inspectFeedback();
