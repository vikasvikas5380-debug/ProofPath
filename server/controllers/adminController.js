const mongoose = require("mongoose");
const User = require("../models/User");
const Evidence = require("../models/Evidence");

// GET ADMIN DASHBOARD STATISTICS
const getDashboardStats = async (req, res) => {
try {
const [
totalUsers,
activeUsers,
inactiveUsers,
totalEvidence,
userRoles,
evidenceStatuses
] = await Promise.all([
User.countDocuments(),
User.countDocuments({ isActive: true }),
User.countDocuments({ isActive: false }),
Evidence.countDocuments(),

        User.aggregate([
            {
                $group: {
                    _id: "$role",
                    count: { $sum: 1 }
                }
            }
        ]),

        Evidence.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ])
    ]);

    const roleStats = {
        user: 0,
        investigator: 0,
        admin: 0
    };

    userRoles.forEach((item) => {
        roleStats[item._id] = item.count;
    });

    const evidenceStats = {
        pending: 0,
        verified: 0,
        approved: 0,
        rejected: 0
    };

    evidenceStatuses.forEach((item) => {
        evidenceStats[item._id] = item.count;
    });

    return res.status(200).json({
        success: true,
        dashboard: {
            users: {
                total: totalUsers,
                active: activeUsers,
                inactive: inactiveUsers,
                byRole: roleStats
            },
            evidence: {
                total: totalEvidence,
                byStatus: evidenceStats
            }
        }
    });

} catch (error) {
    console.error("Admin dashboard error:", error);

    return res.status(500).json({
        success: false,
        message: "Server error while retrieving dashboard statistics"
    });
}

};

// GET ALL USERS
const getAllUsers = async (req, res) => {
try {
const users = await User.find()
.select("-password")
.sort({ createdAt: -1 });

    return res.status(200).json({
        success: true,
        count: users.length,
        users
    });

} catch (error) {
    console.error("Get all users error:", error);

    return res.status(500).json({
        success: false,
        message: "Server error while retrieving users"
    });
}

};

// ACTIVATE OR DEACTIVATE USER
const updateUserStatus = async (req, res) => {
try {
const { id } = req.params;
const { isActive } = req.body;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid user ID"
        });
    }

    if (typeof isActive !== "boolean") {
        return res.status(400).json({
            success: false,
            message: "isActive must be true or false"
        });
    }

    // Prevent admin from deactivating their own account
    if (id === req.user._id.toString() && !isActive) {
        return res.status(400).json({
            success: false,
            message: "You cannot deactivate your own account"
        });
    }

    const user = await User.findById(id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    user.isActive = isActive;
    await user.save();

    return res.status(200).json({
        success: true,
        message: `User ${isActive ? "activated" : "deactivated"} successfully`,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        }
    });

} catch (error) {
    console.error("Update user status error:", error);

    return res.status(500).json({
        success: false,
        message: "Server error while updating user status"
    });
}

};

// EXPORT CONTROLLERS
module.exports = {
getDashboardStats,
getAllUsers,
updateUserStatus
};