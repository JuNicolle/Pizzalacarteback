const bdd = require("../bdd");

class CartService {
    // Créer un nouveau panier (order)
    async createCart(userId, locationId) {
        try {
            const [result] = await bdd.promise().query(
                `INSERT INTO orders (user_id, location_id, status, total_price) 
                 VALUES (?, ?, 'En attente', 0)`,
                [userId, locationId]
            );
            return result.insertId;
        } catch (error) {
            throw new Error(`Erreur lors de la création du panier: ${error.message}`);
        }
    }

    // Ajouter un produit au panier
    async addToCart(orderId, productId, quantity, specialInstructions) {

        
        try {
            await bdd.promise().beginTransaction();

            // Vérifier si le produit existe et est disponible
            const [product] = await bdd.promise().query(
                'SELECT price, availability FROM products WHERE id_product = ?',
                [productId]
            );

            if (product.length === 0) {
                throw new Error('Produit non trouvé');
            }

            if (!product[0].availability) {
                throw new Error('Produit non disponible');
            }

            // Vérifier si le produit existe déjà dans le panier
            const [existingItem] = await bdd.promise().query(
                'SELECT id_order_item, quantity FROM order_items WHERE order_id = ? AND product_id = ?',
                [orderId, productId]
            );

            let itemResult;
            if (existingItem.length > 0) {
                // Mettre à jour la quantité si le produit existe déjà
                const newQuantity = existingItem[0].quantity + quantity;
                itemResult = await bdd.promise().query(
                    'UPDATE order_items SET quantity = ?, special_instructions = ? WHERE id_order_item = ?',
                    [newQuantity, specialInstructions, existingItem[0].id_order_item]
                );
            } else {
                // Ajouter un nouveau produit
                itemResult = await bdd.promise().query(
                    'INSERT INTO order_items (order_id, product_id, quantity, special_instructions) VALUES (?, ?, ?, ?)',
                    [orderId, productId, quantity, specialInstructions]
                );
            }

            // Mettre à jour le prix total
            await this.updateOrderTotal(orderId);

            await bdd.promise().commit();
            return itemResult;
        } catch (error) {
            await bdd.promise().rollback();
            throw error;
        }
    }

    // Retirer un produit du panier
    async removeFromCart(orderId, orderItemId) {
        try {
            await bdd.promise().beginTransaction();

            await bdd.promise().query(
                'DELETE FROM order_items WHERE id_order_item = ? AND order_id = ?',
                [orderItemId, orderId]
            );

            // Mettre à jour le prix total
            await this.updateOrderTotal(orderId);

            await bdd.promise().commit();
        } catch (error) {
            await bdd.promise().rollback();
            throw error;
        }
    }

    // Mettre à jour la quantité d'un produit
    async updateItemQuantity(orderId, orderItemId, quantity) {
        try {
            await bdd.promise().beginTransaction();

            if (quantity <= 0) {
                await this.removeFromCart(orderId, orderItemId);
            } else {
                await bdd.promise().query(
                    'UPDATE order_items SET quantity = ? WHERE id_order_item = ? AND order_id = ?',
                    [quantity, orderItemId, orderId]
                );

                // Mettre à jour le prix total
                await this.updateOrderTotal(orderId);
            }

            await bdd.promise().commit();
        } catch (error) {
            await bdd.promise().rollback();
            throw error;
        }
    }

    // Mettre à jour le total de la commande
    async updateOrderTotal(orderId) {
        const [items] = await bdd.promise().query(
            `SELECT oi.quantity, p.price 
             FROM order_items oi 
             JOIN products p ON oi.product_id = p.id_product 
             WHERE oi.order_id = ?`,
            [orderId]
        );

        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        await bdd.promise().query(
            'UPDATE orders SET total_price = ? WHERE id_order = ?',
            [total, orderId]
        );

        return total;
    }

    // Récupérer le contenu du panier
    async getCart(orderId) {
        const [cartItems] = await bdd.promise().query(
            `SELECT 
                oi.id_order_item,
                oi.product_id,
                oi.quantity,
                oi.special_instructions,
                p.name,
                p.price,
                p.description,
                p.image_url,
                p.allergens,
                (p.price * oi.quantity) as subtotal
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id_product
            WHERE oi.order_id = ?`,
            [orderId]
        );

        const [orderInfo] = await bdd.promise().query(
            'SELECT total_price, status FROM orders WHERE id_order = ?',
            [orderId]
        );

        return {
            orderId,
            status: orderInfo[0]?.status,
            totalPrice: orderInfo[0]?.total_price,
            items: cartItems
        };
    }
}

module.exports = new CartService();