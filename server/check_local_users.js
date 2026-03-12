const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/student_feedback';

async function checkUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        const count = await User.countDocuments();
        console.log(`Total users in database: ${count}`);
        
        const users = await User.find({}, 'email role name');
        console.log("--- User List ---");
        users.forEach(u => {
            console.log(`- Email: ${u.email}, Role: ${u.role}, Name: ${u.name}`);
        });
        
        await mongoose.disconnect();
    } catch (err) {
        console.error("Connection Error:", err);
    }
}

checkUsers();
