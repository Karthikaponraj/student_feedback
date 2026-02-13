const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'faculty', 'admin'], default: 'student' }
});

const User = mongoose.model('User', userSchema);

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(async () => {
        console.log('MongoDB Connected');

        const email = 'admin@admin.com';
        const password = 'admin';

        // Check if exists
        let user = await User.findOne({ email });

        if (user) {
            console.log('User exists. Updating role to Admin...');
            user.role = 'admin';
            user.password = await bcrypt.hash(password, 10); // Reset password too
            await user.save();
        } else {
            console.log('Creating new Admin user...');
            const hashedPassword = await bcrypt.hash(password, 10);
            user = new User({
                email,
                password: hashedPassword,
                role: 'admin'
            });
            await user.save();
        }

        console.log(`\nSUCCESS! Admin User Ready.\nEmail: ${email}\nPassword: ${password}\n`);
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
