const pool = require("../config/db");

/**
 * GET /api/products
 * Query params:
 *  - category (optional)
 *  - page (optional)
 *  - limit (optional)
 */
exports.getAllProducts = async (req, res) => {
    try {
        const { category, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
      SELECT p.id, p.name, p.description, p.price, p.stock, p.image_url,
             c.name AS category
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;

        const values = [];

        if (category) {
            values.push(category);
            query += ` AND LOWER(c.name) = LOWER($${values.length})`;
        }

        values.push(limit, offset);
        query += ` ORDER BY p.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

        const result = await pool.query(query, values);

        res.json({
            page: Number(page),
            count: result.rows.length,
            products: result.rows,
        });
    } catch (err) {
        console.error("getAllProducts error:", err);
        res.status(500).json({ message: "Failed to fetch products" });
    }
};

/**
 * GET /api/products/:id
 */
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
      SELECT p.*, c.name AS category
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1 AND p.is_active = true
      `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("getProductById error:", err);
        res.status(500).json({ message: "Failed to fetch product" });
    }
};
