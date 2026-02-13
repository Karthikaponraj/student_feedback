const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['student', 'admin', 'faculty'] },
    name: { type: String }, // Optional for backward compatibility, but recommended
    lastLogin: { type: Date },
    resetPasswordOTP: { type: String },
    resetPasswordExpires: { type: Date }
});

module.exports = mongoose.model('User', userSchema);
