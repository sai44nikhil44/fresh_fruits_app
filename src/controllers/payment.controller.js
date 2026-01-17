const pool = require("../config/db");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");

exports.createPaymentOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { order_id } = req.body;

        if (!order_id) {
            return res.status(400).json({ message: "order_id is required" });
        }

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

        if (orderRes.rows[0].payment_status === "PAID") {
            return res.status(400).json({ message: "Order already paid" });
        }

        const amount = orderRes.rows[0].total_amount;

        // 2. Create payment DB record
        const paymentRes = await pool.query(
            `
            INSERT INTO payments (order_id, user_id, amount, currency, gateway)
            VALUES ($1, $2, $3, 'INR', 'RAZORPAY')
            RETURNING id
            `,
            [order_id, userId, amount]
        );

        const paymentId = paymentRes.rows[0].id;

        // 3. Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(amount * 100), // INR → paise
            currency: "INR",
            receipt: paymentId,
        });

        // 4. Save gateway order id
        await pool.query(
            `
            UPDATE payments
            SET gateway_order_id = $1, updated_at = NOW()
            WHERE id = $2
            `,
            [razorpayOrder.id, paymentId]
        );

        // 5. Send data to frontend
        res.json({
            key: process.env.RAZORPAY_KEY_ID,
            payment_id: paymentId,
            razorpay_order_id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
        });

    } catch (err) {
        console.error("Create payment error:", err);
        res.status(500).json({ message: "Failed to create payment" });
    }
};

exports.verifyPayment = async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        payment_id,
    } = req.body;

    if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature ||
        !payment_id
    ) {
        return res.status(400).json({ message: "Invalid payment payload" });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            throw new Error("Invalid payment signature");
        }

        // 2. Update payment
        const payRes = await client.query(
            `
            UPDATE payments
            SET gateway_payment_id = $1,
            gateway_signature = $2,
            status = 'SUCCESS',
            updated_at = NOW()
            WHERE id = $3
            RETURNING order_id
            `,
            [razorpay_payment_id, razorpay_signature, payment_id]
        );

        if (payRes.rows.length === 0) {
            throw new Error("Payment record not found");
        }

        const orderId = payRes.rows[0].order_id;

        // 3. Update order payment status
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

        res.json({ message: "Payment verified successfully" });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Verify payment error:", err.message);
        res.status(400).json({ message: err.message });
    } finally {
        client.release();
    }
};
