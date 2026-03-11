
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const studentDetailsSchema = new mongoose.Schema({
    email: String,
    regno: String,
    mobile: String
}, { strict: false });

const StudentDetails = mongoose.model('StudentDetails', studentDetailsSchema, 'studentdetails');

async function inspect() {
    await mongoose.connect(MONGO_URI);

    const searchEmail = "karthika.cb23@bitsathy.ac.in";
    const found = await StudentDetails.find({
        $or: [
            { email: searchEmail },
            { mobile: "9042414606" }
        ]
    });

    console.log("--- CONFLICT SEARCH RESULTS ---");
    if (found.length === 0) {
        console.log("No matching records found for email or mobile.");
    } else {
        found.forEach(s => {
            console.log(JSON.stringify(s.toObject(), null, 2));
        });
    }

    await mongoose.disconnect();
}

inspect().catch(err => {
    console.error(err);
    process.exit(1);
});
