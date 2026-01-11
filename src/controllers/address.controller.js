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

    const { address_line, city, state, pincode } = req.body;

    console.log("req.body: ", req.body);
    console.log("userId", userId);
    console.log("addressId: ", addressId);
    if (!address_line && !city && !state && !pincode) {
        return res.status(400).json({
            message: "At least one field is required to update"
        });
    }

    try {
        const check = await pool.query(
            "SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2",
            [addressId, userId]
        );

        console.log("length: ", check.rows.length);
        console.log("record: ", check.rows[0]);

        if (check.rows.length == 0) {
            return res.status(404).json({ message: "Address not found." });
        }

        const result = await pool.query(
            `
      UPDATE user_addresses
      SET
        address_line = COALESCE($1, address_line),
        city = COALESCE($2, city),
        state = COALESCE($3, state),
        pincode = COALESCE($4, pincode),
        updated_at = NOW()
      WHERE id = $5 AND user_id = $6
      RETURNING *
      `,
            [address_line, city, state, pincode, addressId, userId]
        );

        res.json({
            message: "Address updated successfully",
            address: result.rows[0]
        });
    }
    catch (err) {
        console.error("Update address error: ", err);
        res.status(500).json({ message: "Failed to update" });
    }
};
