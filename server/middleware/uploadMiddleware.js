const multer = require("multer");

// Store files temporarily in memory
const storage = multer.memoryStorage();

// Allowed file types
const allowedTypes = [
"image/jpeg",
"image/png",
"image/webp",
"video/mp4",
"application/pdf",
"text/plain"
];

// Configure Multer
const upload = multer({
storage: storage,

limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
    files: 1
},

fileFilter: (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Unsupported file type. Allowed: JPG, PNG, WEBP, MP4, PDF and TXT."));
    }
}

});

// Handle upload errors
const handleUpload = (req, res, next) => {
upload.single("evidence")(req, res, (error) => {
if (error instanceof multer.MulterError) {
return res.status(400).json({
success: false,
message: error.code === "LIMIT_FILE_SIZE"
? "File size must not exceed 50 MB."
: error.message
});
}

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    next();
});

};

module.exports = handleUpload;