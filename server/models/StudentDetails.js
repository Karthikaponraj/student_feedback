const mongoose = require('mongoose');

const studentDetailsSchema = new mongoose.Schema({
    name: { type: String, required: true },
    regno: { type: String, required: true },
    department: { type: String, required: true },
    batch: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    place: { type: String, required: true },
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudentDetails', studentDetailsSchema);
