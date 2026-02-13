
async function testLogin() {
    console.log("Testing Login against RUNNING server...");

    // 1. Register a fresh user
    const email = "test_real_" + Date.now() + "@test.com";
    const password = "password123";
    const role = "student";

    try {
        // Register
        console.log(`\nRegistering ${email}...`);
        const regRes = await fetch('http://localhost:5001/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });
        const regData = await regRes.json();
        console.log("Register Response:", regRes.status, regData);

        if (regRes.status !== 201) {
            console.error("Registration failed, aborting login test.");
            return;
        }

        // Login
        console.log(`\nLogging in as ${email} with role ${role}...`);
        const loginRes = await fetch('http://localhost:5001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });
        const loginData = await loginRes.json();
        console.log("Login Response:", loginRes.status, loginData);

        if (loginRes.status === 200) {
            console.log("SUCCESS: Login worked against running server.");
        } else {
            console.error("FAILURE: Login failed against running server.");
        }


        // Admin Login Test
        console.log("\n--- Testing Admin Login ---");
        const adminEmail = "admin@admin.com";
        const adminPassword = "admin";
        const adminRole = "admin";

        const adminLoginRes = await fetch('http://localhost:5001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, password: adminPassword, role: adminRole })
        });
        const adminLoginData = await adminLoginRes.json();
        console.log("Admin Login Response:", adminLoginRes.status);

        if (adminLoginRes.status === 200) {
            console.log("SUCCESS: Admin Login worked.");
        } else {
            console.log("FAILURE: Admin Login failed.", adminLoginData);
        }

        // Messy Input Test
        console.log("\n--- Testing Messy Input Login ---");
        // Try logging in as admin with CAPS and Spaces
        const messyEmail = "  Admin@Admin.com  ";
        const messyRole = "  admin  ";

        const messyRes = await fetch('http://localhost:5001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: messyEmail, password: adminPassword, role: messyRole })
        });
        console.log("Messy Login Response:", messyRes.status);

        if (messyRes.status === 200) {
            console.log("SUCCESS: Normalization worked.");
        } else {
            console.log("FAILURE: Normalization failed.");
        }


    } catch (error) {
        console.error("Network Error:", error.message);
    }
}

testLogin();
