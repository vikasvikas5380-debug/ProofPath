const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
            default: "EVIDENCE_DELETED"
        },
        evidenceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true
        },
        evidenceTitle: {
            type: String,
            required: true
        },
        fileName: {
            type: String
        },
        fileHash: {
            type: String
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        performerRole: {
            type: String,
            required: true
        },
        performerEmail: {
            type: String
        },
        details: {
            type: String
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
