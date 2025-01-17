// services/mail.service.js
const transporter = require('../config/mailer.config');
const config = require('../config/config');

class MailService {
    static async sendWelcomeEmail(userEmail, userName) {
        try {
            const mailOptions = {
                from: config.email.user,
                to: userEmail,
                subject: 'Bienvenue sur Pizza La Carte !',
                html: `
                    <h1>Bienvenue ${userName} !</h1>
                    <p>Nous sommes ravis de vous compter parmi nos clients.</p>
                    <p>Vous pouvez maintenant commander vos pizzas préférées sur notre site.</p>
                    <p>À bientôt !</p>
                    <p>L'équipe Pizza La Carte</p>
                `
            };
            
            return await transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Erreur envoi email:', error);
            throw new Error('Erreur lors de l\'envoi de l\'email de bienvenue');
        }
    }
    
    static async sendPasswordResetEmail(userEmail, resetToken) {
        try {
            console.log('Tentative d\'envoi d\'email de reset à:', userEmail);
            console.log('Token généré:', resetToken);
    
            const mailOptions = {
                from: config.email.user,
                to: userEmail,
                subject: 'Réinitialisation de votre mot de passe - Pizza La Carte',
                html: `
                    <h1>Réinitialisation de mot de passe</h1>
                    <p>Tu as demandé une réinitialisation de ton mot de passe.</p>
                    <p style="font-size: 24px; font-weight: bold; color: #4a90e2;">
                        Ton code de réinitialisation : ${resetToken}
                    </p>
                    <p>Si tu n'as pas demandé cette réinitialisation, ignore cet email.</p>
                    <p>L'équipe Pizza La Carte</p>
                `
            };
            
            console.log('Options email configurées');
            const result = await transporter.sendMail(mailOptions);
            console.log('Résultat envoi:', result);
            return result;
        } catch (error) {
            console.error('Erreur détaillée:', error);
            throw new Error('Erreur lors de l\'envoi de l\'email de réinitialisation');
        }
    }
}

module.exports = MailService;