const jwt = require("jsonwebtoken");
const SECRET = "your_super_secret_key"; // In production, use process.env.JWT_SECRET

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (!token) return res.status(401).json({ error: "Access Denied: No Token" });

    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid Token" });
        req.user = user; // Attach user data (id) to the request
        next();
    });
};
const requireAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
    }

    next();
};

module.exports = { authenticateToken, requireAdmin, SECRET };
