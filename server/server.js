const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Authentication routes
app.use("/api/auth", require("./routes/authRoutes"));

// Evidence routes
app.use("/api/evidence", require("./routes/evidenceRoutes"));

// Admin routes
app.use("/api/admin", require("./routes/adminRoutes"));

// Welcome API
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Welcome to ProofPath API",
        version: "1.0.0"
    });
});

// Health Check API
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "ProofPath server is running"
    });
});

// Start server
const startServer = async () => {
    await connectDB();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log(`ProofPath server running on port ${PORT}`);
    });
};

startServer();