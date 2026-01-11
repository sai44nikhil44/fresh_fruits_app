const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const userController = require("../controllers/user.controller");

router.get("/me", authMiddleware, userController.getMe);
router.put("/me", authMiddleware, userController.updateMe);
router.delete("/me", authMiddleware, userController.deleteMe);

module.exports = router;