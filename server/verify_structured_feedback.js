const BASE_URL = 'http://localhost:5006/api';

async function verifyStructuredFeedback() {
    console.log("🚀 Starting Structured Feedback Verification...");

    const studentEmail = `structured_test_${Date.now()}@test.com`;
    const password = 'password123';

    try {
        // 1. Register & Login Student
        console.log(`\n1. Registering/Logging in student: ${studentEmail}`);
        await fetch(`${BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: studentEmail, password, role: 'student', name: 'Structured Student' })
        });

        let res = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: studentEmail, password, role: 'student' })
        });
        const studentData = await res.json();
        const studentToken = studentData.token;

        // 2. Submit Structured Feedback
        console.log(`\n2. Submitting structured feedback...`);
        const feedbackPayload = {
            emotion: "Stressed",
            emotion_intensity: 4,
            emotion_domain: "Academics",
            emotion_triggers: ["Assignment overload", "Backlogs"],
            emotion_duration: "1 week",
            life_impact_score: 4,
            helpRequested: true,
            comment: "Testing structured analysis features"
        };

        const submitRes = await fetch(`${BASE_URL}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
            body: JSON.stringify(feedbackPayload)
        });

        if (submitRes.status === 201) {
            console.log("✅ Feedback submission successful.");
        } else {
            const errText = await submitRes.text();
            console.error(`❌ Feedback submission failed: ${submitRes.status} ${errText}`);
            return;
        }

        // 3. Verify in History
        console.log(`\n3. Verifying data in history...`);
        res = await fetch(`${BASE_URL}/my-feedback`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const history = await res.json();

        if (history.length > 0) {
            const record = history[0];
            console.log("Record found:", JSON.stringify(record, null, 2));

            const checks = [
                record.emotion === "Stressed",
                record.emotion_domain === "Academics",
                record.emotion_triggers.includes("Assignment overload"),
                record.emotion_duration === "1 week",
                record.life_impact_score === 4,
                record.support_type === "Mentor/Counselor Follow-up",
                record.needs_immediate_help === true
            ];

            if (checks.every(Boolean)) {
                console.log("\n✨ ALL STRUCTURED FIELDS VERIFIED SUCCESSFULLY! ✨");
            } else {
                console.error("\n❌ DATA MISMATCH: Some structured fields were not saved correctly.");
            }
        } else {
            console.error("❌ FAILURE: No history records found.");
        }

    } catch (e) {
        console.error("❌ Verification Error:", e);
    }
}

verifyStructuredFeedback();
