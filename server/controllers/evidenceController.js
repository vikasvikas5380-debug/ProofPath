const crypto = require("crypto");
const mongoose = require("mongoose");

const Evidence = require("../models/Evidence");
const AuditLog = require("../models/AuditLog");
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
            cloudinaryPublicId: uploadResult.public_id,
            cloudinaryResourceType: uploadResult.resource_type,
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

// HELPER: EXTRACT CLOUDINARY RESOURCE TYPE AND PUBLIC ID
const getCloudinaryDetails = (evidence) => {
    if (evidence.cloudinaryPublicId) {
        return {
            publicId: evidence.cloudinaryPublicId,
            resourceType: evidence.cloudinaryResourceType || (evidence.fileType?.startsWith("video/") ? "video" : "image")
        };
    }

    if (!evidence.fileUrl) return null;

    // Pattern: https://res.cloudinary.com/<cloud>/<resource_type>/upload/(?:v\d+/)?<public_id>.<ext>
    const match = evidence.fileUrl.match(/cloudinary\.com\/[^/]+\/([^/]+)\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match) return null;

    const resourceType = match[1];
    let publicId = match[2];

    const lastDot = publicId.lastIndexOf(".");
    if (lastDot !== -1) {
        publicId = publicId.substring(0, lastDot);
    }

    return { resourceType, publicId };
};

// DELETE EVIDENCE (BY OWNER OR ADMIN)
const deleteEvidence = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid evidence ID"
            });
        }

        const evidence = await Evidence.findById(id);

        if (!evidence) {
            return res.status(404).json({
                success: false,
                message: "Evidence record not found"
            });
        }

        // AUTHORIZATION RULES:
        // 1. Investigators are not allowed to delete evidence unless their role is Admin
        // 2. Admin can delete any evidence
        // 3. Normal user can delete only evidence they personally uploaded
        const userRole = req.user.role;
        const isOwner = evidence.submittedBy.toString() === req.user._id.toString();

        if (userRole === "investigator") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Investigators are not authorized to delete evidence records."
            });
        }

        if (userRole !== "admin" && !isOwner) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only delete evidence that you personally uploaded."
            });
        }

        // CLOUDINARY FILE DELETION
        const cloudinaryInfo = getCloudinaryDetails(evidence);
        if (cloudinaryInfo && cloudinaryInfo.publicId) {
            try {
                const cloudResult = await cloudinary.uploader.destroy(
                    cloudinaryInfo.publicId,
                    { resource_type: cloudinaryInfo.resourceType || "image" }
                );

                // If not found as image, attempt raw deletion if applicable
                if (cloudResult?.result === "not found" && cloudinaryInfo.resourceType !== "raw") {
                    await cloudinary.uploader.destroy(
                        cloudinaryInfo.publicId,
                        { resource_type: "raw" }
                    ).catch(() => {});
                }
            } catch (cloudError) {
                console.error("Cloudinary deletion error:", cloudError);
                return res.status(502).json({
                    success: false,
                    message: "Failed to delete file from cloud storage. Evidence record was not removed.",
                    error: cloudError.message
                });
            }
        }

        // ACTIVITY HISTORY / PERSISTENT AUDIT LOG
        await AuditLog.create({
            action: "EVIDENCE_DELETED",
            evidenceId: evidence._id,
            evidenceTitle: evidence.title,
            fileName: evidence.fileName,
            fileHash: evidence.fileHash,
            performedBy: req.user._id,
            performerRole: req.user.role,
            performerEmail: req.user.email,
            details: `Evidence "${evidence.title}" (File: ${evidence.fileName}) permanently deleted by ${req.user.role} (${req.user.email}).`
        });

        // MONGODB DELETION
        await Evidence.findByIdAndDelete(evidence._id);

        return res.status(200).json({
            success: true,
            message: "Evidence and associated cloud file deleted successfully",
            deletedId: evidence._id
        });

    } catch (error) {
        console.error("Delete evidence error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while deleting evidence"
        });
    }
};

module.exports = {
    createEvidence,
    verifyEvidence,
    getMyEvidence,
    getEvidenceById,
    getPublicEvidenceVerification,
    deleteEvidence
};