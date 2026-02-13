const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Try to catch synchronous errors
try {
    const User = require('./models/User');
    const Mentor = require('./models/Mentor');
    const authRoutes = require('./routes/auth');

    dotenv.config();

    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api', authRoutes);

    console.log("Modules loaded successfully.");

    // MongoDB Connection
    mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student_feedback')
        .then(() => console.log('MongoDB Connected'))
        .catch(err => console.error('MongoDB Connection Error:', err));

    const PORT = process.env.PORT || 5002;
    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.error('Address in use, retrying...');
            setTimeout(() => {
                server.close();
                server.listen(PORT + 1);
            }, 1000);
        } else {
            console.error("Server Error:", e);
        }
    });

} catch (error) {
    console.error("CRITICAL ERROR:", error);
}
