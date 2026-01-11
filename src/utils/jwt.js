const jwt = require("jsonwebtoken");

function generateToken(payload) {
    console.log("secret code", process.env.JWT_SECRET);
    console.log("payload:", payload);
    let token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
    return token;
}

module.exports = { generateToken };