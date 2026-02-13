const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:5007/api';
const testEmail = 'admin@admin.com';

async function runFullTest() {
    console.log('--- Testing Forgot Password Flow ---');
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const user = await User.findOne({ email: testEmail });
        if (!user) {
            console.log('Test user not found');
            return;
        }

        console.log('1. Triggering Forgot Password API...');
        const forgotRes = await axios.post(`${API_BASE_URL}/forgot-password`, { email: testEmail });
        console.log('Forgot Password response:', forgotRes.data);

        // Wait a bit for DB save
        await new Promise(resolve => setTimeout(resolve, 2000));

        const updatedUser = await User.findOne({ email: testEmail });
        const otp = updatedUser.resetPasswordOTP;
        console.log(`2. Found OTP in DB: ${otp}`);

        if (!otp) {
            throw new Error('OTP not found in database after API call');
        }

        console.log('3. Verifying OTP via API...');
        const verifyRes = await axios.post(`${API_BASE_URL}/verify-otp`, { email: testEmail, otp });
        console.log('Verify OTP response:', verifyRes.data);

        console.log('4. Resetting Password via API...');
        const resetRes = await axios.post(`${API_BASE_URL}/reset-password`, {
            email: testEmail,
            otp,
            newPassword: 'admin'
        });
        console.log('Reset Password response:', resetRes.data);

        console.log('--- Test Completed Successfully ---');
    } catch (err) {
        console.error('Test Failed:', err.response ? err.response.data : err.message);
    } finally {
        await mongoose.disconnect();
    }
}

runFullTest();
