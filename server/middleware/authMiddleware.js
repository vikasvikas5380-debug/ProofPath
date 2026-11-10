const jwt = require("jsonwebtoken");
const User = require("../models/User");

// AUTHENTICATE USER
const protect = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer ")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized. Please login."
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "User not found or account inactive."
            });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error("AUTH MIDDLEWARE ERROR:", error);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
};


// AUTHORIZE USER ROLE
const authorizeRoles = (...roles) => {
    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You do not have permission."
            });
        }

        next();
    };
};


module.exports = {
    protect,
    authorizeRoles
};