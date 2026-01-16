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

const app = express();
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

module.exports = app;
