const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const db = mongoose.connection.db;
    const cs = await db.collection('counsellingsessions').find({ session_date: "2026-03-18" }).toArray();
    console.log("Found sessions:", JSON.stringify(cs, null, 2));

    if (cs.length > 0) {
        for (const session of cs) {
            await db.collection('counsellingsessions').updateOne(
                { _id: session._id },
                { $set: { session_date: "2026-03-14" } }
            );
            console.log("Updated session", session._id, "to 2026-03-14");
        }
    } else {
        console.log("No sessions found to update.");
    }

    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
