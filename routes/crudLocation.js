const express = require("express");
const bdd = require("../bdd");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const config = require("../config/config.json");


// Créer un nouvel emplacement - FONCTIONNE

router.post("/createLocation", auth.authentification, async (req, res) => {
    if (req.role !== "admin") {
        return res.status(403).json({ message: "Accès refusé" });
    }

    const { name, address, schedule } = req.body;
    const createLocation = "INSERT INTO locations (name, address, schedule) VALUES (?, ?, ?)";
    
    bdd.query(createLocation, [name, address, schedule], (error, result) => {
        if (error) throw error;
        res.status(201).json({
            message: "Emplacement créé avec succès"
        });
    });
});

// Récupérer tous les emplacements - FONCTIONNE

router.get("/getAllLocations", async (req, res) => {
    const readAllLocations = "SELECT * FROM locations";
    
    bdd.query(readAllLocations, (error, result) => {
        if (error) throw error;
        res.status(200).json(result);
    });
});

// Récupérer un emplacement spécifique - FONCTIONNE

router.get("/getLocation/:id", async (req, res) => {
    const locationId = req.params.id;
    const getLocationById = "SELECT * FROM locations WHERE id_location = ?";
    
    bdd.query(getLocationById, [locationId], (error, result) => {
        if (error) throw error;
        
        if (result.length === 0) {
            return res.status(404).json({ message: "Emplacement non trouvé" });
        }
        
        res.status(200).json(result[0]);
    });
});

// Mettre à jour un emplacement 

router.put("/updateLocation/:id", auth.authentification, async (req, res) => {
    if (req.role !== "admin") {
        return res.status(403).json({ message: "Accès refusé" });
    }

    const locationId = req.params.id;
    const { name, address, schedule, active } = req.body;
    const updateLocation = "UPDATE locations SET name = ?, address = ?, schedule = ?, active = ? WHERE id_location = ?";
    
    bdd.query(updateLocation, [name, address, schedule, active, locationId], (error, result) => {
        if (error) throw error;
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Emplacement non trouvé" });
        }
        
        res.status(200).json({ message: "Emplacement mis à jour avec succès" });
    });
});

// Supprimer un emplacement - FONCTIONNE

router.delete("/deleteLocation/:id", auth.authentification, async (req, res) => {
    if (req.role !== "admin") {
        return res.status(403).json({ message: "Accès refusé" });
    }

    const locationId = req.params.id;
    const query = "DELETE FROM locations WHERE id_location = ?";
    
    bdd.query(query, [locationId], (error, result) => {
        if (error) throw error;
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Emplacement non trouvé" });
        }
        
        res.status(200).json({ message: "Emplacement supprimé avec succès" });
    });
});

module.exports = router;