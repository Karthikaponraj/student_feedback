
const axios = require('axios');

const test = async () => {
    try {
        const loginRes = await axios.post('http://localhost:5006/api/login', {
            email: 'admin@test.com',
            password: 'password123',
            role: 'admin'
        });
        const token = loginRes.data.token;
        console.log("Logged in successfully");

        const res = await axios.get('http://localhost:5006/api/analytics', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Fetched analytics successfully. Count:", res.data.length);
        console.log("First item:", JSON.stringify(res.data[0], null, 2));
    } catch (error) {
        console.error("Test failed:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
        }
    }
};

test();
