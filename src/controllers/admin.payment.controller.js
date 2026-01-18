const pool = require("../config/db");

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
