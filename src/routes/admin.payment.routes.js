const express = require("express");
const router = express.Router();

const controller = require("../controllers/admin.payment.controller");
const auth = require("../middlewares/auth.middleware");
const admin = require("../middlewares/admin.middleware");

router.get("/", auth, admin, controller.getAllPayments);

module.exports = router;
