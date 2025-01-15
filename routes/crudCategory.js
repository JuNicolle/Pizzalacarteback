const express = require("express");
const bdd = require("../bdd");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

// route creation categorie entre le code et la BDD

router.post("/createCategory", auth.authentification, async (req, res) => {
  if (req.role == "client") {
    console.log("vous n'avez pas accès à cette fonctionnalité");
    res
      .status(403)
      .json({ message: "Vous n'avez pas accès à cette fonctionnalité." });
  } else {
    const { name, description } = req.body;

    const insertCategory =
      "INSERT INTO product_categories (name, description) VALUES (?,?);";
    bdd.query(insertCategory, [name, description], (error) => {
      if (error) throw error;
      res.send("Nouvelle catégorie ajoute");
    });
  }
});

// Consultation de tout les produits - FONCTIONNE

router.get("/readCategories", (req, res) => {
  const readCategories =
    "SELECT name, description FROM product_categories;";
  bdd.query(readCategories, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

// Consultation de toutes les categories - FONCTIONNE

router.get("/readCategoryById/:idCategory", (req, res) => {
  const { idCategory } = req.params;
  const readcategoryById =
    "SELECT name, description FROM product_categories where id_category = ?;";
  bdd.query(readcategoryById, [idCategory], (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

// Route MAJ d'une catégorie - FONCTIONNE

router.post("/updateCategory/:id", auth.authentification, (req, res) => {
  if (req.role == "client") {
    console.log("vous n'avez pas accès à cette fonctionnalité");
    res
      .status(403)
      .json({ message: "Vous n'avez pas accès à cette fonctionnalité." });
  } else {
    const { id } = req.params;
    const {
      name,
      description
    } = req.body;

    bdd.query(
      "SELECT name, description FROM product_categories WHERE id_category = ?",
      [id],
      (error, results) => {
        if (error) {
          console.error("Erreur lors de la vérification :", error);
          res.status(500).json({ error: "Erreur serveur" });
          return;
        }
        if (results.length === 0) {
          res.status(404).json({ error: "Produit introuvable" });
          return;
        }

        const updateCategory =
          "UPDATE product_categories SET name = ?, description = ? WHERE id_category = ?;";
        bdd.query(
          updateCategory,
          [
            name,
            description,
            id
          ],
          (erreur, results) => {
            if (erreur) {
              console.error("Erreur lors de la modification :", erreur);
              res
                .status(500)
                .json({ error: "Erreur lors de la modification des données" });
              return;
            }
            res.json({ message: "Catégorie modifiée avec succés", results });
          }
        );
      }
    );
  }
});

// route suppression d'une catégorie 

router.delete("/deleteCategory/:idCategory", auth.authentification, (req, res) => {
      if (req.role == "client") {
        console.log("vous n'avez pas accès à cette fonctionnalité");
        res
          .status(403)
          .json({ message: "Vous n'avez pas accès à cette fonctionnalité." });
      } else {
        const { idCategory } = req.params;
  
        const deleteCategory = "DELETE FROM product_categories WHERE id_category = ?;";
        bdd.query(deleteCategory, [idCategory], (error, results) => {
          if (error) throw error;
          res.json(results);
        });
      }
    }
  );

module.exports = router;
