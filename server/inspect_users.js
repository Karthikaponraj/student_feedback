
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const userSchema = new mongoose.Schema({
    email: String,
    role: String,
    name: String
}, { strict: false });

const User = mongoose.model('User', userSchema, 'users');

async function inspect() {
    await mongoose.connect(MONGO_URI);

    const users = await User.find({
        $or: [
            { email: /karthika/i },
            { email: /bitsathy/i }
        ]
    });

    console.log("--- MATCHING USERS ---");
    users.forEach(u => {
        console.log(`- ID: ${u._id}, Email: ${u.email}, Role: ${u.role}, Name: ${u.name}`);
    });

    await mongoose.disconnect();
}

inspect().catch(err => {
    console.error(err);
    process.exit(1);
});
