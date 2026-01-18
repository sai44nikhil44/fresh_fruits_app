require("dotenv").config();
const express = require("express");
const pool = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const addressRoutes = require("./routes/address.routes");
const productRoutes = require("./routes/product.routes");
const adminProductRoutes = require("./routes/admin.product.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");
const adminOrderRoutes = require("./routes/admin.order.routes");
const paymentRoutes = require("./routes/payment.routes");
const path = require("path");
const cors = require("cors");
const adminPaymentRoutes = require("./routes/admin.payment.routes");

const app = express();

console.log("Serving static from:", path.join(__dirname, "..", "public"));
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend running");
});

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      db: "connected",
      time: result.rows[0],
    });
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB Connection failed" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin/payments", adminPaymentRoutes);

app.use(cors({
  origin: "*", // OK for now (later restrict)
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

module.exports = app;
