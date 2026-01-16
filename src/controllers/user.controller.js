const pool = require("../config/db");

// GET /api/user/me
exports.getMe = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            "SELECT id, name, email, created_at FROM public.users WHERE id = $1",
            [userId]
        );

        if (result.rows.length == 0) {
            return res.status(404).json({ message: "User not found." });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch profile" });
    }
};

// PUT /api/user/me
exports.updateMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name } = req.body;
        const result = await pool.query(
            "UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email",
            [name, userId]
        );

        res.json({
            message: "Profile updated",
            user: result.rows[0]
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Update failed" });
    }
};

// DELETE /api/user/me
exports.deleteMe = async (req, res) => {
    try {
        const userId = req.user.id;

        await pool.query(
            "DELETE FROM users WHERE id = $1", [userId]
        );

        res.json({ message: "Account deleted successfully" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Delete failed" });
    }
};