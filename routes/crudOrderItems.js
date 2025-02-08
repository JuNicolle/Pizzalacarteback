const express = require("express");
const bdd = require("../bdd");
const router = express.Router();
const auth = require("../middleware/auth");

// Ajouter un produit à une commande
router.post("/addToOrder", auth.authentification, async (req, res) => {
  try {
    const { order_id, product_id, quantity, special_instructions } = req.body;

    // Vérifier si la commande existe
    const checkOrder = "SELECT id_order FROM orders WHERE id_order = ?";
    bdd.query(checkOrder, [order_id], (error, orderResults) => {
      if (error) {
        console.error("Erreur vérification commande:", error);
        return res
          .status(500)
          .json({ error: "Erreur lors de la vérification de la commande" });
      }
      if (orderResults.length === 0) {
        return res.status(404).json({ error: "Commande non trouvée" });
      }

      // Vérifier si le produit existe et est disponible
      const checkProduct =
        "SELECT id_product, availability FROM products WHERE id_product = ?";
      bdd.query(checkProduct, [product_id], (error, productResults) => {
        if (error) {
          console.error("Erreur vérification produit:", error);
          return res
            .status(500)
            .json({ error: "Erreur lors de la vérification du produit" });
        }
        if (productResults.length === 0) {
          return res.status(404).json({ error: "Produit non trouvé" });
        }
        if (!productResults[0].availability) {
          return res.status(400).json({ error: "Produit non disponible" });
        }

        // Ajouter le produit à la commande - Notez le changement de "orders_item" à "order_items"
        const addToOrder = `
                    INSERT INTO order_items (order_id, product_id, quantity, special_instructions) 
                    VALUES (?, ?, ?, ?)
                `;

        bdd.query(
          addToOrder,
          [order_id, product_id, quantity, special_instructions],
          (error, insertResults) => {
            if (error) {
              console.error("Erreur insertion commande:", error);
              return res.status(500).json({
                error: "Erreur lors de l'ajout du produit",
                details: error.message,
              });
            }

            // Mettre à jour le prix total de la commande - Notez le changement ici aussi
            const updateOrderTotal = `
                        UPDATE orders o 
                        SET total_price = (
                            SELECT SUM(p.price * oi.quantity) 
                            FROM order_items oi 
                            JOIN products p ON oi.product_id = p.id_product 
                            WHERE oi.order_id = ?
                        )
                        WHERE o.id_order = ?
                    `;

            bdd.query(updateOrderTotal, [order_id, order_id], (error) => {
              if (error) {
                console.error("Erreur mise à jour total:", error);
                return res
                  .status(500)
                  .json({
                    error: "Erreur lors de la mise à jour du prix total",
                  });
              }
              res.json({
                message: "Produit ajouté à la commande avec succès",
                orderId: order_id,
                insertId: insertResults.insertId,
              });
            });
            const getUpdatedCart = `
    SELECT oi.id_order_item, oi.quantity, p.name, p.price, p.image_url 
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id_product
    WHERE oi.order_id = ?
`;

            bdd.query(getUpdatedCart, [order_id], (error, cartItems) => {
              if (error) {
                return res
                  .status(500)
                  .json({ error: "Erreur lors de la récupération du panier" });
              }
              res.json({
                message: "Produit ajouté à la commande avec succès",
                orderId: order_id,
                cart: {
                  items: cartItems,
                  totalPrice: cartItems.reduce(
                    (total, item) => total + item.price * item.quantity,
                    0
                  ),
                },
              });
            });
          }
        );
      });
    });
  } catch (error) {
    console.error("Erreur générale:", error);
    res.status(500).json({ error: "Erreur serveur", details: error.message });
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
      return res
        .status(500)
        .json({ error: "Erreur lors de la récupération des produits" });
    }
    res.json(results);
  });
});

// Modifier la quantité d'un produit dans la commande
router.put("/updateQuantity", auth.authentification, (req, res) => {
  const { order_id, product_id, quantity } = req.body;

  if (quantity <= 0) {
    const removeItem =
      "DELETE FROM orders_item WHERE order_id = ? AND product_id = ?";
    bdd.query(removeItem, [order_id, product_id], (error) => {
      if (error) {
        return res
          .status(500)
          .json({ error: "Erreur lors de la suppression du produit" });
      }
      res.json({ message: "Produit retiré de la commande" });
    });
  } else {
    const updateQuantity =
      "UPDATE orders_item SET quantity = ? WHERE order_id = ? AND product_id = ?";
    bdd.query(updateQuantity, [quantity, order_id, product_id], (error) => {
      if (error) {
        return res
          .status(500)
          .json({ error: "Erreur lors de la mise à jour de la quantité" });
      }
      res.json({ message: "Quantité mise à jour avec succès" });
    });
  }
});

module.exports = router;
