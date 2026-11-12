const mongoose = require("mongoose");
const crypto = require("crypto");

// Evidence activity history
const historySchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true
        },

        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        details: {
            type: String
        },

        fileHash: {
            type: String
        },

        timestamp: {
            type: Date,
            default: Date.now
        }
    },
    { _id: true }
);

// Main evidence schema
const evidenceSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Evidence title is required"],
            trim: true
        },

        description: {
            type: String,
            required: [true, "Evidence description is required"],
            trim: true
        },

        fileName: {
            type: String,
            required: [true, "File name is required"]
        },

        fileUrl: {
            type: String,
            required: [true, "File URL is required"]
        },

        cloudinaryPublicId: {
            type: String
        },

        cloudinaryResourceType: {
            type: String
        },

        fileType: {
            type: String,
            required: [true, "File type is required"]
        },

        fileHash: {
            type: String,
            required: [true, "File hash is required"],
            unique: true
        },

        // Unique public QR verification token
        verificationToken: {
            type: String,
            required: true,
            unique: true,
            default: () => crypto.randomBytes(32).toString("hex")
        },

        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        status: {
            type: String,
            enum: ["pending", "verified", "approved", "rejected"],
            default: "pending"
        },

        // Chain of custody
        history: {
            type: [historySchema],
            default: []
        }
    },
    {
        timestamps: true
    }
);

const Evidence = mongoose.model("Evidence", evidenceSchema);

module.exports = Evidence;