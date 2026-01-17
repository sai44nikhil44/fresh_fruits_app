const pool = require("../config/db");

/**
 * GET /api/admin/orders
 */
exports.getAllOrders = async (req, res) => {
    try {
        const result = await pool.query(
            `
      SELECT o.id, o.total_amount, o.status, o.created_at,
             u.email AS customer
      FROM orders o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
      `
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

/**
 * GET /api/admin/orders/:id
 */
exports.getOrderById = async (req, res) => {
    const orderId = req.params.id;

    try {
        const orderRes = await pool.query(
            `
      SELECT o.*, u.email
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE o.id = $1
      `,
            [orderId]
        );

        if (orderRes.rows.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        const itemsRes = await pool.query(
            `
      SELECT p.name, oi.quantity, oi.price
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1
      `,
            [orderId]
        );

        res.json({
            order: orderRes.rows[0],
            items: itemsRes.rows,
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch order" });
    }
};

/**
 * PUT /api/admin/orders/:id/status
 */
exports.updateOrderStatus = async (req, res) => {
    const { status } = req.body;
    const orderId = req.params.id;

    const allowedStatuses = ["CONFIRMED", "DELIVERED", "CANCELLED"];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1 Fetch order
        const orderRes = await client.query(
            `
            SELECT id, status, stock_restored
            FROM orders
            WHERE id = $1
            FOR UPDATE
            `,
            [orderId]
        );

        if (orderRes.rows.length === 0) {
            throw new Error("Order not found");
        }

        const order = orderRes.rows[0];

        // 2 Restore stock ONLY if cancelling and not restored
        if (status === "CANCELLED" && !order.stock_restored) {
            const itemsRes = await client.query(
                `
                SELECT product_id, quantity
                FROM order_items
                WHERE order_id = $1
                `,
                [orderId]
            );

            for (const item of itemsRes.rows) {
                await client.query(
                    `
                    UPDATE products
                    SET stock = stock + $1
                    WHERE id = $2
                    `,
                    [item.quantity, item.product_id]
                );
            }

            await client.query(
                `
                UPDATE orders
                SET stock_restored = true
                WHERE id = $1
                `,
                [orderId]
            );
        }

        // 3 Update order status
        await client.query(
            `
            UPDATE orders
            SET status = $1
            WHERE id = $2
            `,
            [status, orderId]
        );

        await client.query("COMMIT");

        res.json({ message: "Order status updated successfully" });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Order status update error:", err.message);
        res.status(400).json({ message: err.message });
    } finally {
        client.release();
    }
};