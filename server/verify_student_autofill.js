
const PORT = 5006; // Active port found via netstat
const BASE_URL = `http://localhost:${PORT}/api`;

async function verifyFeatures() {
    console.log(`🚀 Starting Verification on PORT ${PORT}...`);

    const testEmail = `test_stu_${Date.now()}@bitsathy.ac.in`;
    const password = "password123";
    const role = "student";

    try {
        const fetchJSON = async (url, options = {}) => {
            const res = await fetch(url, options);
            const text = await res.text();
            try {
                return { status: res.status, data: text ? JSON.parse(text) : {} };
            } catch (e) {
                console.error(`Failed to parse JSON from ${url}. Status: ${res.status}. Raw response: ${text}`);
                throw new Error(`Invalid JSON response from ${url}`);
            }
        };

        // 1. Register Student
        console.log(`\n1️⃣ Registering test student: ${testEmail}`);
        const reg = await fetchJSON(`${BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password, role })
        });
        if (reg.status !== 201) throw new Error("Registration failed: " + JSON.stringify(reg.data));
        console.log("✅ Registration successful");

        // 2. Login
        console.log("\n2️⃣ Logging in...");
        const login = await fetchJSON(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, password, role })
        });
        const token = login.data.token;
        if (!token) throw new Error("Login failed, no token: " + JSON.stringify(login.data));
        console.log("✅ Login successful");

        // 3. Register Student Details
        console.log("\n3️⃣ Registering student details...");
        const detailsPayload = {
            name: "Test Student",
            regno: "REG_" + Date.now(),
            department: "BTECH-CSBS",
            batch: "2023-2027",
            email: testEmail,
            mobile: "9876543210",
            place: "Test City"
        };
        const details = await fetchJSON(`${BASE_URL}/student-details`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(detailsPayload)
        });
        if (details.status !== 201) throw new Error("Failed to register student details: " + JSON.stringify(details.data));
        console.log("✅ Student Details registered");

        // 4. Verify Duplicate Prevention (with Mobile)
        console.log("\n4️⃣ Verifying strict duplicate prevention (attempting to register Student B with Student A's mobile)...");
        // Reuse Student A's mobile in a new payload
        const studentBPayload = { ...detailsPayload, email: `stu_b_${Date.now()}@test.com`, regno: `REG_B_${Date.now()}` };
        const dup = await fetchJSON(`${BASE_URL}/student-details`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(studentBPayload)
        });
        console.log("Duplicate Registration Response (Expected 400):", dup.status);
        if (dup.status === 400) {
            console.log("✅ strict duplicate prevention verified (Mobile check worked)");
        } else {
            throw new Error("Duplicate prevention FAILED! Expected 400, got " + dup.status);
        }

        // 5. Verify /me Endpoint
        console.log("\n5️⃣ Verifying /api/student-details/me endpoint...");
        const me = await fetchJSON(`${BASE_URL}/student-details/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (me.status === 200 && me.data.regno === detailsPayload.regno) {
            console.log("✅ /me endpoint verified. Data matches.");
        } else {
            throw new Error(`/me endpoint FAILED! Status: ${me.status}, Data: ${JSON.stringify(me.data)}`);
        }

        // 6. Submit Feedback
        console.log("\n6️⃣ Submitting feedback to verify enrichment...");
        const feedbackPayload = {
            emotion: "Happy",
            comment: "Verification test comment",
            emotion_intensity: 4,
            helpRequested: false
        };
        const fed = await fetchJSON(`${BASE_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(feedbackPayload)
        });
        if (fed.status !== 201) throw new Error("Feedback submission failed: " + fed.data);
        console.log("✅ Feedback submitted");

        // 7. Verify Enrichment
        console.log("\n7️⃣ Verifying feedback enrichment...");
        const hist = await fetchJSON(`${BASE_URL}/my-feedback`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const latestFeedback = hist.data[0];

        console.log("Enriched Data in Feedback record:");
        console.log("- Name:", latestFeedback.name);
        console.log("- RegNo:", latestFeedback.regno);

        if (latestFeedback.regno === detailsPayload.regno && latestFeedback.name === detailsPayload.name) {
            console.log("✅ Feedback enrichment VERIFIED.");
        } else {
            throw new Error("Feedback enrichment FAILED!");
        }

        console.log("\n✨ ALL VERIFICATIONS PASSED SUCCESSFULLY! ✨");

    } catch (error) {
        console.error("\n❌ VERIFICATION FAILED:", error.message);
        process.exit(1);
    }
}

verifyFeatures();
