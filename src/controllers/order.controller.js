const pool = require("../config/db");

/**
 * POST /api/orders
 * Checkout
 */
exports.placeOrder = async (req, res) => {
    const userId = req.user.id;
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Get cart
        const cartRes = await client.query(
            "SELECT id FROM carts WHERE user_id = $1",
            [userId]
        );

        if (cartRes.rows.length === 0) {
            throw new Error("Cart is empty");
        }

        const cartId = cartRes.rows[0].id;

        const itemsRes = await client.query(
            `
            SELECT ci.product_id, ci.quantity, ci.price
            FROM cart_items ci
            WHERE ci.cart_id = $1
            `,
            [cartId]
        );

        if (itemsRes.rows.length === 0) {
            throw new Error("Cart is empty");
        }

        // 2. Get default address
        const addressRes = await client.query(
            `
            SELECT id FROM user_addresses
            WHERE user_id = $1 AND is_default = true
            LIMIT 1
            `,
            [userId]
        );

        if (addressRes.rows.length === 0) {
            throw new Error("No default address found");
        }

        const addressId = addressRes.rows[0].id;

        // 3. Calculate total
        const totalAmount = itemsRes.rows.reduce(
            (sum, item) => sum + item.quantity * item.price,
            0
        );

        // 4. Create order
        const orderRes = await client.query(
            `
            INSERT INTO orders (user_id, address_id, total_amount)
            VALUES ($1, $2, $3)
            RETURNING id
            `,
            [userId, addressId, totalAmount]
        );

        const orderId = orderRes.rows[0].id;

        // 5. Create order items
        for (const item of itemsRes.rows) {
            await client.query(
                `
                INSERT INTO order_items (order_id, product_id, quantity, price)
                VALUES ($1, $2, $3, $4)
                `,
                [orderId, item.product_id, item.quantity, item.price]
            );
        }

        // 6. Clear cart
        await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cartId]);

        // 5️⃣ Reduce product stock
        for (const item of itemsRes.rows) {
            const update = await client.query(
                `
                UPDATE products
                SET stock = stock - $1
                WHERE id = $2 AND stock >= $1
                RETURNING stock
                `,
                [item.quantity, item.product_id]
            );

            if (update.rows.length === 0) {
                throw new Error("Insufficient stock for product");
            }
        }

        await client.query("COMMIT");

        res.status(201).json({
            message: "Order placed successfully",
            order_id: orderId,
            total_amount: totalAmount
        });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Place order error:", err.message);
        res.status(400).json({ message: err.message });
    } finally {
        client.release();
    }
};

/**
 * GET /api/orders
 */
exports.getMyOrders = async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await pool.query(
            `
            SELECT id, total_amount, status, created_at
            FROM orders
            WHERE user_id = $1
            ORDER BY created_at DESC
            `,
            [userId]
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

/**
 * GET /api/orders/:id
 */
exports.getOrderById = async (req, res) => {
    const userId = req.user.id;
    const orderId = req.params.id;

    try {
        const orderRes = await pool.query(
            `
            SELECT * FROM orders
            WHERE id = $1 AND user_id = $2
            `,
            [orderId, userId]
        );

        if (orderRes.rows.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        const itemsRes = await pool.query(
            `
            SELECT oi.quantity, oi.price, p.name
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = $1
            `,
            [orderId]
        );

        res.json({
            order: orderRes.rows[0],
            items: itemsRes.rows
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch order" });
    }
};
