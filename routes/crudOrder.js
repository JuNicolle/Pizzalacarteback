const express = require("express");
const bdd = require("../bdd");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

// Création d'une commande

router.post("/createOrder", auth.authentification, async (req, res) => {
    const { user_id, location_id, desired_time, total_price } = req.body;
    const insertOrder = 
        "INSERT INTO orders (user_id, location_id, desired_time, total_price) VALUES (?, ?, ?, ?)";
    
    bdd.query(
        insertOrder, 
        [user_id, location_id, desired_time, total_price], 
        (error, result) => {
            if (error) throw error;
            res.status(201).send("Nouvelle commande ajoutée");
        }
    );
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

router.get("/getOrder/:id", auth.authentification, async (req, res) => {
    if (req.role == "client") {
        console.log("vous n'avez pas accès à cette fonctionnalité");
        res
            .status(403)
            .json({ message: "Vous n'avez pas accès à cette fonctionnalité." });
    } else {
        const orderId = req.params.id;
        const selectOrder = "SELECT * FROM orders WHERE id_order = ?";
        bdd.query(selectOrder, [orderId], (error, result) => {
            if (error) throw error;
            if (result.length === 0) {
                res.status(404).json({ message: "Commande non trouvée" });
            } else {
                res.status(200).json(result[0]);
            }
        });
    }
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

// Lire toutes les commandes d'un user

// Lire toutes les commandes du jour

// Lire toutes les commandes d'une semaine

// Lire toutes les commandes d'un mois

module.exports = router;