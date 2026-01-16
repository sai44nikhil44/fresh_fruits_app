const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const cartController = require("../controllers/cart.controller");

router.post("/", auth, cartController.addToCart);
router.get("/", auth, cartController.getCart);
router.put("/", auth, cartController.updateCartItem);
router.delete("/:itemId", auth, cartController.removeCartItem);

module.exports = router;
