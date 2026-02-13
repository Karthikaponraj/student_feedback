const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const authRoutes = require('./routes/auth');
const http = require('http');

// Load Env
dotenv.config({ path: path.join(__dirname, '.env') });
if (!process.env.MONGO_URI) dotenv.config({ path: 'server/.env' });

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', authRoutes);

const PORT = 5001; // DIAGNOSTIC PORT

async function runDiagnosis() {
    console.log("--- STARTING DIAGNOSTIC SERVER ON PORT 5001 ---");

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");
    } catch (e) {
        console.error("DB Connection Failed:", e);
        process.exit(1);
    }

    const server = app.listen(PORT, async () => {
        console.log(`Diagnostic Server running on port ${PORT}`);

        // PERFORM SELF-TEST
        try {
            const email = "diag_" + Date.now() + "@test.com";
            const password = "password123";
            const role = "student";

            console.log(`\n1. Attempting Register: ${email}`);
            const regRes = await fetch(`http://localhost:${PORT}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role })
            });
            const regData = await regRes.json();
            console.log(`Register Status: ${regRes.status}`, regData);

            if (regRes.status !== 201) throw new Error("Registration Failed");

            console.log(`\n2. Attempting Login`);
            const loginRes = await fetch(`http://localhost:${PORT}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role })
            });
            const loginData = await loginRes.json();
            console.log(`Login Status: ${loginRes.status}`);

            if (loginRes.status === 200 && loginData.token) {
                console.log("\n>>> SUCCCESS: AUTHENTICATION LOGIC IS WORKING ON PORT 5001 <<<");
                console.log("The issue is confirmed to be the STUCK SERVER on port 5000.");
            } else {
                console.error("\n>>> FAILURE: AUTHENTICATION FAILED EVEN ON NEW PORT <<<");
                console.error("Response:", loginData);
            }

            // Clean up
            const User = require('./models/User');
            await User.deleteOne({ email });
            console.log("Cleanup done.");

        } catch (err) {
            console.error("Diagnosis Failed:", err);
        } finally {
            server.close();
            mongoose.disconnect();
            console.log("Diagnostic Server Closed.");
            process.exit(0);
        }
    });
}

runDiagnosis();
