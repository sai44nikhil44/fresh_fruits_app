const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/auth.middleware");
const isAdmin = require("../middleware/admin.middleware");
const controller = require("../controllers/admin.product.controller");

router.post("/", verifyToken, isAdmin, controller.createProduct);
router.put("/:id", verifyToken, isAdmin, controller.updateProduct);
router.delete("/:id", verifyToken, isAdmin, controller.disableProduct);

module.exports = router;