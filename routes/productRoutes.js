// productRoutes.js
const express = require('express');
const router = express.Router();
const imageService = require('../services/imageService');

router.get('/:id', async (req, res) => {
    try {
      const [rows] = await req.db.promise().query('SELECT * FROM products WHERE id_product = ?', [req.params.id]);
      const product = rows[0];
      if (!product) return res.status(404).send('Produit non trouvé');
      
      const imagePath = imageService.getImagePath(product.image_url);
      res.json({ ...product, imagePath });
    } catch (error) {
      res.status(500).send(error.message);
    }
  });

module.exports = router;