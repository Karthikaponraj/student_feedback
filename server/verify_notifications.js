const BASE_URL = 'http://localhost:5006/api';

async function verifyNotifications() {
    console.log("🚀 Starting Notification System Verification...");

    const studentEmail = `student_notif_${Date.now()}@test.com`;
    const mentorName = "Dr. Test Mentor";
    const password = 'password123';

    try {
        // 1. Register & Login Student
        console.log(`\n1. Registering/Logging in student: ${studentEmail}`);
        await fetch(`${BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: studentEmail, password, role: 'student', name: 'Test Student' })
        });

        let res = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: studentEmail, password, role: 'student' })
        });
        const studentData = await res.json();
        console.log("Student Login Response:", JSON.stringify(studentData));
        const studentToken = studentData.token;
        const studentId = studentData.userId;

        // 2. Submit Help Request
        console.log(`\n2. Submitting help request...`);
        res = await fetch(`${BASE_URL}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
            body: JSON.stringify({ emotion: "Anxious", comment: "Need help with verification", helpRequested: true })
        });
        console.log("Feedback status:", res.status);

        // 3. Login Admin
        console.log(`\n3. Logging in Admin...`);
        res = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@admin.com', password: 'admin', role: 'admin' })
        });

        if (res.status !== 200) {
            // Fallback to any admin
            const allUsers = await fetch(`${BASE_URL}/users`, { headers: { 'Authorization': `Bearer ${studentToken}` } }).then(r => r.json()); // This will fail, student can't see users
        }

        const adminData = await res.json();
        const adminToken = adminData.token;

        // 4. Verify Admin Notification
        console.log(`\n4. Verifying Admin Notifications...`);
        res = await fetch(`${BASE_URL}/notifications/admin`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const adminNotifs = await res.json();
        const latestAdminNotif = adminNotifs.find(n => n.type === 'help_request');

        if (latestAdminNotif && latestAdminNotif.message.includes('Test Student')) {
            console.log("✅ SUCCESS: Admin received help request notification with student name.");
        } else {
            console.error("❌ FAILURE: Admin notification missing or incorrect.", latestAdminNotif);
        }

        // 5. Get Feedback ID and Assign Mentor
        res = await fetch(`${BASE_URL}/admin/help-requests`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const helpRequests = await res.json();
        const myRequest = helpRequests.find(r => r.comment === "Need help with verification");
        const feedbackId = myRequest.id || myRequest._id;

        console.log(`\n5. Assigning mentor to feedback ${feedbackId}...`);
        res = await fetch(`${BASE_URL}/admin/assign-mentor/${feedbackId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ mentorName })
        });
        console.log("Assign status:", res.status);

        // 6. Verify Student Notification (Mentor Assigned)
        console.log(`\n6. Verifying Student Notification (Mentor Assigned)...`);
        res = await fetch(`${BASE_URL}/notifications/student`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const studentNotifs = await res.json();
        const mentorNotif = studentNotifs.find(n => n.type === 'mentor_assigned');

        if (mentorNotif && mentorNotif.message.includes(mentorName)) {
            console.log("✅ SUCCESS: Student received mentor assigned notification.");
        } else {
            console.error("❌ FAILURE: Student mentor notification missing.", mentorNotif);
        }

        // 7. Resolve Request
        console.log(`\n7. Resolving request...`);
        res = await fetch(`${BASE_URL}/admin/resolve/${feedbackId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        console.log("Resolve status:", res.status);

        // 8. Verify Student Notification (Resolved)
        console.log(`\n8. Verifying Student Notification (Resolved)...`);
        res = await fetch(`${BASE_URL}/notifications/student`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const studentNotifsFinal = await res.json();
        const resolveNotif = studentNotifsFinal.find(n => n.type === 'request_resolved');

        if (resolveNotif) {
            console.log("✅ SUCCESS: Student received request resolved notification.");
        } else {
            console.error("❌ FAILURE: Student resolution notification missing.");
        }

    } catch (e) {
        console.error("❌ Verification Error:", e);
    }
}

verifyNotifications();
