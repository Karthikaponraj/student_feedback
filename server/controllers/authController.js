const nodemailer = require('nodemailer');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Setup Nodemailer Transporter
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: process.env.MAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

// Helper function to send email with fallback
const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: `"Student Emotional Feedback" <${process.env.MAIL_USER}>`,
        to: email,
        subject: 'Password Reset OTP',
        text: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`,
        html: `<h3>Password Reset Requested</h3><p>Your OTP for password reset is: <strong>${otp}</strong></p><p>This OTP will expire in 10 minutes.</p>`
    };

    if (process.env.MAIL_USER && process.env.MAIL_PASS && process.env.MAIL_USER !== 'your-email@gmail.com') {
        try {
            await transporter.sendMail(mailOptions);
            console.log(`OTP sent to ${email}`);
            return true;
        } catch (error) {
            console.error("Email Error:", error);
            console.log(`FALLBACK: OTP for ${email} is ${otp}`);
            return false;
        }
    } else {
        console.log(`MAIL ENV NOT SET. OTP for ${email} is ${otp}`);
        return true;
    }
};

// REGISTER CONTROLLER
exports.register = async (req, res) => {
    try {
        const { email, password, role, name } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Normalize inputs
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedRole = role.trim();

        // Derive name if not provided
        const finalName = name || normalizedEmail.split('@')[0];

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save new user
        const newUser = new User({
            email: normalizedEmail,
            password: hashedPassword,
            role: normalizedRole,
            name: finalName
        });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// LOGIN CONTROLLER (Strict & Normalized)
exports.login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Normalize inputs to match registration
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedRole = role.trim();

        // 1. Fetch User ONLY by email
        const user = await User.findOne({ email: normalizedEmail });

        // 2. Validate User Existence
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 3. Validate Role Manually
        if (user.role !== normalizedRole) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 4. Validate Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 5. Update Last Login
        user.lastLogin = new Date();
        await user.save();

        // 6. Generate Token
        const token = jwt.sign(
            { id: user._id, role: user.role, email: user.email },
            process.env.JWT_SECRET || 'supersecretkey123',
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            token,
            role: user.role,
            userId: user._id,
            name: user.name
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// FORGOT PASSWORD - SEND OTP
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            // Security: Don't reveal if user exists, but for this app's UX we can be more transparent
            return res.status(404).json({ message: "User not found with this email" });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP and expiry (10 mins)
        user.resetPasswordOTP = otp;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        // Send Email
        await sendOTPEmail(normalizedEmail, otp);

        res.status(200).json({ message: "OTP sent to your email" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// VERIFY OTP
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({
            email: normalizedEmail,
            resetPasswordOTP: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        res.status(200).json({ message: "OTP verified successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({
            email: normalizedEmail,
            resetPasswordOTP: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        // Clear OTP fields
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
