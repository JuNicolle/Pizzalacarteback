const express = require("express");
const bdd = require("../bdd");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

// route creation produit entre le code et la BDD - FONCTIONNE

router.post("/createProduct", auth.authentification, async (req, res) => {
  if (req.role == "client") {
    console.log("vous n'avez pas accès à cette fonctionnalité");
    res
      .status(403)
      .json({ message: "Vous n'avez pas accès à cette fonctionnalité." });
  } else {
    const {
      name,
      category_id,
      description,
      price,
      image_url,
      allergens,
      availability,
    } = req.body;

    const insertProduct =
      "INSERT INTO products (name, category_id, description, price, image_url, allergens, availability) VALUES (?,?,?,?,?,?,?);";
    bdd.query(
      insertProduct,
      [
        name,
        category_id,
        description,
        price,
        image_url,
        allergens,
        availability,
      ],
      (error) => {
        if (error) throw error;
        res.send("Nouveau produit ajoute");
      }
    );
  }
});

// Consultation de tout les produits - FONCTIONNE

router.get("/readProducts", (req, res) => {
  const readProducts =
    "SELECT name, category_id, description, price, image_url, allergens, availability FROM products;";
  bdd.query(readProducts, [category_id], (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

// Route pour recuperer les produits par catégorie - FONCTIONNE

router.get("/readProductsByCategory/:category_id", (req, res) => {
  const { category_id } = req.params;
  const readProductsByCategory =
    "SELECT name, category_id, description, price, image_url, allergens, availability FROM products WHERE category_id = ?;";
  bdd.query(readProductsByCategory, [category_id], (error, results) => {
    if (error) {
      console.error("SQL Error:", error);
      return res.status(500).send("Error retrieving products.");
    }
    res.json(results);
  });
});

// Route pour recuperer un produit par son id - FONCTIONNE

router.get("/readProductById/:idProduct", (req, res) => {
  const { idProduct } = req.params;
  const readProductById =
    "SELECT name, category_id, description, price, image_url, allergens, availability FROM products WHERE id_product = ?;";
  bdd.query(readProductById, [idProduct], (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

// route suppression d'un produit - FONCTIONNE

router.delete(
  "/deleteProduct/:idProduct",
  auth.authentification,
  (req, res) => {
    if (req.role == "client") {
      console.log("vous n'avez pas accès à cette fonctionnalité");
      res
        .status(403)
        .json({ message: "Vous n'avez pas accès à cette fonctionnalité." });
    } else {
      const { idProduct } = req.params;

      const deleteProduct = "DELETE FROM products WHERE id_product = ?;";
      bdd.query(deleteProduct, [idProduct], (error, results) => {
        if (error) throw error;
        res.json(results);
      });
    }
  }
);

// Route MAJ d'un produit - FONCTIONNE

router.post("/updateProduct/:id", auth.authentification, (req, res) => {
  if (req.role == "client") {
    console.log("vous n'avez pas accès à cette fonctionnalité");
    res
      .status(403)
      .json({ message: "Vous n'avez pas accès à cette fonctionnalité." });
  } else {
    const { id } = req.params;
    const {
      name,
      category_id,
      description,
      price,
      image_url,
      allergens,
      availability,
    } = req.body;

    bdd.query(
      "SELECT * FROM products WHERE id_product = ?",
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

        const updateUser =
          "UPDATE products SET name = ?, category_id = ?, description = ?, price = ?, image_url = ?, allergens = ?, availability = ? WHERE id_product = ?;";
        bdd.query(
          updateUser,
          [
            name,
            category_id,
            description,
            price,
            image_url,
            allergens,
            availability,
            id,
          ],
          (erreur, results) => {
            if (erreur) {
              console.error("Erreur lors de la modification :", erreur);
              res
                .status(500)
                .json({ error: "Erreur lors de la modification des données" });
              return;
            }
            res.json({ message: "Produit modifié avec succés", results });
          }
        );
      }
    );
  }
});

module.exports = router;
