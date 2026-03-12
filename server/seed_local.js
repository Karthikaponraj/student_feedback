const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/student_feedback';

const seedData = [
    {
        email: 'admin@admin.com',
        password: 'admin',
        role: 'admin',
        name: 'System Admin'
    },
    {
        email: 'faculty@test.com',
        password: 'password123',
        role: 'faculty',
        name: 'Test Faculty'
    },
    {
        email: 'student@test.com',
        password: 'password123',
        role: 'student',
        name: 'Test Student'
    }
];

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        for (const data of seedData) {
            const existing = await User.findOne({ email: data.email });
            const hashedPassword = await bcrypt.hash(data.password, 10);
            
            if (existing) {
                existing.password = hashedPassword;
                existing.role = data.role;
                existing.name = data.name;
                await existing.save();
                console.log(`Updated: ${data.email} (${data.role})`);
            } else {
                const newUser = new User({
                    ...data,
                    password: hashedPassword
                });
                await newUser.save();
                console.log(`Created: ${data.email} (${data.role})`);
            }
        }

        console.log('\n✅ Seeding complete!');
        console.log('--- Credentials ---');
        console.log('Admin: admin@admin.com / admin');
        console.log('Faculty: faculty@test.com / password123');
        console.log('Student: student@test.com / password123');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();
