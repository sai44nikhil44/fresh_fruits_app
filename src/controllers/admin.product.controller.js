const pool = require("../config/db");

/**
 * POST /api/admin/products
 */
exports.createProduct = async (req, res) => {
    try {
        const {
            category_id,
            name,
            description,
            price,
            stock,
            image_url,
        } = req.body;

        const result = await pool.query(
            `
      INSERT INTO products
      (category_id, name, description, price, stock, image_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
            [category_id, name, description, price, stock, image_url]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("createProduct error:", err);
        res.status(500).json({ message: "Failed to create product" });
    }
};

/**
 * PUT /api/admin/products/:id
 */
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, stock, image_url } = req.body;

        const result = await pool.query(
            `
      UPDATE products
      SET name = COALESCE($1, name),
          price = COALESCE($2, price),
          stock = COALESCE($3, stock),
          image_url = COALESCE($4, image_url)
      WHERE id = $5
      RETURNING *
      `,
            [name, price, stock, image_url, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("updateProduct error:", err);
        res.status(500).json({ message: "Failed to update product" });
    }
};

/**
 * DELETE /api/admin/products/:id
 * (Soft delete)
 */
exports.disableProduct = async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            `UPDATE products SET is_active = false WHERE id = $1`,
            [id]
        );

        res.json({ message: "Product disabled" });
    } catch (err) {
        console.error("disableProduct error:", err);
        res.status(500).json({ message: "Failed to disable product" });
    }
};
