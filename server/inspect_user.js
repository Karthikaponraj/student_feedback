const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');

async function inspectUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student_feedback');
        
        console.log('\n--- SUHITA User ---');
        const u = await User.findOne({ email: /suhita/i });
        if (u) {
            console.log(`Email in User DB: "${u.email}"`);
            console.log(`Length: ${u.email.length}`);
            console.log(`UID: ${u.uid}`);
        } else {
            console.log('No user for suhita found by regex');
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

inspectUser();
