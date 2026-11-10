const crypto = require("crypto");
const mongoose = require("mongoose");

const Evidence = require("../models/Evidence");
const cloudinary = require("../config/cloudinary");

// CREATE EVIDENCE
const createEvidence = async (req, res) => {
    let uploadedFile = null;

    try {
        const { title, description } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: "Please provide title and description"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload an evidence file"
            });
        }

        // Generate SHA-256 hash
        const fileHash = crypto
            .createHash("sha256")
            .update(req.file.buffer)
            .digest("hex");

        // Check duplicate evidence
        const existingEvidence = await Evidence.findOne({ fileHash });

        if (existingEvidence) {
            return res.status(409).json({
                success: false,
                message: "This file has already been registered",
                fileHash
            });
        }

        // Upload file to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "proofpath/evidence",
                    resource_type: "auto"
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            uploadStream.end(req.file.buffer);
        });

        uploadedFile = uploadResult;

        // Create evidence with initial history
        const evidence = await Evidence.create({
            title: title.trim(),
            description: description.trim(),
            fileName: req.file.originalname,
            fileUrl: uploadResult.secure_url,
            fileType: req.file.mimetype,
            fileHash,
            submittedBy: req.user._id,

            history: [
                {
                    action: "EVIDENCE_UPLOADED",
                    performedBy: req.user._id,
                    details: "Evidence uploaded and SHA-256 hash registered.",
                    fileHash
                }
            ]
        });

        return res.status(201).json({
            success: true,
            message: "Evidence registered successfully",
            evidence
        });

    } catch (error) {
        console.error("Evidence creation error:", error);

        if (uploadedFile?.public_id) {
            try {
                await cloudinary.uploader.destroy(
                    uploadedFile.public_id,
                    {
                        resource_type: uploadedFile.resource_type
                    }
                );
            } catch (cleanupError) {
                console.error("Cloudinary cleanup error:", cleanupError.message);
            }
        }

        return res.status(500).json({
            success: false,
            message: "Server error while registering evidence"
        });
    }
};


// VERIFY EVIDENCE
const verifyEvidence = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid evidence ID"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload a file for verification"
            });
        }

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

        // Generate uploaded file hash
        const uploadedHash = crypto
            .createHash("sha256")
            .update(req.file.buffer)
            .digest("hex");

        // Compare hashes
        const isAuthentic = uploadedHash === evidence.fileHash;
        // Update evidence status
evidence.status = isAuthentic ? "verified" : "pending";

        // Record verification attempt
        evidence.history.push({
            action: isAuthentic
                ? "EVIDENCE_VERIFIED"
                : "VERIFICATION_FAILED",

            performedBy: req.user._id,

            details: isAuthentic
                ? "Uploaded file matches the registered SHA-256 hash."
                : "Uploaded file does not match the registered SHA-256 hash.",

            fileHash: uploadedHash
        });

        await evidence.save();

        return res.status(200).json({
            success: true,

            message: isAuthentic
                ? "Evidence verified successfully. File is unchanged."
                : "Evidence verification failed. File has been modified or does not match.",

            verification: {
                evidenceId: evidence._id,
                originalHash: evidence.fileHash,
                uploadedHash,
                isAuthentic,
                status: isAuthentic ? "verified" : "mismatch"
            },

            history: evidence.history
        });

    } catch (error) {
        console.error("Evidence verification error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error during evidence verification"
        });
    }
};


// GET ALL EVIDENCE BELONGING TO LOGGED-IN USER
const getMyEvidence = async (req, res) => {
    try {
        const evidence = await Evidence.find({
            submittedBy: req.user._id
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: evidence.length,
            evidence
        });

    } catch (error) {
        console.error("Get evidence error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while retrieving evidence"
        });
    }
};


// GET SINGLE EVIDENCE BY ID
const getEvidenceById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid evidence ID"
            });
        }

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

        return res.status(200).json({
            success: true,
            evidence
        });

    } catch (error) {
        console.error("Get evidence details error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while retrieving evidence details"
        });
    }
};

// PUBLIC QR CODE VERIFICATION
const getPublicEvidenceVerification = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
            return res.status(400).json({
                success: false,
                message: "Invalid verification token"
            });
        }

        const evidence = await Evidence.findOne({
            verificationToken: token
        }).select(
            "title fileName fileType fileHash status createdAt updatedAt"
        );

        if (!evidence) {
            return res.status(404).json({
                success: false,
                message: "Evidence record not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Registered evidence record found",
            verification: {
                evidenceId: evidence._id,
                title: evidence.title,
                fileName: evidence.fileName,
                fileType: evidence.fileType,
                fileHash: evidence.fileHash,
                status: evidence.status,
                registeredAt: evidence.createdAt,
                lastUpdatedAt: evidence.updatedAt,
                recordExists: true
            }
        });

    } catch (error) {
        console.error("Public evidence verification error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error during public verification"
        });
    }
};

module.exports = {
    createEvidence,
    verifyEvidence,
    getMyEvidence,
    getEvidenceById,
    getPublicEvidenceVerification
};