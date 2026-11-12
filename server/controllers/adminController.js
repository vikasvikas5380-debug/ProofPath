const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
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

// GET ALL USERS (WITH OPTIONAL ROLE FILTER)
const getAllUsers = async (req, res) => {
    try {
        const { role } = req.query;
        const filter = {};

        if (role && role !== "all") {
            const allowedRoles = ["user", "investigator", "admin"];
            const normalizedRole = role.trim().toLowerCase();

            if (!allowedRoles.includes(normalizedRole)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid role filter. Allowed roles: user, investigator, admin"
                });
            }

            filter.role = normalizedRole;
        }

        const users = await User.find(filter)
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

// CREATE USER / INVESTIGATOR BY ADMIN
const createUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields: name, email, password, role"
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address"
            });
        }

        // Validate password length
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters"
            });
        }

        // Validate requested role
        const allowedRoles = ["user", "investigator", "admin"];
        const normalizedRole = role.trim().toLowerCase();
        if (!allowedRoles.includes(normalizedRole)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role. Allowed roles are: user, investigator, admin"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check duplicate email
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: normalizedRole,
            isActive: true
        });

        return res.status(201).json({
            success: true,
            message: `${normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)} account created successfully`,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error("Create user error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while creating user"
        });
    }
};

// CHANGE EXISTING USER ROLE BY ADMIN
const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        if (!role) {
            return res.status(400).json({
                success: false,
                message: "Role is required"
            });
        }

        const allowedRoles = ["user", "investigator", "admin"];
        const normalizedRole = role.trim().toLowerCase();
        if (!allowedRoles.includes(normalizedRole)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role. Allowed roles are: user, investigator, admin"
            });
        }

        // Prevent admin from removing their own admin role
        if (id === req.user._id.toString() && normalizedRole !== "admin") {
            return res.status(400).json({
                success: false,
                message: "You cannot change or remove your own admin role"
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Prevent lock-out: if changing an admin to another role, ensure at least one other active admin exists
        if (user.role === "admin" && normalizedRole !== "admin") {
            const activeAdminCount = await User.countDocuments({
                role: "admin",
                isActive: true,
                _id: { $ne: user._id }
            });

            if (activeAdminCount < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot change role. At least one active administrator is required."
                });
            }
        }

        user.role = normalizedRole;
        await user.save();

        return res.status(200).json({
            success: true,
            message: `User role updated to ${normalizedRole} successfully`,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            }
        });

    } catch (error) {
        console.error("Update user role error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while updating user role"
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
    createUser,
    updateUserRole,
    updateUserStatus
};
