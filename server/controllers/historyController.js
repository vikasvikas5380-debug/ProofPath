    const mongoose = require("mongoose");
    const Evidence = require("../models/Evidence");

    // GET EVIDENCE HISTORY
    const getEvidenceHistory = async (req, res) => {
    try {
    const { id } = req.params;


        // Validate evidence ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid evidence ID"
            });
        }

        // Find evidence belonging to logged-in user
        const evidence = await Evidence.findOne({
            _id: id,
            submittedBy: req.user._id
        });

        if (!evidence) {
            return res.status(404).json({
                success: false,
                message: "Evidence not found"
            });
        }

        // Return history in chronological order
        const history = [...evidence.history].sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );

        return res.status(200).json({
            success: true,
            evidenceId: evidence._id,
            evidenceTitle: evidence.title,
            totalActivities: history.length,
            history
        });

    } catch (error) {
        console.error("Evidence history error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while retrieving evidence history"
        });
    }


    };

    module.exports = { getEvidenceHistory };
