const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
if (!process.env.MONGO_URI) dotenv.config({ path: 'server/.env' });

async function inspectUsers() {
    console.log("--- DB INSPECTION ---");
    if (!process.env.MONGO_URI) {
        console.error("No MONGO_URI found.");
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const users = await User.find({});
        console.log(`Found ${users.length} users:`);

        users.forEach(u => {
            console.log("------------------------------------------------");
            console.log(`ID:       ${u._id}`);
            console.log(`Email:    '${u.email}'`); // Quotes to see whitespace
            console.log(`Role:     '${u.role}'`);
            console.log(`Password: ${u.password ? u.password.substring(0, 10) + '...' : 'MISSING'}`);
            console.log("------------------------------------------------");
        });

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
        process.exit();
    }
}

inspectUsers();
