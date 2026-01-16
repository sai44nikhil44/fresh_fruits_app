const pool = require("../config/db");

/**
 * Helper: get or create cart
 */
async function getOrCreateCart(userId) {
    const cartRes = await pool.query(
        "SELECT id FROM carts WHERE user_id = $1",
        [userId]
    );

    if (cartRes.rows.length > 0) {
        return cartRes.rows[0].id;
    }

    const newCart = await pool.query(
        "INSERT INTO carts (user_id) VALUES ($1) RETURNING id",
        [userId]
    );

    return newCart.rows[0].id;
}

/**
 * POST /api/cart
 */
exports.addToCart = async (req, res) => {
    const userId = req.user.id;
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity || quantity <= 0) {
        return res.status(400).json({ message: "Invalid input" });
    }

    try {
        // Check product
        const productRes = await pool.query(
            "SELECT price FROM products WHERE id = $1 AND is_active = true",
            [product_id]
        );

        if (productRes.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        const price = productRes.rows[0].price;

        const cartId = await getOrCreateCart(userId);

        const itemRes = await pool.query(
            `
      INSERT INTO cart_items (cart_id, product_id, quantity, price)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (cart_id, product_id)
      DO UPDATE SET
        quantity = cart_items.quantity + EXCLUDED.quantity,
        updated_at = NOW()
      RETURNING *
      `,
            [cartId, product_id, quantity, price]
        );

        res.json(itemRes.rows[0]);

    } catch (err) {
        console.error("Add to cart error:", err);
        res.status(500).json({ message: "Failed to add to cart" });
    }
};

/**
 * GET /api/cart
 */
exports.getCart = async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await pool.query(
            `
      SELECT
        ci.id AS cart_item_id,
        p.id AS product_id,
        p.name,
        p.image_url,
        ci.quantity,
        ci.price,
        (ci.quantity * ci.price) AS total
      FROM carts c
      JOIN cart_items ci ON ci.cart_id = c.id
      JOIN products p ON p.id = ci.product_id
      WHERE c.user_id = $1
      `,
            [userId]
        );

        res.json({
            items: result.rows,
            totalAmount: result.rows.reduce(
                (sum, item) => sum + Number(item.total),
                0
            ),
        });
    } catch (err) {
        console.error("Get cart error:", err);
        res.status(500).json({ message: "Failed to fetch cart" });
    }
};

/**
 * PUT /api/cart
 */
exports.updateCartItem = async (req, res) => {
    const userId = req.user.id;
    const { cart_item_id, quantity } = req.body;

    if (!cart_item_id || quantity <= 0) {
        return res.status(400).json({ message: "Invalid input" });
    }

    try {
        const result = await pool.query(
            `
      UPDATE cart_items
      SET quantity = $1, updated_at = NOW()
      WHERE id = $2
      AND cart_id IN (
        SELECT id FROM carts WHERE user_id = $3
      )
      RETURNING *
      `,
            [quantity, cart_item_id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Cart item not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Update cart error:", err);
        res.status(500).json({ message: "Failed to update cart" });
    }
};

/**
 * DELETE /api/cart/:itemId
 */
exports.removeCartItem = async (req, res) => {
    const userId = req.user.id;
    const { itemId } = req.params;

    try {
        await pool.query(
            `
      DELETE FROM cart_items
      WHERE id = $1
      AND cart_id IN (
        SELECT id FROM carts WHERE user_id = $2
      )
      `,
            [itemId, userId]
        );

        res.json({ message: "Item removed from cart" });
    } catch (err) {
        console.error("Remove cart item error:", err);
        res.status(500).json({ message: "Failed to remove item" });
    }
};
