
// Native fetch is available in Node 18+

const BASE_URL = 'http://localhost:5007/api';

async function verifyFix() {
    console.log("--- Verifying Notifications & Data Fixes on Port 5007 ---");

    try {
        // 1. Register/Login a Test Student
        console.log("1. Authenticating as Student...");
        const studentEmail = `student_${Date.now()}@test.com`;
        const studentName = "Test Student";

        let studentToken;
        const regRes = await fetch(`${BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: studentEmail, password: 'password123', role: 'student', name: studentName })
        });

        if (regRes.ok) {
            const data = await regRes.json();
            // Login to get token if register doesn't return it (it usually does or we login)
            const loginRes = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: studentEmail, password: 'password123', role: 'student' })
            });
            const loginData = await loginRes.json();
            studentToken = loginData.token;
            console.log(`✅ Student Registered & Logged in: ${studentEmail}`);
        } else {
            throw new Error(`Student registration failed: ${regRes.status}`);
        }

        // 2. Submit Help Request
        console.log("2. Submitting Help Request...");
        const feedbackRes = await fetch(`${BASE_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${studentToken}`
            },
            body: JSON.stringify({
                emotion: 'Anxious',
                emotion_intensity: 5,
                helpRequested: true,
                comment: "I need verified help!"
            })
        });

        if (feedbackRes.ok) {
            console.log("✅ Feedback with Help Request submitted.");
        } else {
            throw new Error(`Feedback submission failed: ${feedbackRes.status}`);
        }

        // 3. Login as Admin
        console.log("3. Logging in as Admin...");
        const adminRes = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@admin.com', password: 'admin', role: 'admin' })
        });
        const adminData = await adminRes.json();
        const adminToken = adminData.token;
        console.log("✅ Admin Logged in.");

        // 4. Check for Notification
        console.log("4. Checking Admin Notifications...");
        // Wait a moment for async processing if any
        await new Promise(r => setTimeout(r, 1000));

        const notifRes = await fetch(`${BASE_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const notifs = await notifRes.json();

        const helpNotif = notifs.find(n => n.type === 'help_request' && n.message.includes(studentEmail.split('@')[0]));
        if (helpNotif) {
            console.log(`✅ SUCCESS: Notification found for help request! ID: ${helpNotif._id}`);
        } else {
            console.warn("⚠️ NO NOTIFICATION FOUND for the new request. Triggers might be failing.");
            console.log("Recent notifications:", notifs.slice(0, 3));
        }

        // 5. Check Help Requests List (Data Fix Verification)
        console.log("5. Verifying Student Name in Help Requests...");
        const helpReqRes = await fetch(`${BASE_URL}/admin/help-requests`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const helpReqs = await helpReqRes.json();
        const myRequest = helpReqs.find(r => r.email === studentEmail);

        if (myRequest) {
            if (myRequest.studentName === studentName) {
                console.log(`✅ SUCCESS: Student Name correctly populated: "${myRequest.studentName}"`);
            } else {
                console.error(`❌ DATA MISMATCH: Expected "${studentName}", got "${myRequest.studentName}"`);
            }
        } else {
            console.error("❌ Request not found in Admin Help Requests list.");
            console.log("Found requests for emails:", helpReqs.map(r => r.email));
        }

    } catch (e) {
        console.error("❌ VERIFICATION FAILED:", e.message);
    }
}

verifyFix();
