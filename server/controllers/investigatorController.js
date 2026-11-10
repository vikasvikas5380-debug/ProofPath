const mongoose = require("mongoose");
const Evidence = require("../models/Evidence");

// GET ALL EVIDENCE FOR INVESTIGATOR DASHBOARD
const getAllEvidence = async (req, res) => {
try {
const evidence = await Evidence.find()
.populate("submittedBy", "name email role")
.sort({ createdAt: -1 });

    return res.status(200).json({
        success: true,
        count: evidence.length,
        evidence
    });

} catch (error) {
    console.error("Get all evidence error:", error);

    return res.status(500).json({
        success: false,
        message: "Server error while retrieving evidence"
    });
}

};

// APPROVE OR REJECT EVIDENCE
const reviewEvidence = async (req, res) => {
try {
const { id } = req.params;
const { decision, remarks } = req.body;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid evidence ID"
        });
    }

    if (!["approved", "rejected"].includes(decision)) {
        return res.status(400).json({
            success: false,
            message: "Decision must be approved or rejected"
        });
    }

    const evidence = await Evidence.findById(id);

    if (!evidence) {
        return res.status(404).json({
            success: false,
            message: "Evidence not found"
        });
    }

    if (evidence.status === "approved" || evidence.status === "rejected") {
        return res.status(409).json({
            success: false,
            message: "This evidence has already been reviewed"
        });
    }

    // Update evidence status
    evidence.status = decision;

    // Record investigator decision
    evidence.history.push({
        action: decision === "approved"
            ? "EVIDENCE_APPROVED"
            : "EVIDENCE_REJECTED",

        performedBy: req.user._id,

        details: remarks?.trim() ||
            `Evidence ${decision} by investigator.`
    });

    await evidence.save();

    return res.status(200).json({
        success: true,
        message: `Evidence ${decision} successfully`,
        evidence
    });

} catch (error) {
    console.error("Evidence review error:", error);

    return res.status(500).json({
        success: false,
        message: "Server error while reviewing evidence"
    });
}

};

module.exports = {
getAllEvidence,
reviewEvidence
};