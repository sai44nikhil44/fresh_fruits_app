const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");

// Public APIs
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);

module.exports = router;
