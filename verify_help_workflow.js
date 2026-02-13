const axios = require('axios');

const API_URL = 'http://localhost:5006/api';
const STUDENT_EMAIL = `student_${Date.now()}@test.com`;
const STUDENT_PASSWORD = 'password123';
const ADMIN_EMAIL = 'admin@test.com'; // Must match seed script
const ADMIN_PASSWORD = 'password123';

const runVerification = async () => {
    try {
        console.log("--- Starting Verification Flow ---");

        // 1. Register Student
        console.log(`1. Registering Student (${STUDENT_EMAIL})...`);
        await axios.post(`${API_URL}/register`, {
            email: STUDENT_EMAIL,
            password: STUDENT_PASSWORD,
            role: 'student'
        });
        console.log("   Student Registered.");

        // 2. Login Student
        console.log("2. Logging in Student...");
        let res = await axios.post(`${API_URL}/login`, {
            email: STUDENT_EMAIL,
            password: STUDENT_PASSWORD,
            role: 'student'
        });
        const studentToken = res.data.token;
        console.log("   Student Logged In.");

        // 3. Submit Help Request
        console.log("3. Submitting Help Request...");
        await axios.post(`${API_URL}/feedback`, {
            emotion: 'Stressed',
            emotion_intensity: 5,
            comment: 'I am overwhelmed.',
            request_help: false, // Old field
            helpRequested: true // New field
        }, { headers: { Authorization: `Bearer ${studentToken}` } });
        console.log("   Help Request Submitted.");

        // 4. Verify Pending Status (Student View)
        console.log("4. Verifying Student History (Pending)...");
        res = await axios.get(`${API_URL}/my-feedback`, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        const feedback = res.data[0];
        if (feedback.helpRequested && (!feedback.status || feedback.status === 'pending')) {
            console.log("   ✓ Status is Pending.");
        } else {
            throw new Error(`Expected Pending, got ${feedback.status}`);
        }
        const feedbackId = feedback._id;

        // 5. Login Admin
        console.log("5. Logging in Admin...");
        res = await axios.post(`${API_URL}/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            role: 'admin'
        });
        const adminToken = res.data.token;
        console.log("   Admin Logged In.");

        // 6. Fetch Help Requests (Admin View)
        console.log("6. Fetching Help Requests as Admin...");
        res = await axios.get(`${API_URL}/admin/help-requests`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const adminViewFeedback = res.data.find(f => f._id === feedbackId);
        if (adminViewFeedback) {
            console.log("   ✓ Request found in Admin view.");
        } else {
            throw new Error("Request not found in Admin view");
        }

        // 7. Assign Mentor
        console.log("7. Assigning Mentor...");
        await axios.post(`${API_URL}/admin/assign-mentor/${feedbackId}`, {
            mentorName: 'Dr. Test Mentor'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        console.log("   Mentor Assigned.");

        // 8. Verify Allocated Status (Student View)
        console.log("8. Verifying Student History (Allocated)...");
        res = await axios.get(`${API_URL}/my-feedback`, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        const updatedFeedback = res.data[0];
        if (updatedFeedback.status === 'allocated' && updatedFeedback.assignedMentor === 'Dr. Test Mentor') {
            console.log("   ✓ Status is Allocated to Dr. Test Mentor.");
        } else {
            throw new Error(`Expected Allocated/Dr. Test Mentor, got ${updatedFeedback.status}/${updatedFeedback.assignedMentor}`);
        }

        // 9. Mark Resolved (Admin View)
        console.log("9. Marking as Resolved...");
        await axios.patch(`${API_URL}/admin/resolve/${feedbackId}`, {}, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log("   Request Resolved.");

        // 10. Verify Resolved Status
        console.log("10. Verifying Final Status...");
        res = await axios.get(`${API_URL}/my-feedback`, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        if (res.data[0].status === 'resolved') {
            console.log("   ✓ Status is Resolved.");
        } else {
            throw new Error("Expected Resolved status");
        }

        console.log("\n✅ VERIFICATION SUCCESSFUL: Full workflow functioning correctly.");

    } catch (error) {
        console.error("\n❌ VERIFICATION FAILED:", error.response ? error.response.data : error.message);
        process.exit(1);
    }
};

runVerification();
