const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const crudUser = require("./routes/crudUser");
const crudProduct = require("./routes/crudProduct");
const crudCategory = require("./routes/crudCategory");
const crudOrder = require("./routes/crudOrder");
const crudLocation = require("./routes/crudLocation");

const chemin = require("path");

// AUtorise les requetes de tout les domaines
const cors = require("cors");

// Permet a express de lire des données JSON
app.use(express.json());

app.use(bodyParser.json());
app.use(express.urlencoded());

app.use(
  cors({
    origin: "http://localhost:5173", // URL de votre front-end
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
  })
);

app.use("/pizzalacarte", crudUser, crudProduct, crudCategory, crudLocation, crudOrder);

app.listen(3000, () => {
  console.log("Serveur lancé sur le port 3000");
});
