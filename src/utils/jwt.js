const jwt = require("jsonwebtoken");

function generateToken(payload) {
    console.log("secret code", process.env.JWT_SECRET);
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
}

module.exports = { generateToken };