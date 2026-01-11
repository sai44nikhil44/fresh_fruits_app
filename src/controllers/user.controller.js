const pool = require("../config/db");

exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            "SELECT id, name, email, created_at FROM public.users WHERE id = $1",
            [userId]
        );

        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch profile" });
    }
};