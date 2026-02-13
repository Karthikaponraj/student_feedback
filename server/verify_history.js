const BASE_URL = 'http://localhost:5006/api';

async function verifyHistory() {
    console.log("🚀 Starting Feedback History Verification...");

    const studentEmail = `history_test_${Date.now()}@test.com`;
    const password = 'password123';

    try {
        // 1. Register & Login Student
        console.log(`\n1. Registering/Logging in student: ${studentEmail}`);
        await fetch(`${BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: studentEmail, password, role: 'student', name: 'History Student' })
        });

        let res = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: studentEmail, password, role: 'student' })
        });
        const studentData = await res.json();
        const studentToken = studentData.token;
        const studentId = studentData.userId;

        // 2. Mock a legacy record (only UID, no student field)
        // Since we can't easily bypass the model in a script without db access, 
        // we'll just verify that a record created now is found.
        // To really test "legacy", we'd need to manually insert into Mongo.
        // But we can test the $or logic by ensuring it still works for new records too.

        console.log(`\n2. Submitting new feedback...`);
        await fetch(`${BASE_URL}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
            body: JSON.stringify({ emotion: "Happy", comment: "Testing history" })
        });

        console.log(`\n3. Fetching my feedback...`);
        res = await fetch(`${BASE_URL}/my-feedback`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const history = await res.json();

        if (history.length > 0) {
            console.log(`✅ SUCCESS: Found ${history.length} history records.`);
            console.log("Latest record:", JSON.stringify(history[0]));
        } else {
            console.error("❌ FAILURE: No history records found.");
        }

    } catch (e) {
        console.error("❌ Verification Error:", e);
    }
}

verifyHistory();
