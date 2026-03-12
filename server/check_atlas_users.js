const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function checkAtlasUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB Atlas');
        
        const count = await User.countDocuments();
        console.log(`Total users in database: ${count}`);
        
        const users = await User.find({}, 'email role name');
        console.log("--- Atlas User List ---");
        users.forEach(u => {
            console.log(`- Email: ${u.email}, Role: ${u.role}, Name: ${u.name}`);
        });
        
        await mongoose.disconnect();
    } catch (err) {
        console.error("Connection Error:", err);
    }
}

checkAtlasUsers();
