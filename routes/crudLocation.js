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

// Récupérer les emplacements du jour actuel
router.get("/getTodayLocations", async (req, res) => {
    try {
        // Tableau des jours de la semaine en français
        const daysWeek = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
        
        // Obtenir le jour actuel (0 = Dimanche, 1 = Lundi, etc.)
        const date = new Date();
        const actualDay = daysWeek[date.getDay()];
        
        // Requête SQL utilisant LIKE pour trouver les emplacements correspondants au jour actuel
        const readLocationsToday = `
            SELECT * FROM locations 
            WHERE schedule LIKE ? AND active = 1
            ORDER BY 
                CASE 
                    WHEN schedule LIKE ? THEN 0
                    WHEN schedule LIKE ? THEN 1
                    ELSE 2
                END
        `;
        
        // Paramètres pour rechercher les correspondances du jour actuel (matin et soir)
        bdd.query(
            readLocationsToday, 
            [`%${actualDay}%`, `%${actualDay} Midi%`, `%${actualDay} Soir%`], 
            (error, result) => {
                if (error) {
                    console.error("Erreur lors de la récupération des emplacements:", error);
                    return res.status(500).json({ message: "Erreur serveur" });
                }
                res.status(200).json(result);
            }
        );
    } catch (error) {
        console.error("Erreur:", error);
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
});

module.exports = router;