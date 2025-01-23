import React from "react";
import { Button } from "react-bootstrap";

const ProductModal = ({ show, onClose, product }) => {
  if (!show) return null;

  return (
    <div  style={overlayStyles}>
      <div className="productModal" >
        <h2>{product.name}</h2>
        <img src={`http://localhost:3000/images/${product.image_url}`} alt="" />
        <p>{product.description}</p>
        <p>Allergènes : {product.allergens}</p>
        <p>Prix : {product.price} €</p>
        Commentaires :
        <input type="text"></input>
        <Button variant="success">Ajouter au panier</Button>
        <Button variant="danger" onClick={onClose}>Fermer</Button>
      </div>
    </div>
  );
};

// Styles
const overlayStyles = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  
};

const modalStyles = {
  backgroundColor: "#fff",
  padding: "20px",
  borderRadius: "5px",
  width: "300px",
  textAlign: "center",
};

export default ProductModal;