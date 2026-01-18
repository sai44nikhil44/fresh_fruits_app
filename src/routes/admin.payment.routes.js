const express = require("express");
const router = express.Router();

const { getAllPayments } = require("../controllers/admin.payment.controller");
const auth = require("../middlewares/auth.middleware");
const admin = require("../middlewares/admin.middleware");

router.get("/payments", auth, admin, getAllPayments);

module.exports = router;
