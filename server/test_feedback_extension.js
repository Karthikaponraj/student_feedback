// Using native fetch (Node 18+)

async function testFeedbackExtension() {
    console.log("Testing Feedback Extension against RUNNING server...");
    const API_URL = 'http://localhost:5001/api';

    // 1. Register a fresh user
    const email = "test_feedback_" + Date.now() + "@test.com";
    const password = "password123";
    const role = "student";

    try {
        // Register
        const regRes = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });
        if (regRes.status !== 201) throw new Error("Registration failed");

        // Login
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        if (!token) throw new Error("Login failed");

        console.log("Logged in.");

        // 2. Submit Feedback with Request Help
        console.log("Submitting feedback with request_help: true...");
        const res1 = await fetch(`${API_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                emotion: "Sad",
                comment: "I need help",
                request_help: true
            })
        });
        if (res1.status !== 201) throw new Error("Feedback submission failed");

        // 3. Verify Status
        console.log("Verifying status...");
        const historyRes = await fetch(`${API_URL}/my-feedback`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const history = await historyRes.json();
        const latest = history[0];

        console.log("Latest Feedback:", latest);

        if (latest.request_help === true && latest.status === "Support Requested") {
            console.log("✅ SUCCESS: Status is 'Support Requested' when help is requested.");
        } else {
            console.error("❌ FAILURE: Status is wrong.", latest);
        }

        // 4. Submit Feedback WITHOUT Request Help
        console.log("Submitting feedback with request_help: false...");
        await fetch(`${API_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                emotion: "Happy",
                comment: "All good",
                request_help: false
            })
        });

        const historyRes2 = await fetch(`${API_URL}/my-feedback`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const history2 = await historyRes2.json();
        const latest2 = history2[0]; // Should be the new one

        if (latest2.request_help === false && latest2.status === "Pending") {
            console.log("✅ SUCCESS: Status is 'Pending' when help is NOT requested.");
        } else {
            console.error("❌ FAILURE: Status is wrong for normal feedback.", latest2);
        }

    } catch (error) {
        console.error("Test Error:", error);
    }
}

testFeedbackExtension();
