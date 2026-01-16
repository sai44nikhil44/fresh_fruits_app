const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const orderController = require("../controllers/order.controller");

router.post("/", auth, orderController.placeOrder);
router.get("/", auth, orderController.getMyOrders);
router.get("/:id", auth, orderController.getOrderById);

module.exports = router;
