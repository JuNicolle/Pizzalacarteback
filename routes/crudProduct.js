const express = require("express");
const bdd = require("../bdd");
const router = express.Router();
const {authentification} = require("../middleware/auth");
const upload = require('../middleware/multer');

// route creation produit entre le code et la BDD - FONCTIONNE

router.post("/createProduct", authentification, upload.single('image'), (req, res) => {
  const { name, description, price, category_id, allergens, availability } = req.body;
  
  if (req.role !== 'admin') {
      console.log("Erreur: rôle non autorisé -", req.role);
      return res.status(403).json({ error: 'Accès refusé. Seuls les administrateurs peuvent créer des produits.' });
  }

  if (!name || !description || !price || !category_id || !allergens || !availability) {
      return res.status(400).json({ 
          error: 'Tous les champs sont requis',
          missing: {
              name: !name,
              description: !description,
              price: !price,
              category_id: !category_id,
              allergens: !allergens,
              availability: !availability
          }
      });
  }

  const image_url = req.file ? req.file.filename : null;

  if (!image_url) {
      return res.status(400).json({ error: 'Une image est requise' });
  }

  const query = `INSERT INTO products (name, description, price, category_id, image_url, allergens, availability) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
  
  const values = [name, description, price, category_id, image_url, allergens, availability];

  bdd.query(query, values, (err, results) => {
      if (err) {
          console.error("Erreur SQL:", err);
          return res.status(500).json({ error: 'Erreur lors de la création du produit', details: err.message });
      }
      
      res.status(201).json({ 
          message: 'Produit créé avec succès', 
          productId: results.insertId,
          image_url: image_url
      });
  });
});

// Consultation de tout les produits - FONCTIONNE

router.get("/readProducts", (req, res) => {
  const readProducts = `
    SELECT 
      p.id_product, 
      p.name, 
      p.category_id,
      pc.name as category_name, 
      p.description, 
      p.price, 
      p.image_url, 
      p.allergens, 
      p.availability 
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id_category;`;
    
  bdd.query(readProducts, [], (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

// Route pour recuperer un produit par son id - FONCTIONNE

router.get("/readProductById/:idProduct", (req, res) => {
  const { idProduct } = req.params;
  const readProductById = `
    SELECT 
      p.name, 
      p.category_id,
      pc.name as category_name, 
      p.description, 
      p.price, 
      p.image_url, 
      p.allergens, 
      p.availability 
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id_category
    WHERE p.id_product = ?;`;
    
  bdd.query(readProductById, [idProduct], (error, results) => {
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


// route suppression d'un produit - FONCTIONNE

router.delete(
  "/deleteProduct/:idProduct",
  authentification,
  (req, res) => {
    if (req.role == "client") {
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

router.post("/updateProduct/:id", authentification, upload.single('image'), (req, res) => {
  const productId = req.params.id;
  const { name, description, price, category_id, allergens, availability } = req.body;
  
  // Vérification du rôle admin
  if (req.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé. Seuls les administrateurs peuvent modifier des produits.' });
  }

  // Construire la requête de mise à jour
  let query = `UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, allergens = ?, availability = ?`;
  let values = [name, description, price, category_id, allergens, availability];
  
  // Si une nouvelle image est uploadée, l'inclure dans la mise à jour
  if (req.file) {
      query += `, image_url = ?`;
      values.push(req.file.filename);
  }
  
  query += ` WHERE id_product = ?`;
  values.push(productId);

  bdd.query(query, values, (err, results) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Erreur lors de la mise à jour du produit' });
      }
      
      if (results.affectedRows === 0) {
          return res.status(404).json({ error: 'Produit non trouvé' });
      }
      
      res.json({ 
          message: 'Produit mis à jour avec succès',
          image_url: req.file ? req.file.filename : undefined
      });
  });
});;


module.exports = router;
