const express = require("express");

const {
protect,
authorizeRoles
} = require("../middleware/authMiddleware");

const {
getDashboardStats,
getAllUsers,
updateUserStatus
} = require("../controllers/adminController");

const router = express.Router();

// Admin dashboard statistics
router.get(
"/stats",
protect,
authorizeRoles("admin"),
getDashboardStats
);

// Get all registered users
router.get(
"/users",
protect,
authorizeRoles("admin"),
getAllUsers
);

// Activate or deactivate a user
router.patch(
"/users/:id/status",
protect,
authorizeRoles("admin"),
updateUserStatus
);

module.exports = router;
