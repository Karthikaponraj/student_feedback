const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student_feedback');
        console.log("Connected to MongoDB");

        const email = 'admin@test.com';
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const existingAdmin = await User.findOne({ email });
        if (existingAdmin) {
            existingAdmin.password = hashedPassword;
            existingAdmin.role = 'admin';
            await existingAdmin.save();
            console.log("Admin user updated: admin@test.com / password123");
        } else {
            const newAdmin = new User({
                email,
                password: hashedPassword,
                role: 'admin'
            });
            await newAdmin.save();
            console.log("Admin user created: admin@test.com / password123");
        }
        process.exit(0);
    } catch (error) {
        console.error("Error seeding admin:", error);
        process.exit(1);
    }
};

seedAdmin();
