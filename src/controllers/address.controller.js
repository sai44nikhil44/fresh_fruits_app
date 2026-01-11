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
        console.log("user id: ", userId);
        console.log("address id: ", addressId);


        await pool.query(
            "DELETE FROM user_addresses WHERE id = $1 AND user_id = $2",
            [addressId, userId]
        );

        res.json({ message: "Address deleted" });
    } catch (err) {
        res.status(500).json({ message: "Delete failed" });
    }
};

exports.updateAddress = async (req, res) => {
    const userId = req.user.id;
    const addressId = req.params.id;

    const { line1, line2, city, state, pincode } = req.body;

    if (!line1 && !line2 && !city && !state && !pincode) {
        return res.status(400).json({
            message: "At least one field is required to update"
        });
    }

    try {
        const check = await pool.query(
            "SELECT id FROM user_address WHERE id = $1 AND user_id = $2",
            [addressId, userId]
        );

        if (check.rows.length == 0) {
            return res.status(404).json({ message: "Address not found." });
        }

        const result = await pool.query(
            `
      UPDATE addresses
      SET
        line1 = COALESCE($1, line1),
        line2 = COALESCE($2, line2),
        city = COALESCE($3, city),
        state = COALESCE($4, state),
        pincode = COALESCE($5, pincode),
        updated_at = NOW()
      WHERE id = $6 AND user_id = $7
      RETURNING *
      `,
            [line1, line2, city, state, pincode, addressId, userId]
        );

        res.json({
            message: "Address updated successfully",
            address: result.rows[0]
        });
    }
    catch (err) {
        console.err("Update address error: ", err);
        res.status(500).json({ message: "Failed to update" });
    }
};
