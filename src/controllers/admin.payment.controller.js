const pool = require("../config/db");
const razorpay = require("../config/razorpay");

exports.getAllPayments = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            gateway
        } = req.query;

        const offset = (page - 1) * limit;

        let filters = [];
        let values = [];
        let idx = 1;

        if (status) {
            filters.push(`p.status = $${idx++}`);
            values.push(status);
        }

        if (gateway) {
            filters.push(`p.gateway = $${idx++}`);
            values.push(gateway);
        }

        const whereClause =
            filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

        const query = `
            SELECT
                p.id AS payment_id,
                p.amount,
                p.currency,
                p.status,
                p.gateway,
                p.gateway_order_id,
                p.gateway_payment_id,
                p.created_at,

                o.id AS order_id,
                o.total_amount,
                o.status AS order_status,

                u.id AS user_id,
                u.name AS user_name,
                u.email

            FROM payments p
            JOIN orders o ON o.id = p.order_id
            JOIN users u ON u.id = o.user_id
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT $${idx++} OFFSET $${idx}
        `;

        values.push(limit, offset);

        const result = await pool.query(query, values);

        res.json({
            page: Number(page),
            limit: Number(limit),
            count: result.rows.length,
            payments: result.rows
        });

    } catch (err) {
        console.error("Admin payments error:", err);
        res.status(500).json({ message: "Failed to fetch payments" });
    }
};

exports.refundPayment = async (req, res) => {
    const paymentId = req.params.id;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Fetch payment
        const payRes = await client.query(
            `
      SELECT id, order_id, amount, gateway_payment_id, status
      FROM payments
      WHERE id = $1
      `,
            [paymentId]
        );

        if (payRes.rows.length === 0) {
            return res.status(404).json({ message: "Payment not found" });
        }

        const payment = payRes.rows[0];

        if (payment.status !== "SUCCESS") {
            return res
                .status(400)
                .json({ message: "Only successful payments can be refunded" });
        }

        if (!payment.gateway_payment_id) {
            return res
                .status(400)
                .json({ message: "Gateway payment id missing" });
        }

        // 2. Create Razorpay refund
        const refund = await razorpay.payments.refund(
            payment.gateway_payment_id,
            {
                amount: Math.round(payment.amount * 100), // full refund
            }
        );

        // 3. Update payments table
        await client.query(
            `
      UPDATE payments
      SET
        refund_id = $1,
        refund_amount = $2,
        refund_status = 'REFUNDED',
        status = 'REFUNDED',
        refunded_at = NOW()
      WHERE id = $3
      `,
            [refund.id, payment.amount, paymentId]
        );

        // 4. Update order
        await client.query(
            `
      UPDATE orders
      SET payment_status = 'REFUNDED',
          status = 'CANCELLED'
      WHERE id = $1
      `,
            [payment.order_id]
        );

        await client.query("COMMIT");

        res.json({
            message: "Refund successful",
            refund_id: refund.id,
        });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Refund error:", err);
        res.status(500).json({ message: "Refund failed" });
    } finally {
        client.release();
    }
};
