const express = require("express");
const bdd = require("../bdd");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const MailService = require("../services/mail.services");
const { authentification } = require("../middleware/auth");


// route creation utilisateur entre le code et la BDD - FONCTIONNE
// avec verification mail si deja existant pour éviter que le serveur plante en cas de tentative de doublon


router.post("/createUser", async (req, res) => {
  const {
    name,
    first_name,
    email,
    password,
    address,
    city,
    zipcode,
    phone
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const insertUser =
      "INSERT INTO users (name, first_name, email, password, address, city, zipcode, phone) VALUES (?,?,?,?,?,?,?,?);";
    const checkMail = "SELECT * FROM users WHERE email LIKE ?;";

    // Vérification si l'email existe déjà
    bdd.query(checkMail, [email], async (error, result) => {
      if (error) {
        throw error;
      }
      if (result.length > 0) {
        res.status(400).send("Email déjà utilisé");
      } else {
        // Insertion de l'utilisateur
        bdd.query(
          insertUser,
          [name, first_name, email, hashedPassword, address, city, zipcode, phone],
          async (error) => {
            if (error) {
              throw error;
            }

            try {
              // Envoi de l'email de bienvenue
              await MailService.sendWelcomeEmail(email, name);
              res.send("Utilisateur créé avec succès !");
            } catch (emailError) {
              console.error("Erreur lors de l'envoi de l'email:", emailError);
              res.send("Utilisateur créé avec succès, mais l'email n'a pas pu être envoyé.");
            }
          }
        );
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Une erreur s'est produite.");
  }
});

  // Consultation de tout les utilisateurs 

  router.get("/readUsers", (req, res) => {
    const readUsers = "SELECT id_user, name, first_name, email, password, role, address, city, zipcode, phone FROM users;";
    bdd.query(readUsers, (error, results) => {
      if (error) throw error;
      res.json(results);
    });
  });


// route pour comparer le mot de passe entré par l'utilisateur avec celui enregistré dans la BDD
// http://127.0.0.1:3000/pizzalacarte/loginUser

router.post("/loginUser", (req, res) => {
  const { email, password } = req.body;
  
  console.log("Tentative de connexion pour email:", email);
  
  if (!email || !password) {
    return res.json({ error: "Email et mot de passe sont requis." });
  }
  
  const checkUser = "SELECT * FROM users WHERE email = ?;";
  bdd.query(checkUser, [email], (err, results) => {
    if (err) throw err;

    if (results.length > 0) {
      const user = results[0];
      
      bcrypt.compare(password, user.password, (error, result) => {
        if (error) {
          console.error("Erreur bcrypt:", error);
          throw error;
        }
        if (result) {
          const token = jwt.sign({ id: user.id_user, email: user.email, role: user.role}, "secretkey", {
            expiresIn: "1h",
          });
          res.json({ message: "Connexion réussie !", token });
        } else {
          res.status(401).json({ error: "Email ou mot de passe incorrect" });
        }
      });
    } else {
      res.status(404).send("Utilisateur non trouvé");
    }
  });
});


  // route de déconnexion
router.post("/logout", (req, res) => {
    // Invalider le jeton côté client
    res.json({ message: "Déconnexion réussie" });
  });

//route lecteur d'un utilisateur par son ID
// http://127.0.0.1:3000/pizzalacarte/readUserById/23 

router.get("/readUserById/:id", auth.authentification, (req, res) => {
    const { id } = req.params;
    if (req.role === "admin") {
      const readUser = "SELECT * FROM users WHERE id_user = ?;";
      bdd.query(readUser, [id], (error, results) => {
          if (error) {
              console.error("Erreur lors de la requête SQL :", error);
              return res.status(500).json({ message: "Erreur serveur." });
          }
          res.json(results);
      });
  } else {
      console.log("Vous n'avez pas accès à cet utilisateur.");
      res.status(403).json({ message: "Vous n'avez pas accès à cet utilisateur." });
  }
  });


  // route suppression des utilisateurs 

router.delete("/deleteUser/:id", auth.authentification, (req, res) => {
    if (req.role == "client") {
      return res.status(401).send("Vous n'avez pas les droits pour supprimer un utilisateur");
    }
    const { id } = req.params;
    const deleteUser = "DELETE FROM users WHERE id_user = ?;";
    bdd.query(deleteUser, [id], (error, results) => {
      if (error) {
        console.log('Impossible de supprimer cet utilisateur : des réservations y sont encore associées.');
      }else{
      res.json({message: "Utilisateur supprimé avec succés", results});
      // res.redirect('/loginUser'); ---- pas deux res. dans le même groupe d'exécution
  
      }
    });
  });

 // Supprimez les deux anciennes routes updateUser et remplacez-les par celle-ci :
 router.post("/updateUser/:id", auth.authentification, async (req, res) => {
  const { id } = req.params;
  const {
      name,
      first_name,
      email,
      password,
      address,
      city,
      zipcode,
      phone
  } = req.body;

  try {
      const checkUser = "SELECT * FROM users WHERE id_user = ?";
      bdd.query(checkUser, [id], async (error, results) => {
          if (error) {
              console.error("Erreur lors de la vérification :", error);
              return res.status(500).json({ error: "Erreur serveur" });
          }
          
          if (results.length === 0) {
              return res.status(404).json({ error: "Utilisateur introuvable" });
          }

          let updateFields = [];
          let queryParams = [];
          
          // Ne mettre à jour que si la valeur est définie et non nulle
          if (name !== undefined && name !== null && name !== '') {
              updateFields.push("name = ?");
              queryParams.push(name);
          }
          if (first_name !== undefined && first_name !== null && first_name !== '') {
              updateFields.push("first_name = ?");
              queryParams.push(first_name);
          }
          if (email !== undefined && email !== null && email !== '') {
              updateFields.push("email = ?");
              queryParams.push(email);
          }
          if (password !== undefined && password !== null && password !== '') {
              const hashedPassword = await bcrypt.hash(password, 10);
              updateFields.push("password = ?");
              queryParams.push(hashedPassword);
          }
          if (address !== undefined && address !== null && address !== '') {
              updateFields.push("address = ?");
              queryParams.push(address);
          }
          if (city !== undefined && city !== null && city !== '') {
              updateFields.push("city = ?");
              queryParams.push(city);
          }
          if (zipcode !== undefined && zipcode !== null && zipcode !== '') {
              updateFields.push("zipcode = ?");
              queryParams.push(zipcode);
          }
          if (phone !== undefined && phone !== null && phone !== '') {
              updateFields.push("phone = ?");
              queryParams.push(phone);
          }

          if (updateFields.length === 0) {
              return res.status(400).json({ error: "Aucun champ à mettre à jour" });
          }

          queryParams.push(id);
          
          const updateQuery = `UPDATE users SET ${updateFields.join(", ")} WHERE id_user = ?`;
          
          bdd.query(updateQuery, queryParams, (updateError, updateResult) => {
              if (updateError) {
                  console.error("Erreur lors de la mise à jour :", updateError);
                  return res.status(500).json({ error: "Erreur lors de la mise à jour" });
              }

              res.status(200).json({ 
                  message: "Utilisateur mis à jour avec succès",
                  updateFields: updateFields // Pour debug
              });
          });
      });
  } catch (error) {
      console.error("Erreur :", error);
      res.status(500).json({ error: "Erreur serveur" });
  }
});

// Pour recuperer son profil
router.get("/me", authentification, (req, res) => {
  const sql = 'SELECT * FROM users WHERE id_user = ?;';
  bdd.query(sql, [req.id_user], (error, result) => {
    if (error){
      res.status(500).send("Erreur serveur");
    } else {
      res.status(200).json(result[0]);
    }
  });
});

// Route pour demander une réinitialisation de mot de passe
router.post("/sendCode", async (req, res) => {
  const { email } = req.body;

  try {
      const checkMail = "SELECT * FROM users WHERE email = ?;";
      
      bdd.query(checkMail, [email], async (error, results) => {
          if (error) {
              throw error;
          }
          
          if (results.length === 0) {
              return res.status(404).send("Aucun compte associé à cet email.");
          }

          const user = results[0];
          // Génère un token de 6 chiffres
          const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
          const tokenExpiration = new Date();
          tokenExpiration.setHours(tokenExpiration.getHours() + 1); // Expire dans 1h

          // Stocke le token en base de données
          const updateToken = "UPDATE users SET reset_token = ?, reset_token_expiration = ? WHERE id_user = ?;";
          
          bdd.query(updateToken, [resetToken, tokenExpiration, user.id_user], async (error) => {
              if (error) {
                  throw error;
              }

              try {
                  await MailService.sendPasswordResetEmail(email, resetToken);
                  res.send("Email de réinitialisation envoyé avec succès.");
              } catch (emailError) {
                  console.error("Erreur lors de l'envoi de l'email:", emailError);
                  res.status(500).send("Erreur lors de l'envoi de l'email.");
              }
          });
      });
  } catch (error) {
      console.error(error);
      res.status(500).send("Une erreur s'est produite.");
  }
});

// Route pour réinitialiser le mot de passe avec le token

router.post("/resetPassword", async (req, res) => {
  console.log("🔍 Requête brute reçue :", req.body);
  const { email, token, newPassword } = req.body;

  console.log("🔍 Requête reçue sur /resetPassword");
  console.log("Email :", email);
  console.log("Token reçu :", token);
  console.log("Nouveau mot de passe :", newPassword);

  if (!email || !token || !newPassword) {
      console.log("❌ Données manquantes !");
      return res.status(400).send("Données manquantes.");
      
  }

  try {
      const verifyToken = "SELECT * FROM users WHERE email = ? AND reset_token = ? AND reset_token_expiration > NOW();";
      
      bdd.query(verifyToken, [email, token], async (error, results) => {
          if (error) {
              throw error;
          }

          if (results.length === 0) {
              return res.status(400).send("Token invalide ou expiré.");
          }

          const hashedPassword = await bcrypt.hash(newPassword, 10);
          const updatePassword = "UPDATE users SET password = ?, reset_token = NULL, reset_token_expiration = NULL WHERE email = ?;";

          bdd.query(updatePassword, [hashedPassword, email], (error) => {
              if (error) {
                  throw error;
              }
              res.send("Mot de passe mis à jour avec succès.");
          });
      });
  } catch (error) {
      console.error(error);
      res.status(500).send("Une erreur s'est produite.");
  }
});
    
module.exports = router;