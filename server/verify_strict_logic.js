const mongoose = require('mongoose');
const authController = require('./controllers/authController');
const User = require('./models/User');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });
if (!process.env.MONGO_URI) dotenv.config({ path: 'server/.env' });

// Mock Express
const mockReq = (body) => ({ body });
const mockRes = () => {
    const res = {};
    res.statusCode = 200; // Default
    res.data = null;
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

async function verifyStrictLogic() {
    console.log("Verifying STRICT Login Logic (Local Unit Test)...");

    if (!process.env.MONGO_URI) {
        console.error("No MONGO_URI found.");
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB.");

        // 1. Setup Test User
        const email = "strict_test_" + Date.now() + "@test.com";
        const password = "password123";
        const role = "student";

        // Register first (using controller)
        const reqReg = mockReq({ email, password, role });
        const resReg = mockRes();
        await authController.register(reqReg, resReg);
        if (resReg.statusCode !== 201) throw new Error("Registration failed: " + resReg.data.message);
        console.log("User registered.");

        // 2. Test Login (Correct)
        console.log("Test: Login Correct Credentials");
        const reqLogin = mockReq({ email, password, role });
        const resLogin = mockRes();
        await authController.login(reqLogin, resLogin);

        if (resLogin.statusCode === 200 && resLogin.data.token && resLogin.data.role === role) {
            console.log("PASS: Login success.");
        } else {
            console.error("FAIL: Login success failed.", resLogin.statusCode, resLogin.data);
        }

        // 3. Test Login (Wrong Role)
        console.log("Test: Login Wrong Role");
        const reqBadRole = mockReq({ email, password, role: "admin" });
        const resBadRole = mockRes();
        await authController.login(reqBadRole, resBadRole);

        if (resBadRole.statusCode === 401 && resBadRole.data.message === "Invalid credentials") {
            console.log("PASS: Role check enforced.");
        } else {
            console.error("FAIL: Role check failed.", resBadRole.statusCode, resBadRole.data);
        }

        // Cleanup
        await User.deleteOne({ email });
        console.log("Cleanup done.");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

verifyStrictLogic();
