
const BASE_URL = 'http://localhost:5006/api';

async function verifyWorkflow() {
    console.log("Starting Help Request Workflow Verification...");

    const studentEmail = `student_${Date.now()}@test.com`;
    const password = 'password123';

    try {
        // 1. Register Student
        console.log(`\n1. Registering student: ${studentEmail}`);
        let res = await fetch(`${BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: studentEmail, password, role: 'student' })
        });

        if (res.status !== 201) {
            const txt = await res.text();
            console.error(`Register failed: ${res.status} ${txt}`);
            // Proceeding if 400 (maybe already exists)
        } else {
            console.log("Student registered.");
        }

        // 2. Login Student
        console.log(`\n2. Logging in student...`);
        res = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: studentEmail, password, role: 'student' })
        });

        if (res.status !== 200) throw new Error("Student Login failed");
        const studentData = await res.json();
        const studentToken = studentData.token;
        console.log("Student logged in.");

        // 3. Submit Feedback with Help Request
        console.log(`\n3. Submitting feedback with helpRequested: true...`);
        res = await fetch(`${BASE_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify({
                emotion: "Sad",
                emotion_intensity: 5,
                comment: "I need help immediately.",
                helpRequested: true
            })
        });

        if (res.status === 201) {
            console.log("Feedback submitted successfully.");
        } else {
            const txt = await res.text();
            console.error(`Feedback submission failed: ${res.status} ${txt}`);
            return;
        }

        // 4. Verify Student History (My Feedback)
        console.log(`\n4. Verifying Student History...`);
        res = await fetch(`${BASE_URL}/my-feedback`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const myFeedback = await res.json();
        const latest = myFeedback[0];
        console.log("Latest Feedback in History:", JSON.stringify(latest, null, 2));

        if (latest.helpRequested === true && (latest.status === 'pending' || latest.status === 'allocated' || latest.status === 'resolved')) {
            console.log("SUCCESS: Student history shows helpRequested=true and valid status");
        } else {
            console.error("FAILURE: Student history mismatch.", { helpRequested: latest.helpRequested, status: latest.status });
        }

        // 5. Login Admin
        console.log(`\n5. Logging in Admin...`);
        const adminEmail = `admin_${Date.now()}@test.com`;

        // Try creating new admin
        await fetch(`${BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, password, role: 'admin' })
        });

        res = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, password, role: 'admin' })
        });

        if (res.status !== 200) {
            console.log("Could not login as new admin, trying generic admin...");
            res = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'admin@admin.com', password: 'admin', role: 'admin' })
            });
        }

        if (res.status !== 200) throw new Error("Admin Login failed");
        const adminData = await res.json();
        const adminToken = adminData.token;
        console.log("Admin logged in.");

        // 6. Fetch Help Requests
        console.log(`\n6. Fetching Admin Help Requests...`);
        res = await fetch(`${BASE_URL}/admin/help-requests`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        if (res.status !== 200) {
            const txt = await res.text();
            throw new Error(`Admin fetch failed: ${res.status} ${txt}`);
        }

        const helpRequests = await res.json();
        console.log(`Admin retrieved ${helpRequests.length} help requests.`);

        const found = helpRequests.find(StartLine => StartLine.comment === "I need help immediately.");
        if (found) {
            console.log("SUCCESS: Admin verified the help request.");
        } else {
            console.error("FAILURE: Admin DID NOT find the help request in the list.");
            console.log("List dump (first 3):", JSON.stringify(helpRequests.slice(0, 3), null, 2));
        }

    } catch (e) {
        console.error("Verification Error:", e);
    }
}

verifyWorkflow();
