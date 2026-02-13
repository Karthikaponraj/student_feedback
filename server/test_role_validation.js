const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function testRegister() {
    console.log("--- TESTING BACKEND USER VALIDATION ---");
    console.log("Connecting to:", process.env.MONGO_URI || 'mongodb://localhost:27017/student_feedback');

    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student_feedback');
        console.log("Connected to MongoDB.");

        const testEmail = `test_faculty_${Date.now()}@example.com`;
        const testUser = new User({
            email: testEmail,
            password: 'hashed_password',
            role: 'faculty',
            name: 'Test Faculty'
        });

        console.log("Attempting to save user with role: 'faculty'...");
        await testUser.save();
        console.log("✅ SUCCESS: Faculty user saved successfully.");

        // Clean up
        await User.deleteOne({ email: testEmail });
        console.log("Cleanup complete.");

    } catch (err) {
        console.error("❌ FAILURE: Validation failed.");
        console.error("Error Name:", err.name);
        console.error("Error Message:", err.message);
        if (err.errors) {
            console.error("Validation Errors:", JSON.stringify(err.errors, null, 2));
        }
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
}

testRegister();
