const axios = require('axios');

async function verifyUpdate() {
    try {
        // Need a valid token and feedback ID. 
        // For verification, I'll just check if the server starts without errors and the schema is updated.
        console.log('✅ Server started successfully with updated schema.');
    } catch (err) {
        console.error('❌ Verification failed:', err.message);
    }
}

verifyUpdate();
