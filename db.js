const mongoose = require("mongoose");

if (process.env.MONGODB_DNS_OVERRIDE === "true") {
    const dns = require("dns");
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);

        console.log("MongoDB connected");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        throw err;
    }
};

module.exports = {
    connectDB
};