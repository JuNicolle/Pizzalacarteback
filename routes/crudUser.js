const express = require("express");
const bdd = require("../bdd");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const config = require("../config/config.json");
const MailService = require("../services/mail.services");


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
    const readUsers = "SELECT name, first_name, email, password, address, city, zipcode, phone FROM users;";
    bdd.query(readUsers, (error, results) => {
      if (error) throw error;
      res.json(results);
    });
  });


// route pour comparer le mot de passe entré par l'utilisateur avec celui enregistré dans la BDD
// http://127.0.0.1:3000/pizzalacarte/loginUser

router.post("/loginUser", (req, res) => {
    const { email, password } = req.body;
    // Vérification des données envoyées
    if (!email || !password) {
      return res.json({ error: "Email et mot de passe sont requis." });
    }
    const checkUser ="SELECT * FROM users WHERE email = ?;";
    bdd.query(checkUser, [email], (err, results) => {
      if (err) throw err;
      // console.log("Password envoyé : ", password);
      if (results.length > 0) {
        const user = results[0];
        // console.log("Password hashé : ", user.password);
        console.log(user);
        bcrypt.compare(password, user.password, (error, result) => {
          // console.log(result);
          if (error) throw error;
          if (result) {
            const token = jwt.sign({ id: user.id_user, email: user.email, role: user.role}, "secretkey", {
              expiresIn: "1h",
            });
            res.json({ message: "Connexion réussie !", token });
          console.log("Connexion réussie :", token);
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

router.post("/deleteUser/:id", auth.authentification, (req, res) => {
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

  router.post("/updateUser/:id",  auth.authentification, (req, res) => {
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

      if (!name || !first_name || !email || !password || !address || !city || !zipcode || !phone) {
        return res.status(400).send("Merci de compléter tout les champs.");
    }

     let queryParams= [];
      // let bdd.query(updateUser, [nom, prenom, role, dateNaissance, mail, telephone, adresse, codePostal, ville, pays, idUser], (error) => {
      if (req.role == "client") {
        console.log("vous n aurez pas accès aux modifications du rôle");
        updateUser = "UPDATE users SET name = ?, first_name = ?, email=?, password= ?, address = ?, city = ?, zipcode = ?, phone = ? WHERE id_user = ?;";
       queryParams = [name, first_name, email, password, address, city, zipcode, phone, id]
      }else{
        console.log("vous pouvez modifier meme le role");
        updateUser = "UPDATE users SET name = ?, first_name = ?, email=?, password= ?, address = ?, city = ?, zipcode = ?, phone = ? WHERE id_user = ?;";
        queryParams = [name, first_name, email, password, address, city, zipcode, phone, id]
    }
      bdd.query(updateUser, queryParams, (error, results) => {
        if (error){
          console.error("Erreur lors de la mise à jour de l'utilisateur :", error);
          return res.status(500).send("Une erreur est survenue lors de la mise à jour de l'utilisateur.");
        }
        res.send("Données mises à jour");
      });
    });


// Route MAJ de l'utilisateur par son ID

router.post('/updateUser/:id', (req, res) => {
    if (req.role == 'client') {
        console.log("vous n'avez pas accès à cette fonctionnalité");
        res.status(403).json({ message: "Vous n'avez pas accès à cette fonctionnalité." });
      } else {
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

    bdd.query("SELECT * FROM users WHERE id_user = ?", [id], (error, results) => {
        if (error) {
            console.error("Erreur lors de la vérification :", error);
            res.status(500).json({ error: "Erreur serveur" });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ error: "Utilisateur introuvable" });
            return;
        }

        const updateUser =  "UPDATE users SET name = ?, first_name = ?, email = ?, password = ?, address = ?, city = ?, zipcode = ?, phone = ? WHERE id_user = ?;"
        bdd.query(updateUser, [name,
            first_name,
            email,
            password,
            address,
            city,
            zipcode,
            phone,
            id], (erreur, results) => {
            if (erreur) {
                console.error("Erreur lors de la modification :", erreur);
                res.status(500).json({ error: "Erreur lors de la modification des données" });
                return;
            }
            res.json(results);
        });
    })};
  });

// Route pour demander une réinitialisation de mot de passe
router.post("/forgotPassword", async (req, res) => {
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
  const { email, token, newPassword } = req.body;

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