const express = require("express");
const bdd = require("../bdd");
const router = express.Router();
const auth = require("../middleware/auth");

// Ajouter un produit à une commande
router.post("/addToOrder", auth.authentification, async (req, res) => {
    try {
        const { order_id, product_id, quantity, special_instructions } = req.body;
        
        // Vérifier si le produit existe et est disponible
        const checkProduct = "SELECT availability FROM products WHERE id_product = ?";
        bdd.query(checkProduct, [product_id], (error, results) => {
            if (error) {
                return res.status(500).json({ error: "Erreur serveur" });
            }
            if (results.length === 0 || !results[0].availability) {
                return res.status(400).json({ error: "Produit non disponible" });
            }

            // Ajouter le produit à la commande
            const addToOrder = `
                INSERT INTO orders_item (order_id, product_id, quantity, special_instructions) 
                VALUES (?, ?, ?, ?)
            `;
            bdd.query(addToOrder, [order_id, product_id, quantity, special_instructions], (error, results) => {
                if (error) {
                    return res.status(500).json({ error: "Erreur lors de l'ajout du produit" });
                }
                
                // Mettre à jour le prix total de la commande
                const updateOrderTotal = `
                    UPDATE orders o 
                    SET total_price = (
                        SELECT SUM(p.price * oi.quantity) 
                        FROM orders_item oi 
                        JOIN products p ON oi.product_id = p.id_product 
                        WHERE oi.order_id = ?
                    )
                    WHERE o.id_order = ?
                `;
                bdd.query(updateOrderTotal, [order_id, order_id], (error) => {
                    if (error) {
                        return res.status(500).json({ error: "Erreur lors de la mise à jour du prix total" });
                    }
                    res.json({ message: "Produit ajouté à la commande avec succès" });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Récupérer les produits d'une commande
router.get("/orderItems/:orderId", auth.authentification, (req, res) => {
    const { orderId } = req.params;
    
    const getOrderItems = `
        SELECT oi.*, p.name, p.price, p.image_url 
        FROM orders_item oi
        JOIN products p ON oi.product_id = p.id_product
        WHERE oi.order_id = ?
    `;
    
    bdd.query(getOrderItems, [orderId], (error, results) => {
        if (error) {
            return res.status(500).json({ error: "Erreur lors de la récupération des produits" });
        }
        res.json(results);
    });
});

// Modifier la quantité d'un produit dans la commande
router.put("/updateQuantity", auth.authentification, (req, res) => {
    const { order_id, product_id, quantity } = req.body;
    
    if (quantity <= 0) {
        const removeItem = "DELETE FROM orders_item WHERE order_id = ? AND product_id = ?";
        bdd.query(removeItem, [order_id, product_id], (error) => {
            if (error) {
                return res.status(500).json({ error: "Erreur lors de la suppression du produit" });
            }
            res.json({ message: "Produit retiré de la commande" });
        });
    } else {
        const updateQuantity = "UPDATE orders_item SET quantity = ? WHERE order_id = ? AND product_id = ?";
        bdd.query(updateQuantity, [quantity, order_id, product_id], (error) => {
            if (error) {
                return res.status(500).json({ error: "Erreur lors de la mise à jour de la quantité" });
            }
            res.json({ message: "Quantité mise à jour avec succès" });
        });
    }
});

module.exports = router;