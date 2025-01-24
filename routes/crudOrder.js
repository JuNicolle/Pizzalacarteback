const express = require("express");
const bdd = require("../bdd");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const cartService = require("../services/cartService");

// Création d'une commande

// Créer une nouvelle commande avec ses items
router.post("/createOrder", auth.authentification, async (req, res) => {
    const userId = req.id_user;
    const { location_id, items } = req.body;

    try {
        // Créer un nouveau panier
        const orderId = await cartService.createCart(userId, location_id);

        // Ajouter chaque item au panier
        for (const item of items) {
            await cartService.addToCart(
                orderId, 
                item.product_id, 
                item.quantity, 
                item.special_instructions
            );
        }

        // Récupérer le panier complet avec les totaux
        const cart = await cartService.getCart(orderId);

        res.status(201).json({
            message: "Commande créée avec succès",
            cart: cart
        });

    } catch (error) {
        console.error('Erreur lors de la création de la commande:', error);
        res.status(500).json({ 
            message: "Erreur lors de la création de la commande",
            error: error.message 
        });
    }
});

// Route pour ajouter un item à une commande existante

router.post("/addOrderItem", auth.authentification, async (req, res) => {
    try {
        const { order_id, product_id, quantity, special_instructions } = req.body;

        await cartService.addToCart(order_id, product_id, quantity, special_instructions);
        const updatedCart = await cartService.getCart(order_id);

        res.status(201).json({
            message: "Article ajouté au panier",
            cart: updatedCart
        });

    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'article:', error);
        res.status(500).json({ 
            message: "Erreur lors de l'ajout de l'article",
            error: error.message 
        });
    }
});

// Mettre à jour la quantité d'un item
router.put("/updateQuantity/:orderId/:itemId", auth.authentification, async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const { quantity } = req.body;

        await cartService.updateItemQuantity(orderId, itemId, quantity);
        const updatedCart = await cartService.getCart(orderId);

        res.status(200).json({
            message: "Quantité mise à jour",
            cart: updatedCart
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de la quantité:', error);
        res.status(500).json({ 
            message: "Erreur lors de la mise à jour",
            error: error.message 
        });
    }
});


// Récupérer toutes les commandes

router.get("/getAllOrders", auth.authentification, async (req, res) => {
    if (req.role == "client") {
        console.log("vous n'avez pas accès à cette fonctionnalité");
        res
            .status(403)
            .json({ message: "Vous n'avez pas accès à cette fonctionnalité." });
    } else {
        const selectOrders = "SELECT * FROM orders ORDER BY created_at DESC";
        bdd.query(selectOrders, (error, result) => {
            if (error) throw error;
            res.status(200).json(result);
        });
    }
});

// Lecture d'une commande par son id

router.get("/getCart/:orderId", auth.authentification, (req, res) => {
    const { orderId } = req.params;

    const getCartItems = `
        SELECT 
            o.id_order,
            o.status,
            o.total_price,
            o.desired_time,
            oi.id_order_item,
            oi.quantity,
            oi.special_instructions,
            p.id_product,
            p.name,
            p.price,
            p.description,
            p.image_url,
            p.allergens,
            (p.price * oi.quantity) as subtotal
        FROM orders o
        JOIN order_items oi ON o.id_order = oi.order_id
        JOIN products p ON oi.product_id = p.id_product
        WHERE o.id_order = ?
        ORDER BY oi.id_order_item
    `;

    bdd.query(getCartItems, [orderId], (error, results) => {
        if (error) {
            console.error("Erreur lors de la récupération du panier:", error);
            return res.status(500).json({ 
                error: "Erreur lors de la récupération du panier",
                details: error.message 
            });
        }

        if (results.length === 0) {
            return res.status(404).json({ 
                message: "Aucun produit trouvé dans cette commande ou commande inexistante" 
            });
        }

        // Restructurer les données pour un format plus pratique
        const cartDetails = {
            orderId: results[0].id_order,
            status: results[0].status,
            totalPrice: results[0].total_price,
            desiredTime: results[0].desired_time,
            items: results.map(item => ({
                orderItemId: item.id_order_item,
                productId: item.id_product,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                subtotal: item.subtotal,
                description: item.description,
                imageUrl: item.image_url,
                allergens: item.allergens,
                specialInstructions: item.special_instructions
            }))
        };

        res.json(cartDetails);
    });
});

// Suppression d'une commande

// router.delete("/deleteOrder/:id", auth.authentification, async (req, res) => {
//     if (req.role == "client") {
//         console.log("vous n'avez pas accès à cette fonctionnalité");
//         res
//             .status(403)
//             .json({ message: "Vous n'avez pas accès à cette fonctionnalité." });
//     } else {
//         const orderId = req.params.id;
//         const deleteOrder = "DELETE FROM orders WHERE id_order = ?";
        
//         bdd.query(deleteOrder, [orderId], (error, result) => {
//             if (error) throw error;
//             if (result.affectedRows === 0) {
//                 res.status(404).json({ message: "Commande non trouvée" });
//             } else {
//                 res.status(200).send("Commande supprimée");
//             }
//         });
//     }
// });

router.delete("/removeItem/:orderId/:itemId", auth.authentification, async (req, res) => {
    try {
        const { orderId, itemId } = req.params;

        await cartService.removeFromCart(orderId, itemId);
        const updatedCart = await cartService.getCart(orderId);

        res.status(200).json({
            message: "Article supprimé du panier",
            cart: updatedCart
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de l\'article:', error);
        res.status(500).json({ 
            message: "Erreur lors de la suppression",
            error: error.message 
        });
    }
});

// Mettre a jour le statut d'une commande

router.put("/updateOrderStatus/:orderId", auth.authentification, async (req, res) => {
    const { status } = req.body;
    const orderId = req.params.orderId;

    const validStatus = ['En cours', 'Terminee', 'Annulee'];
    if (!validStatus.includes(status)) {
        return res.status(400).json({ message: "Statut invalide" });
    }

    bdd.query(
        'UPDATE orders SET status = ? WHERE id_order = ?',
        [status, orderId, req.id_user],
        (error, result) => {
            if (error) throw error;
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Commande non trouvée" });
            }
            
            res.status(200).json({ message: "Statut mis à jour avec succès" });
        }
    );
});

// Récupérer le contenu d'un panier
router.get("/getCart/:orderId", auth.authentification, async (req, res) => {
    try {
        const { orderId } = req.params;
        const cart = await cartService.getCart(orderId);

        if (!cart.items || cart.items.length === 0) {
            return res.status(404).json({ 
                message: "Panier vide ou introuvable" 
            });
        }

        res.json(cart);

    } catch (error) {
        console.error('Erreur lors de la récupération du panier:', error);
        res.status(500).json({ 
            message: "Erreur lors de la récupération du panier",
            error: error.message 
        });
    }
});

// Lire toutes les commandes d'un user

router.get("/getUserOrders/:userId", auth.authentification, async (req, res) => {
    const userId = req.params.userId;
    const selectUserOrders = "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC";
    
    bdd.query(selectUserOrders, [userId], (error, result) => {
        if (error) throw error;
        res.status(200).json(result);
    });
});

// Lire toutes les commandes du jour

router.get("/getDayOrders", auth.authentification, async (req, res) => {
    if (req.role == "client") {
        console.log("vous n'avez pas accès à cette fonctionnalité");
        res
            .status(403)
            .json({ message: "Vous n'avez pas accès à cette fonctionnalité." });
    } else {
        const selectDayOrders = `
            SELECT * FROM orders 
            WHERE DATE(created_at) = CURDATE()
            ORDER BY created_at DESC`;
        
        bdd.query(selectDayOrders, (error, result) => {
            if (error) throw error;
            res.status(200).json(result);
        });
    }
});

// Lire toutes les commandes d'une semaine

router.get("/getWeekOrders", auth.authentification, async (req, res) => {
    if (req.role == "client") {
        console.log("vous n'avez pas accès à cette fonctionnalité");
        res
            .status(403)
            .json({ message: "Vous n'avez pas accès à cette fonctionnalité." });
    } else {
        const selectWeekOrders = `
            SELECT * FROM orders 
            WHERE YEARWEEK(created_at) = YEARWEEK(CURDATE())
            ORDER BY created_at DESC`;
        
        bdd.query(selectWeekOrders, (error, result) => {
            if (error) throw error;
            res.status(200).json(result);
        });
    }
});

// Lire toutes les commandes d'un mois

router.get("/getMonthOrders", auth.authentification, async (req, res) => {
    if (req.role == "client") {
        console.log("vous n'avez pas accès à cette fonctionnalité");
        res
            .status(403)
            .json({ message: "Vous n'avez pas accès à cette fonctionnalité." });
    } else {
        const selectMonthOrders = `
            SELECT * FROM orders 
            WHERE MONTH(created_at) = MONTH(CURDATE())
            AND YEAR(created_at) = YEAR(CURDATE())
            ORDER BY created_at DESC`;
        
        bdd.query(selectMonthOrders, (error, result) => {
            if (error) throw error;
            res.status(200).json(result);
        });
    }
});

module.exports = router;