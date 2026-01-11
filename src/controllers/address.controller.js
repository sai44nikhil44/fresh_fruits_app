const pool = require("../config/db");

// POST /api/address
exports.addAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { label, address_line, city, state, pincode, is_default } = req.body;

        if (is_default) {
            await pool.query(
                "UPDATE user_addresses SET is_default = false WHERE user_id = $1",
                [userId]
            );
        }

        const result = await pool.query(
            `INSERT INTO user_addresses 
      (user_id, label, address_line, city, state, pincode, is_default)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
            [userId, label, address_line, city, state, pincode, is_default]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Address creation failed" });
    }
};

// GET /api/address
exports.getAddresses = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            "SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch addresses" });
    }
};

// DELETE /api/address/:id
exports.deleteAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const addressId = req.params.id;

        await pool.query(
            "DELETE FROM user_addresses WHERE id = $1 AND user_id = $2",
            [addressId, userId]
        );

        res.json({ message: "Address deleted" });
    } catch (err) {
        res.status(500).json({ message: "Delete failed" });
    }
};
