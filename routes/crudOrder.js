const express = require("express");
const bdd = require("../bdd");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

// Création d'une commande

// Créer une nouvelle commande avec ses items
router.post("/createOrder", auth.authentification, async (req, res) => {
    const userId = req.id_user;  // Au lieu de req.userId
    const { location_id, items } = req.body;

    // Vérifier que les items sont présents
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "La commande doit contenir des articles" });
    }

    // Démarrer une transaction
    try {
        // Calculer d'abord le prix total
        let total_price = 0;
        for (const item of items) {
            // Vérifier si le produit existe et récupérer son prix
            const [products] = await bdd.promise().query(
                'SELECT price FROM products WHERE id_product = ?',
                [item.product_id]
            );

            if (products.length === 0) {
                throw new Error(`Produit ${item.product_id} non trouvé`);
            }

            // Calculer le sous-total pour cet item
            total_price += products[0].price * item.quantity;
        }

        // Commencer la transaction
        await bdd.promise().beginTransaction();

        // 1. Insérer la commande principale avec le total_price
        const [orderResult] = await bdd.promise().query(
            `INSERT INTO orders (user_id, location_id, status, total_price) 
             VALUES (?, ?, 'En cours', ?)`,
            [userId, location_id, total_price]
        );
        
        const orderId = orderResult.insertId;

        // 2. Insérer chaque item
        for (const item of items) {
            await bdd.promise().query(
                `INSERT INTO order_items (order_id, product_id, quantity, special_instructions) 
                 VALUES (?, ?, ?, ?)`,
                [orderId, item.product_id, item.quantity, item.special_instructions]
            );
        }

        // Valider la transaction
        await bdd.promise().commit();

        res.status(201).json({
            message: "Commande créée avec succès",
            orderId: orderId,
            total_price: total_price
        });

    } catch (error) {
        // En cas d'erreur, annuler la transaction
        await bdd.promise().rollback();
        console.error('Erreur lors de la création de la commande:', error);
        res.status(500).json({ 
            message: "Erreur lors de la création de la commande",
            error: error.message 
        });
    }
});

// Route pour ajouter un item à une commande existante

router.post("/addOrderItem", auth.authentification, async (req, res) => {
    const userId = req.userId;
    const { order_id, product_id, quantity, special_instructions } = req.body;

    try {
        // Vérifier que la commande existe et appartient à l'utilisateur
        const [orders] = await bdd.promise().query(
            'SELECT id_order FROM orders WHERE id_order = ? AND user_id = ?',
            [order_id, userId]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: "Commande non trouvée" });
        }

        // Vérifier que le produit existe et récupérer son prix
        const [products] = await bdd.promise().query(
            'SELECT price FROM products WHERE id_product = ?',
            [product_id]
        );

        if (products.length === 0) {
            return res.status(404).json({ message: "Produit non trouvé" });
        }

        // Démarrer une transaction
        await bdd.promise().beginTransaction();

        // Ajouter le nouvel item
        await bdd.promise().query(
            `INSERT INTO order_items (order_id, product_id, quantity, special_instructions) 
             VALUES (?, ?, ?, ?)`,
            [order_id, product_id, quantity, special_instructions]
        );

        // Mettre à jour le prix total de la commande
        const itemTotal = products[0].price * quantity;
        await bdd.promise().query(
            'UPDATE orders SET total_price = total_price + ? WHERE id_order = ?',
            [itemTotal, order_id]
        );

        // Valider la transaction
        await bdd.promise().commit();

        res.status(201).json({
            message: "Article ajouté à la commande",
            order_id: order_id,
            added_price: itemTotal
        });

    } catch (error) {
        // En cas d'erreur, annuler la transaction
        await bdd.promise().rollback();
        console.error('Erreur lors de l\'ajout de l\'article:', error);
        res.status(500).json({ message: "Erreur lors de l'ajout de l'article" });
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

router.get("/getOrder/:orderId", auth.authentification, async (req, res) => {
    const query = `
        SELECT o.*, 
               oi.quantity, 
               oi.special_instructions, 
               p.name as product_name,
               u.first_name,
               u.name,
               u.phone,
               o.desired_time,
               u.email
        FROM orders o
        LEFT JOIN order_items oi ON o.id_order = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id_product
        LEFT JOIN users u ON o.user_id = u.id_user
        WHERE o.id_order = ? AND o.user_id = ?
    `;
    
    bdd.query(query, [req.params.orderId, req.id_user], (error, result) => {
        if (error) throw error;
        
        if (result.length === 0) {
            return res.status(404).json({ message: "Commande non trouvée" });
        }

        const orderDetails = {
            orderId: result[0].id_order,
            name: result[0].name,
            firstName: result[0].first_name,
            phone: result[0].phone,
            desired_time: result[0].desired_time,
            email: result[0].email,
            status: result[0].status,
            total_price: result[0].total_price,
            items: result.map(item => ({
                product: item.product_name,
                quantity: item.quantity,
                instructions: item.special_instructions
            }))
        };

        res.status(200).json(orderDetails);
    });
});

// MAJ d'une commande

router.put("/updateOrder/:id", auth.authentification, async (req, res) => {
    if (req.role == "client") {
        console.log("vous n'avez pas accès à cette fonctionnalité");
        res
            .status(403)
            .json({ message: "Vous n'avez pas accès à cette fonctionnalité." });
    } else {
        const orderId = req.params.id;
        const { status, desired_time, total_price } = req.body;
        
        const updateOrder = 
            "UPDATE orders SET status = ?, desired_time = ?, total_price = ? WHERE id_order = ?";
        
        bdd.query(
            updateOrder, 
            [status, desired_time, total_price, orderId], 
            (error, result) => {
                if (error) throw error;
                if (result.affectedRows === 0) {
                    res.status(404).json({ message: "Commande non trouvée" });
                } else {
                    res.status(200).send("Commande mise à jour");
                }
            }
        );
    }
});

// Suppression d'une commande

router.delete("/deleteOrder/:id", auth.authentification, async (req, res) => {
    if (req.role == "client") {
        console.log("vous n'avez pas accès à cette fonctionnalité");
        res
            .status(403)
            .json({ message: "Vous n'avez pas accès à cette fonctionnalité." });
    } else {
        const orderId = req.params.id;
        const deleteOrder = "DELETE FROM orders WHERE id_order = ?";
        
        bdd.query(deleteOrder, [orderId], (error, result) => {
            if (error) throw error;
            if (result.affectedRows === 0) {
                res.status(404).json({ message: "Commande non trouvée" });
            } else {
                res.status(200).send("Commande supprimée");
            }
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