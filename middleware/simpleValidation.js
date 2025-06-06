// middleware/simpleValidation.js
class SimpleServerValidation {
    // Mêmes regex côté serveur
    static patterns = {
        name: /^[a-zA-ZÀ-ÿ\s\-']{2,50}$/,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^0?[1-9][0-9]{8}$/,
        zipcode: /^[0-9]{5}$/,
        password: /^.{6,}$/
    };

    // Nettoyer les données dangereuses
    static cleanInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .trim()
            .replace(/[<>]/g, '') // Supprimer < et >
            .replace(/['"]/g, '') // Supprimer quotes pour éviter SQL injection
            .substring(0, 100); // Limiter la longueur
    }

    // Middleware pour valider l'inscription
    static validateUserRegistration(req, res, next) {
        const { name, first_name, email, password, phone, zipcode } = req.body;
        const errors = [];

        // Vérifier les champs obligatoires
        if (!name || !first_name || !email || !password || !phone || !zipcode) {
            return res.status(400).json({ error: "Tous les champs sont obligatoires" });
        }

        // Valider nom
        const cleanName = this.cleanInput(name);
        if (!this.patterns.name.test(cleanName)) {
            errors.push("Nom invalide");
        }

        // Valider prénom
        const cleanFirstName = this.cleanInput(first_name);
        if (!this.patterns.name.test(cleanFirstName)) {
            errors.push("Prénom invalide");
        }

        // Valider email
        const cleanEmail = this.cleanInput(email);
        if (!this.patterns.email.test(cleanEmail)) {
            errors.push("Email invalide");
        }

        // Valider mot de passe
        if (!this.patterns.password.test(password)) {
            errors.push("Mot de passe trop court (minimum 6 caractères)");
        }

        // Valider téléphone
        const cleanPhone = this.cleanInput(phone);
        if (!this.patterns.phone.test(cleanPhone)) {
            errors.push("Numéro de téléphone invalide");
        }

        // Valider code postal
        const cleanZipcode = this.cleanInput(zipcode);
        if (!this.patterns.zipcode.test(cleanZipcode)) {
            errors.push("Code postal invalide");
        }

        if (errors.length > 0) {
            return res.status(400).json({ 
                error: "Données invalides", 
                details: errors 
            });
        }

        // Remplacer par les données nettoyées
        req.body.name = cleanName;
        req.body.first_name = cleanFirstName;
        req.body.email = cleanEmail.toLowerCase(); // Email en minuscules
        req.body.phone = cleanPhone;
        req.body.zipcode = cleanZipcode;
        req.body.address = this.cleanInput(req.body.address || '');
        req.body.city = this.cleanInput(req.body.city || '');

        next();
    }
}

module.exports = SimpleServerValidation;