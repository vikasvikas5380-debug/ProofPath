const express = require("express");

const {
    protect,
    authorizeRoles
} = require("../middleware/authMiddleware");

const {
    getDashboardStats,
    getAllUsers,
    createUser,
    updateUserRole,
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

// Get registered users (supports ?role=user|investigator|admin)
router.get(
    "/users",
    protect,
    authorizeRoles("admin"),
    getAllUsers
);

// Admin creates user / investigator account
router.post(
    "/users",
    protect,
    authorizeRoles("admin"),
    createUser
);

// Admin updates user role
router.patch(
    "/users/:id/role",
    protect,
    authorizeRoles("admin"),
    updateUserRole
);

// Activate or deactivate a user
router.patch(
    "/users/:id/status",
    protect,
    authorizeRoles("admin"),
    updateUserStatus
);

module.exports = router;
