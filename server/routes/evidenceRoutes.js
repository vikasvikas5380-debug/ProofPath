const express = require("express");

const {
protect,
authorizeRoles
} = require("../middleware/authMiddleware");

const handleUpload = require("../middleware/uploadMiddleware");

const {
createEvidence,
verifyEvidence,
getMyEvidence,
getEvidenceById,
getPublicEvidenceVerification
} = require("../controllers/evidenceController");

const {
getEvidenceHistory
} = require("../controllers/historyController");

const {
getAllEvidence,
reviewEvidence
} = require("../controllers/investigatorController");

const router = express.Router();

// PUBLIC QR CODE VERIFICATION
// No login required
router.get(
"/public/verify/:token",
getPublicEvidenceVerification
);

// Register new evidence
router.post("/", protect, handleUpload, createEvidence);

// Get all evidence belonging to logged-in user
router.get("/my-evidence", protect, getMyEvidence);

// Investigator and Admin dashboard
router.get(
"/all",
protect,
authorizeRoles("investigator", "admin"),
getAllEvidence
);

// Verify existing evidence
router.post(
"/:id/verify",
protect,
handleUpload,
verifyEvidence
);

// Investigator and Admin review evidence
router.patch(
"/:id/review",
protect,
authorizeRoles("investigator", "admin"),
reviewEvidence
);

// Get evidence history
router.get(
"/:id/history",
protect,
getEvidenceHistory
);

// Get individual evidence details
router.get(
"/:id",
protect,
getEvidenceById
);

module.exports = router;
