const pool = require("../config/db");

/**
 * POST /api/payments/create
 */
exports.createPaymentOrder = async (req, res) => {
    const userId = req.user.id;
    const { order_id } = req.body;

    try {
        // 1. Validate order
        const orderRes = await pool.query(
            `
            SELECT total_amount, payment_status
            FROM orders
            WHERE id = $1 AND user_id = $2
            `,
            [order_id, userId]
        );

        if (orderRes.rows.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        const order = orderRes.rows[0];

        if (order.payment_status === "PAID") {
            return res.status(400).json({ message: "Order already paid" });
        }

        // 2. Create payment record (gateway order created later)
        const paymentRes = await pool.query(
            `
            INSERT INTO payments (order_id, amount, gateway)
            VALUES ($1, $2, 'RAZORPAY')
            RETURNING id, amount
            `,
            [order_id, order.total_amount]
        );

        // 3. Simulated Razorpay order (real call later)
        const fakeGatewayOrderId = "order_" + paymentRes.rows[0].id;

        await pool.query(
            `
            UPDATE payments
            SET gateway_order_id = $1
            WHERE id = $2
            `,
            [fakeGatewayOrderId, paymentRes.rows[0].id]
        );

        res.json({
            payment_id: paymentRes.rows[0].id,
            gateway_order_id: fakeGatewayOrderId,
            amount: order.total_amount,
            currency: "INR",
        });

    } catch (err) {
        console.error("Create payment error:", err);
        res.status(500).json({ message: "Failed to create payment" });
    }
};


exports.verifyPayment = async (req, res) => {
    const { payment_id, gateway_payment_id } = req.body;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Update payment
        const payRes = await client.query(
            `
            UPDATE payments
            SET status = 'PAID',
            gateway_payment_id = $1
            WHERE id = $2
            RETURNING order_id
            `,
            [gateway_payment_id, payment_id]
        );

        if (payRes.rows.length === 0) {
            throw new Error("Payment not found");
        }

        const orderId = payRes.rows[0].order_id;

        // 2. Update order
        await client.query(
            `
            UPDATE orders
            SET payment_status = 'PAID',
            status = 'CONFIRMED'
            WHERE id = $1
            `,
            [orderId]
        );

        await client.query("COMMIT");

        res.json({ message: "Payment verified & order confirmed" });

    } catch (err) {
        await client.query("ROLLBACK");
        res.status(400).json({ message: err.message });
    } finally {
        client.release();
    }
};

