const mongoose = require('mongoose');
const User = require('./models/User');
const authController = require('./controllers/authController');
const path = require('path');
const dotenv = require('dotenv');

// Try loading .env from server directory if running from root
dotenv.config({ path: path.join(__dirname, '.env') });
if (!process.env.MONGO_URI) {
    // Fallback if running from root and script is in server/
    dotenv.config({ path: 'server/.env' });
}

// Mock Express Request/Response
const mockReq = (body) => ({ body });
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function runTests() {
    console.log("Starting Auth Verification...");

    if (!process.env.MONGO_URI) {
        console.error("MONGO_URI not found in .env");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        const testEmail = "test_auth_fix_" + Date.now() + "@test.com";
        const testPassword = "password123";
        const testRole = "student";

        // 1. Register
        console.log("\n--- TEST 1: Register ---");
        const reqReg = mockReq({ email: testEmail, password: testPassword, role: testRole });
        const resReg = mockRes();
        await authController.register(reqReg, resReg);
        console.log(`Status: ${resReg.statusCode}, Message: ${resReg.data.message}`);

        if (resReg.statusCode !== 201) {
            throw new Error("Registration failed");
        }

        // 2. Login Success
        console.log("\n--- TEST 2: Login Success ---");
        const reqLogin = mockReq({ email: testEmail, password: testPassword, role: testRole });
        const resLogin = mockRes();
        await authController.login(reqLogin, resLogin);
        console.log(`Status: ${resLogin.statusCode}`);
        if (resLogin.statusCode === 200 || !resLogin.statusCode) { // res.json doesn't set status usually, implies 200
            if (resLogin.data.token && resLogin.data.role === testRole) {
                console.log("PASS: Token received and role matches.");
            } else {
                console.log("FAIL: Invalid response data", resLogin.data);
            }
        } else {
            console.log("FAIL: Status " + resLogin.statusCode);
        }

        // 3. Login Wrong Role
        console.log("\n--- TEST 3: Login Wrong Role ---");
        const reqBadRole = mockReq({ email: testEmail, password: testPassword, role: "admin" });
        const resBadRole = mockRes();
        await authController.login(reqBadRole, resBadRole);
        console.log(`Status: ${resBadRole.statusCode}, Message: ${resBadRole.data.message}`);
        if (resBadRole.statusCode === 401 && resBadRole.data.message === "Invalid credentials") {
            console.log("PASS: Correctly rejected wrong role.");
        } else {
            console.log("FAIL: Should be 401 Invalid credentials");
        }

        // 4. Login Wrong Password
        console.log("\n--- TEST 4: Login Wrong Password ---");
        const reqBadPass = mockReq({ email: testEmail, password: "wrong_password", role: testRole });
        const resBadPass = mockRes();
        await authController.login(reqBadPass, resBadPass);
        console.log(`Status: ${resBadPass.statusCode}, Message: ${resBadPass.data.message}`);
        if (resBadPass.statusCode === 401 && resBadPass.data.message === "Invalid credentials") {
            console.log("PASS: Correctly rejected wrong password.");
        } else {
            console.log("FAIL: Should be 401 Invalid credentials");
        }

        // Cleanup
        await User.deleteOne({ email: testEmail });
        console.log("\nTest User Cleaned Up.");

    } catch (err) {
        console.error("Test Failed:", err);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

runTests();
