const axios = require('axios');

async function testLogin() {
    try {
        const response = await axios.post('http://localhost:5006/api/login', {
            email: 'admin@admin.com',
            password: 'admin',
            role: 'admin'
        });
        console.log('✅ Login Successful!');
        console.log('Response Status:', response.status);
        console.log('Token Received:', response.data.token ? 'Yes' : 'No');
    } catch (err) {
        console.error('❌ Login Failed:', err.response ? err.response.data : err.message);
    }
}

testLogin();
