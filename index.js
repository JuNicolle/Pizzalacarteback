const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const crudUser = require("./routes/crudUser");
const crudProduct = require("./routes/crudProduct");
const crudCategory = require("./routes/crudCategory");
const crudOrder = require("./routes/crudOrder");
const crudLocation = require("./routes/crudLocation");
const crudOrderItems = require("./routes/crudOrderItems")
const path = require("path");
const productRoutes = require("./routes/productRoutes");
const db = require("./bdd");
const imagePath = path.join(__dirname, 'image');

// AUtorise les requetes de tout les domaines
const cors = require("cors");

// Permet a express de lire des données JSON
app.use(express.json());

app.use(bodyParser.json());
app.use(express.urlencoded());

app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/api/products', (req, res, next) => {
  req.db = db; // votre connexion db existante
  next();
}, productRoutes);

app.use('/images', express.static(imagePath));
const fs = require('fs');


app.use(
  cors({
    origin: "http://localhost:5173", // URL de votre front-end
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
  })
);

app.use("/pizzalacarte", crudUser, crudProduct, crudCategory, crudLocation, crudOrder, crudOrderItems);

app.listen(3000, '0.0.0.0', () => {
  console.log("Serveur lancé sur le port 3000");
});
