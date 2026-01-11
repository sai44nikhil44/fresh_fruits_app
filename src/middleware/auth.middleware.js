const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split(" ")[1];
        console.log("token: ", token);

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("decoded: ", decoded);

        req.user = {
            id: decoded.userId
        };
        console.log("user decoded: ", req.user);

        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};