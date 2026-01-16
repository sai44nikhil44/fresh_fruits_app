const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const isAdmin = require("../middlewares/admin.middleware");
const controller = require("../controllers/admin.order.controller");

router.get("/", auth, isAdmin, controller.getAllOrders);
router.get("/:id", auth, isAdmin, controller.getOrderById);
router.put("/:id/status", auth, isAdmin, controller.updateOrderStatus);

module.exports = router;
