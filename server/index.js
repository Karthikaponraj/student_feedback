const express = require('express');

process.on('uncaughtException', (err) => {
    console.error('🔥 UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, p) => {
    console.error('🔥 UNHANDLED REJECTION:', reason);
});

const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Mentor = require('./models/Mentor');
const Notification = require('./models/Notification');
const StudentDetails = require('./models/StudentDetails');
const CounsellingSession = require('./models/CounsellingSession');
const authRoutes = require('./routes/auth');
const notificationRoutes = require('./routes/notifications');

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5006;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- Health Check ---
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

app.use('/api', authRoutes);
app.use('/api/notifications', notificationRoutes);

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student_feedback')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
    });

const Feedback = require('./models/Feedback');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123', (err, user) => {
        if (err) {
            console.error("❌ JWT Verification Failed:", err.message);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

app.post('/api/feedback', authenticateToken, async (req, res) => {
    try {
        const { 
            emotion, 
            comment, 
            emotion_intensity, 
            helpRequested,
            emotion_domain,
            emotion_triggers,
            emotion_duration,
            life_impact_score
        } = req.body;
        
        if (!emotion) return res.status(400).send("Emotion is mandatory");

        const status = helpRequested ? "pending" : "none";

        const newFeedback = new Feedback({
            uid: req.user.id,
            student: req.user.id,
            email: req.user.email,
            emotion,
            emotion_intensity: emotion_intensity || 3,
            emotion_domain: emotion_domain || null,
            emotion_triggers: emotion_triggers || [],
            emotion_duration: emotion_duration || null,
            life_impact_score: life_impact_score || 3,
            helpRequested: helpRequested || false,
            comment: comment || "",
            status,
            date: new Date().toISOString().split('T')[0]
        });

        await newFeedback.save();

        if (helpRequested) {
            try {
                const admins = await User.find({ role: 'admin' });
                const studentUser = await User.findById(req.user.id);
                const studentName = studentUser ? studentUser.name : req.user.email.split('@')[0];

                const adminNotifications = admins.map(admin => ({
                    userId: admin._id,
                    role: 'admin',
                    title: 'New Help Request',
                    message: `${studentName || 'A student'} requested help.`,
                    relatedFeedbackId: newFeedback._id,
                    type: 'help_request'
                }));

                await Notification.insertMany(adminNotifications);
            } catch (notifError) {
                console.error("Notification Error:", notifError);
            }
        }

        res.status(201).send("Feedback submitted");
    } catch (error) {
        console.error("Feedback Submission Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.get('/api/my-feedback', authenticateToken, async (req, res) => {
    try {
        const feedbacks = await Feedback.find({
            $or: [
                { student: req.user.id },
                { uid: req.user.id }
            ]
        }).sort({ timestamp: -1 });
        const data = feedbacks.map(f => ({
            id: f._id,
            ...f.toObject(),
            // Ensure compatibility with frontend expectations
            facultyName: f.assignedFacultyName || f.assignedMentor,
            meetingTime: f.meetingTimeSlot,
            meetingVenue: f.meetingVenue
        }));
        res.json(data);
    } catch (error) {
        console.error("Fetch Feedback Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.post('/api/student-details', authenticateToken, async (req, res) => {
    try {
        const { email, regno } = req.body;

        // Check for existing record with same email or regno
        const existingDetail = await StudentDetails.findOne({
            $or: [
                { email: email.toLowerCase().trim() },
                { regno: regno.trim() }
            ]
        });

        if (existingDetail) {
            return res.status(400).json({ message: "Data already exists" });
        }

        const details = new StudentDetails({
            ...req.body,
            studentId: req.user.id,
            email: email.toLowerCase().trim(),
            regno: regno.trim()
        });
        await details.save();

        if (req.body.name && req.body.email) {
            await User.findOneAndUpdate(
                { email: { $regex: new RegExp(`^${req.body.email}$`, 'i') } },
                { name: req.body.name }
            );
        }

        res.status(201).json({ message: "Student details saved successfully." });
    } catch (error) {
        console.error("❌ Error saving student details:", error.message);
        res.status(500).send("Server Error");
    }
});

app.get('/api/student-details/me', authenticateToken, async (req, res) => {
    try {
        // Try exact match by ID first, then by email
        let details = await StudentDetails.findOne({ studentId: req.user.id });
        
        if (!details) {
            const normalizedEmail = req.user.email.toLowerCase().trim();
            details = await StudentDetails.findOne({ email: normalizedEmail });
            
            // Fallback for common truncation/typo issues in existing data
            if (!details) {
                const emailPrefix = normalizedEmail.split('@')[0];
                details = await StudentDetails.findOne({ 
                    email: { $regex: new RegExp(`^${emailPrefix}@`, 'i') } 
                });
            }

            // If found by email, retroactively link the studentId for future reliability
            if (details && !details.studentId) {
                details.studentId = req.user.id;
                await details.save();
            }
        }

        if (!details) return res.status(404).json({ message: "No details found" });
        res.json(details);
    } catch (error) {
        console.error("Error fetching my details:", error);
        res.status(500).send("Server Error");
    }
});

app.get('/api/student-details', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'faculty') return res.sendStatus(403);
    try {
        const details = await StudentDetails.find().sort({ timestamp: -1 });

        // Deduplicate in code to ensure latest unique records
        const uniqueDetails = [];
        const seen = new Set();

        for (const detail of details) {
            const email = (detail.email || "").toLowerCase().trim();
            const regno = (detail.regno || "").trim();
            const id = `${email}|${regno}`;

            if (!seen.has(id)) {
                uniqueDetails.push(detail);
                seen.add(id);
            }
        }

        res.json(uniqueDetails);
    } catch (error) {
        console.error("Error fetching student details:", error);
        res.status(500).send("Server Error");
    }
});

app.get('/api/analytics', authenticateToken, async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .populate('student', 'name email')
            .sort({ timestamp: -1 });

        console.log(`[Analytics] Found ${feedbacks.length} feedbacks`);

        // Get all student details for enrichment
        const allStudentDetails = await StudentDetails.find({});
        const detailsMap = {};
        allStudentDetails.forEach(d => {
            if (d.email) detailsMap[d.email.toLowerCase().trim()] = d;
        });

        const data = feedbacks.map(f => {
            const studentEmail = (f.student ? f.student.email : f.email || "").toLowerCase().trim();
            const studentName = f.student ? f.student.name : (f.email ? f.email.split('@')[0] : 'Unknown');
            
            // Robust lookup: exact match first, then prefix match for truncated data
            let details = studentEmail ? detailsMap[studentEmail] : null;
            if (!details && studentEmail) {
                const prefix = studentEmail.split('@')[0];
                // Find first details record that matches this prefix
                const matchEmail = Object.keys(detailsMap).find(e => e.startsWith(prefix + '@'));
                if (matchEmail) details = detailsMap[matchEmail];
            }

            return {
                id: f._id,
                ...f.toObject(),
                studentName: details ? details.name : studentName,
                studentEmail: studentEmail,
                regno: details ? details.regno : (f.regno || 'N/A'),
                department: details ? details.department : (f.department || 'N/A'),
                batch: details ? details.batch : (f.batch || 'N/A'),
                mobile: details ? details.mobile : (f.mobile || 'N/A'),
                place: details ? details.place : (f.place || 'N/A')
            };
        });
        res.json(data);
    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.get('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const users = await User.find({}, '-password');
        const details = await StudentDetails.find({});

        const nameMap = {};
        details.forEach(d => {
            if (d.email && d.name) {
                nameMap[d.email.toLowerCase().trim()] = d.name;
            }
        });

        const data = users.map(u => {
            const emailKey = u.email.toLowerCase().trim();
            let syncedName = u.name;
            const emailPrefix = u.email.split('@')[0];

            if (nameMap[emailKey] && (u.name === emailPrefix || !u.name)) {
                syncedName = nameMap[emailKey];
            }

            return {
                id: u._id,
                uid: u._id,
                email: u.email,
                role: u.role,
                name: syncedName,
                lastLogin: u.lastLogin
            };
        });
        res.json(data);
    } catch (error) {
        console.error("Fetch Users Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.post('/api/set-role', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const { uid, role } = req.body;
        await User.findByIdAndUpdate(uid, { role });
        res.json({ message: `Role updated to ${role}` });
    } catch (error) {
        console.error("Set Role Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.put('/api/users/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Both current and new passwords are required" });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect current password" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Password Change Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ message: "Name and email are required" });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const newEmail = email.toLowerCase().trim();
        const oldEmail = user.email.toLowerCase().trim();

        // If email is changing, check for uniqueness
        if (newEmail !== oldEmail) {
            const existingUser = await User.findOne({ email: newEmail });
            if (existingUser) {
                return res.status(400).json({ message: "Email already in use" });
            }
        }

        // Update User document
        user.name = name;
        user.email = newEmail;
        await user.save();

        // Propagate changes to other models
        if (user.role === 'student') {
            await StudentDetails.findOneAndUpdate(
                { email: oldEmail },
                { name: name, email: newEmail }
            );
            // Update email in historical feedback records
            await Feedback.updateMany(
                { $or: [{ student: user._id }, { uid: user._id.toString() }, { email: oldEmail }] },
                { email: newEmail }
            );
        } else if (user.role === 'faculty') {
            // Update Mentor registry if faculty is listed there
            await Mentor.findOneAndUpdate(
                { email: oldEmail },
                { name: name, email: newEmail }
            );
            // Update assigned info in active/past cases
            await Feedback.updateMany(
                { assignedFacultyEmail: oldEmail },
                { assignedFacultyEmail: newEmail, assignedFacultyName: name }
            );
        }

        res.json({
            message: "Profile updated successfully",
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error("Profile Update Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.delete('/api/users/:uid', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        await User.findByIdAndDelete(req.params.uid);
        res.send("User deleted");
    } catch (error) {
        console.error("Delete User Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.delete('/api/feedback/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        await Feedback.findByIdAndDelete(req.params.id);
        res.send("Feedback deleted");
    } catch (error) {
        console.error("Delete Feedback Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.get('/api/admin/help-requests', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const requests = await Feedback.find({ helpRequested: true })
            .populate('student', 'name email')
            .sort({ timestamp: -1 });

        // Get all student details for enrichment
        const allStudentDetails = await StudentDetails.find({});
        const detailsMap = {};
        allStudentDetails.forEach(d => {
            if (d.email) detailsMap[d.email.toLowerCase().trim()] = d;
        });

        const data = requests.map(f => {
            const studentEmail = (f.student ? f.student.email : f.email || "").toLowerCase().trim();
            const studentName = f.student ? f.student.name : (f.email ? f.email.split('@')[0] : 'Unknown');
            
            // Robust lookup
            let details = studentEmail ? detailsMap[studentEmail] : null;
            if (!details && studentEmail) {
                const prefix = studentEmail.split('@')[0];
                const matchEmail = Object.keys(detailsMap).find(e => e.startsWith(prefix + '@'));
                if (matchEmail) details = detailsMap[matchEmail];
            }

            return {
                id: f._id,
                ...f.toObject(),
                studentName: details ? details.name : studentName,
                studentEmail: studentEmail,
                regno: details ? details.regno : (f.regno || 'N/A'),
                department: details ? details.department : (f.department || 'N/A'),
                batch: details ? details.batch : (f.batch || 'N/A'),
                mobile: details ? details.mobile : (f.mobile || 'N/A'),
                place: details ? details.place : (f.place || 'N/A')
            };
        });
        res.json(data);
    } catch (error) {
        console.error("Fetch Help Requests Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.post('/api/admin/assign-mentor/:feedbackId', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const { feedbackId } = req.params;
        const { mentorName, facultyEmail } = req.body;

        const updateData = {
            status: 'allocated',
            assignedMentor: mentorName,
            assignedFacultyName: mentorName, // Store name for display
            assignedAt: new Date()
        };
        if (facultyEmail) {
            updateData.assignedFacultyEmail = facultyEmail.toLowerCase().trim();
        }

        const feedback = await Feedback.findByIdAndUpdate(
            feedbackId,
            updateData,
            { new: true }
        ).populate('student', 'name email');

        if (!feedback) return res.status(404).send("Feedback not found");

        try {
            let targetUserId = feedback.student ? (feedback.student._id || feedback.student) : (feedback.uid || feedback.email);

            if (typeof targetUserId === 'string' && feedback.email) {
                const currentUser = await User.findOne({ email: feedback.email });
                if (currentUser) {
                    targetUserId = currentUser._id;
                }
            }

            await Notification.create({
                userId: targetUserId.toString(),
                role: 'student',
                title: 'Mentor Assigned',
                message: `Faculty ${mentorName} has been assigned to support you.`,
                relatedFeedbackId: feedback._id,
                type: 'mentor_assigned'
            });

            // Notify Faculty if assigned
            if (facultyEmail) {
                const facultyUser = await User.findOne({ email: facultyEmail.toLowerCase().trim() });
                if (facultyUser) {
                    const studentName = feedback.student ? feedback.student.name : (feedback.email ? feedback.email.split('@')[0] : 'A student');
                    await Notification.create({
                        userId: facultyUser._id.toString(),
                        role: 'faculty',
                        title: 'New Student Assigned',
                        message: `A new student (${studentName}) has been assigned to you.`,
                        relatedFeedbackId: feedback._id,
                        type: 'assignment'
                    });
                }
            }
        } catch (e) {
            console.error("Notification Error:", e);
        }

        res.json({ message: "Mentor assigned successfully", feedback });
    } catch (error) {
        console.error("Assign Mentor Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.patch('/api/admin/resolve/:feedbackId', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const { feedbackId } = req.params;
        const feedback = await Feedback.findById(feedbackId);

        if (!feedback) return res.status(404).send("Feedback not found");

        feedback.status = 'resolved';
        await feedback.save();

        try {
            let targetUserId = feedback.student ? (feedback.student._id || feedback.student) : (feedback.uid || feedback.email);

            if (typeof targetUserId === 'string' && feedback.email) {
                const currentUser = await User.findOne({ email: feedback.email });
                if (currentUser) {
                    targetUserId = currentUser._id;
                }
            }

            await Notification.create({
                userId: targetUserId.toString(),
                role: 'student',
                title: 'Request Resolved',
                message: `Your support request has been marked as resolved.`,
                relatedFeedbackId: feedback._id,
                type: 'request_resolved'
            });
        } catch (e) {
            console.error("Notification Error:", e);
        }

        res.json({ message: "Request resolved", feedback });
    } catch (error) {
        console.error("Resolve Request Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// GET all counselling sessions for all students (admin only)
app.get('/api/admin/counselling-sessions', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const sessions = await CounsellingSession.find()
            .populate('student_id', 'name email')
            .populate('faculty_id', 'name email')
            .sort({ session_date: -1 });

        // Fetch student details for additional info (department, regno)
        const emails = sessions.map(s => s.student_id?.email).filter(Boolean);
        const detailsList = await StudentDetails.find({ email: { $in: emails } });
        const detailsMap = detailsList.reduce((acc, d) => {
            acc[d.email.toLowerCase().trim()] = d;
            return acc;
        }, {});

        const data = sessions.map(s => {
            const email = (s.student_id?.email || "").toLowerCase().trim();
            const details = detailsMap[email];
            const sessionObj = s.toObject();
            if (sessionObj.student_id) {
                sessionObj.student_id.regno = details ? details.regno : 'N/A';
                sessionObj.student_id.department = details ? details.department : 'N/A';
            }
            return sessionObj;
        });

        res.json(data);
    } catch (error) {
        console.error("Fetch Admin Sessions Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.get('/api/mentors', authenticateToken, async (req, res) => {
    try {
        const mentors = await Mentor.find({ active: true }).sort({ name: 1 });
        res.json(mentors);
    } catch (error) {
        console.error("Fetch Mentors Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.post('/api/mentors', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const { name, email, department } = req.body;
        const newMentor = new Mentor({ name, email, department });
        await newMentor.save();
        res.status(201).json(newMentor);
    } catch (error) {
        console.error("Add Mentor Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// --- Faculty Endpoints ---

// GET all faculty users (admin only, for assignment dropdown)
app.get('/api/faculty-users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const facultyUsers = await User.find({ role: 'faculty' }, '-password').sort({ name: 1 });
        res.json(facultyUsers);
    } catch (error) {
        console.error("Fetch Faculty Users Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// GET students allocated to the logged-in faculty
app.get('/api/faculty/my-students', authenticateToken, async (req, res) => {
    if (req.user.role !== 'faculty') return res.sendStatus(403);
    try {
        // Get faculty user's email
        const facultyUser = await User.findById(req.user.id);
        if (!facultyUser) return res.status(404).json({ message: "Faculty user not found" });

        const facultyEmail = facultyUser.email.toLowerCase().trim();

        // Find all feedbacks assigned to this faculty
        const feedbacks = await Feedback.find({ assignedFacultyEmail: facultyEmail })
            .populate('student', 'name email')
            .sort({ timestamp: -1 });
        
        console.log(`[Faculty] Found ${feedbacks.length} feedbacks for ${facultyEmail}`);

        // Get all student details for enrichment
        const allStudentDetails = await StudentDetails.find({});
        const detailsMap = {};
        allStudentDetails.forEach(d => {
            if (d.email) detailsMap[d.email.toLowerCase().trim()] = d;
        });

        const data = feedbacks.map(f => {
            const studentEmail = (f.student ? f.student.email : f.email || "").toLowerCase().trim();
            const studentName = f.student ? f.student.name : (f.email ? f.email.split('@')[0] : 'Unknown');
            
            // Robust lookup
            let details = studentEmail ? detailsMap[studentEmail] : null;
            if (!details && studentEmail) {
                const prefix = studentEmail.split('@')[0];
                const matchEmail = Object.keys(detailsMap).find(e => e.startsWith(prefix + '@'));
                if (matchEmail) details = detailsMap[matchEmail];
            }

            return {
                id: f._id,
                ...f.toObject(),
                studentName: details ? details.name : studentName,
                studentEmail: studentEmail,
                studentDetails: details ? {
                    regno: details.regno,
                    department: details.department,
                    batch: details.batch,
                    mobile: details.mobile,
                    place: details.place
                } : null,
                studentId: f.student ? (f.student._id || f.student) : (f.uid || f.email)
            };
        });

        res.json(data);
    } catch (error) {
        console.error("Faculty My Students Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// PATCH update case status, time slot, venue (faculty only)
app.patch('/api/faculty/update-case/:feedbackId', authenticateToken, async (req, res) => {
    if (req.user.role !== 'faculty') return res.sendStatus(403);
    try {
        const { feedbackId } = req.params;
        const { status, meetingTimeSlot, meetingVenue, meetingMode, faculty_feedback } = req.body;

        // Verify faculty ownership
        const facultyUser = await User.findById(req.user.id);
        const feedback = await Feedback.findById(feedbackId);

        if (!feedback) return res.status(404).json({ message: "Feedback not found" });

        const feedbackFacultyEmail = (feedback.assignedFacultyEmail || "").toLowerCase().trim();
        const loggedInFacultyEmail = (facultyUser.email || "").toLowerCase().trim();

        // RESILIENT AUTH: Only block if assignedFacultyEmail is PRESENT and MISMATCHED
        // If it's null (old case or failed assignment), we allow the update for now
        if (feedback.assignedFacultyEmail && feedbackFacultyEmail !== loggedInFacultyEmail) {
            console.warn(`Blocked update: Faculty ${loggedInFacultyEmail} tried to update case assigned to ${feedbackFacultyEmail}`);
            return res.status(403).json({ message: "Not authorized to update this case" });
        }

        const updateData = {};
        if (status) updateData.status = status;
        if (meetingTimeSlot !== undefined) updateData.meetingTimeSlot = meetingTimeSlot;
        if (meetingVenue !== undefined) updateData.meetingVenue = meetingVenue;
        if (meetingMode !== undefined) updateData.meetingMode = meetingMode;
        if (faculty_feedback !== undefined) updateData.faculty_feedback = faculty_feedback;

        const updated = await Feedback.findByIdAndUpdate(feedbackId, updateData, { new: true });

        // Notify student of updates
        try {
            let targetUserId = feedback.student || feedback.uid;
            if (typeof targetUserId === 'string' && feedback.email) {
                const stu = await User.findOne({ email: feedback.email });
                if (stu) targetUserId = stu._id;
            }

            if (targetUserId) {
                const statusLabels = { ongoing: 'Ongoing', resolved: 'Resolved' };
                let msg = `Your support case status has been updated to: ${statusLabels[status] || status}.`;

                if (meetingTimeSlot || meetingVenue) {
                    const timeStr = meetingTimeSlot ? new Date(meetingTimeSlot).toLocaleString() : 'TBD';
                    const venueStr = meetingVenue || 'TBD';
                    const facultyName = feedback.assignedFacultyName || feedback.assignedMentor || 'Your Faculty Mentor';
                    msg = `Meeting scheduled by ${facultyName}: ${timeStr} at ${venueStr}. Status: ${statusLabels[status] || status}.`;
                }

                await Notification.create({
                    userId: targetUserId.toString(),
                    role: 'student',
                    title: 'Case Update from Faculty',
                    message: msg,
                    relatedFeedbackId: feedback._id,
                    type: 'status_update'
                });
            }
        } catch (e) {
            console.error("Notification Error:", e);
        }

        res.json({ message: "Case updated successfully", feedback: updated });
    } catch (error) {
        console.error("Faculty Update Case Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// PATCH update SOS adoption status (student only)
app.patch('/api/feedback/sos-adoption/:id', authenticateToken, async (req, res) => {
    try {
        const { sos_adoption } = req.body;
        if (!['Adopted', 'Not Adopted', 'Pending'].includes(sos_adoption)) {
            return res.status(400).json({ message: "Invalid SOS adoption status" });
        }

        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) return res.status(404).json({ message: "Feedback not found" });

        // Ensure the student owns this feedback
        if (feedback.student.toString() !== req.user.id && feedback.uid !== req.user.id) {
            return res.sendStatus(403);
        }

        feedback.sos_adoption = sos_adoption;
        await feedback.save();

        res.json({ message: "SOS adoption status updated", feedback });
    } catch (error) {
        console.error("SOS Adoption Update Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// --- Counselling Management Endpoints ---

// Add new counselling session
app.post('/api/counselling-sessions', authenticateToken, async (req, res) => {
    if (req.user.role !== 'faculty') return res.sendStatus(403);
    try {
        const { 
            student_id, 
            session_date, 
            session_mode, 
            venue, 
            concern, 
            discussion_summary, 
            advice, 
            action_plan, 
            next_followup_date, 
            session_status, 
            emotion_level,
            faculty_feedback 
        } = req.body;
        
        // Basic validation: Verify student exists and (optional) check assignment
        const student = await User.findById(student_id);
        if (!student) return res.status(404).json({ message: "Student not found" });

        const newSession = new CounsellingSession({
            student_id,
            faculty_id: req.user.id,
            session_date,
            session_mode,
            venue,
            concern,
            discussion_summary,
            advice,
            action_plan,
            next_followup_date,
            session_status,
            emotion_level: emotion_level || 3,
            faculty_feedback
        });
        
        await newSession.save();

        // Automation: If session status is "Completed", update corresponding case status to "resolved"
        if (session_status === 'Completed') {
            await Feedback.findOneAndUpdate(
                { student: student_id, assignedFacultyEmail: req.user.email, status: { $ne: 'resolved' } },
                { status: 'resolved' }
            );
        }

        res.status(201).json(newSession);
    } catch (error) {
        console.error("Add Counselling Session Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Get session history for a student
app.get('/api/counselling-sessions/student/:studentId', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        const sessions = await CounsellingSession.find({ student_id: studentId })
            .sort({ session_date: -1 });
        res.json(sessions);
    } catch (error) {
        console.error("Fetch Student Sessions Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Get all sessions for follow-up reminders (faculty only)
app.get('/api/counselling-sessions/all-allocated', authenticateToken, async (req, res) => {
    if (req.user.role !== 'faculty') return res.sendStatus(403);
    try {
        const sessions = await CounsellingSession.find({ faculty_id: req.user.id })
            .populate('student_id', 'name email regno')
            .sort({ next_followup_date: 1 });
            
        // Fetch student details to get department
        const emails = sessions.map(s => s.student_id?.email).filter(Boolean);
        const detailsList = await StudentDetails.find({ email: { $in: emails } });
        const detailsMap = detailsList.reduce((acc, d) => {
            acc[d.email.toLowerCase().trim()] = d;
            return acc;
        }, {});

        const data = sessions.map(s => {
            const email = (s.student_id?.email || "").toLowerCase().trim();
            const details = detailsMap[email];
            const sessionObj = s.toObject();
            if (sessionObj.student_id) {
                sessionObj.student_id.regno = details ? details.regno : (sessionObj.student_id.regno || 'N/A');
                sessionObj.student_id.department = details ? details.department : 'N/A';
            }
            return sessionObj;
        });

        res.json(data);
    } catch (error) {
        console.error("Fetch Allocated Sessions Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Get personal counselling history (student only)
app.get('/api/my-counselling-progress', authenticateToken, async (req, res) => {
    if (req.user.role !== 'student') return res.sendStatus(403);
    try {
        const sessions = await CounsellingSession.find({ student_id: req.user.id })
            .populate('faculty_id', 'name email')
            .sort({ session_date: -1 });
        res.json(sessions);
    } catch (error) {
        console.error("Fetch Student Progress Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Delete a counselling session
app.delete('/api/counselling-sessions/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'faculty') return res.sendStatus(403);
    try {
        const session = await CounsellingSession.findOneAndDelete({ 
            _id: req.params.id, 
            faculty_id: req.user.id 
        });
        if (!session) return res.status(404).json({ message: "Session not found or unauthorized" });
        res.sendStatus(204);
    } catch (error) {
        console.error("Delete Counselling Session Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Update a counselling session
app.patch('/api/counselling-sessions/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'faculty') return res.sendStatus(403);
    try {
        const { id } = req.params;
        const updated = await CounsellingSession.findOneAndUpdate(
            { _id: id, faculty_id: req.user.id },
            req.body,
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: "Session not found or unauthorized" });

        // Automation: If session status is updated to "Completed", update corresponding case status to "resolved"
        if (req.body.session_status === 'Completed') {
            await Feedback.findOneAndUpdate(
                { student: updated.student_id, assignedFacultyEmail: req.user.email, status: { $ne: 'resolved' } },
                { status: 'resolved' }
            );
        }

        res.json(updated);
    } catch (error) {
        console.error("Update Counselling Session Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.use((err, req, res, next) => {
    console.error("🔥 Global Error:", err.stack);
    res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on PORT ${PORT}`);
    console.log(`👉 Health check: http://localhost:${PORT}/api/health`);
});