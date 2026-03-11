
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function run() {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // Search in studentdetails collection
    const conflicting = await db.collection('studentdetails').findOne({
        $or: [
            { email: /karthika/i },
            { mobile: "9042414606" }
        ]
    });

    console.log("--- FOUND CONFLICTING RECORD ---");
    if (conflicting) {
        console.log(JSON.stringify(conflicting, null, 2));

        console.log("Deleting record...");
        const result = await db.collection('studentdetails').deleteOne({ _id: conflicting._id });
        console.log(`Deleted ${result.deletedCount} record(s).`);
    } else {
        console.log("No conflicting record found.");
    }

    await mongoose.disconnect();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
