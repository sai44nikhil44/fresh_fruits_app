const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const addressController = require("../controllers/address.controller");

router.post("/", authMiddleware, addressController.addAddress);
router.get("/", authMiddleware, addressController.getAddresses);
router.delete("/:id", authMiddleware, addressController.deleteAddress);

module.exports = router;