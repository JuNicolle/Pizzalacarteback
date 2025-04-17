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

    static async sendLoginLimitEmail(userEmail, userName, resetToken) {
        try {
            const mailOptions = {
                from: config.email.user,
                to: userEmail,
                subject: 'Sécurité de votre compte - Pizza La Carte',
                html: `
                <h1>Alerte de sécurité</h1>
                <p>Bonjour ${userName},</p>
                <p>Nous avons détecté plusieurs tentatives de connexion échouées sur votre compte.</p>
                <p>Si c'était vous, vous pouvez utiliser le code ci-dessous pour réinitialiser votre mot de passe :</p>
                <p style="font-size: 24px; font-weight: bold; color: #4a90e2;">
                    Code de réinitialisation : ${resetToken}
                </p>
                <p>Si vous n'avez pas tenté de vous connecter récemment, nous vous recommandons de réinitialiser votre mot de passe immédiatement.</p>
                <p>L'équipe Pizza La Carte</p>
            `
            };

            return await transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Erreur envoi email de sécurité:', error);
            throw new Error('Erreur lors de l\'envoi de l\'email d\'alerte de sécurité');
        }
    }


    static async sendPasswordResetEmail(userEmail, resetToken) {
        try {
    
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
            
            const result = await transporter.sendMail(mailOptions);
            return result;
        } catch (error) {
            throw new Error('Erreur lors de l\'envoi de l\'email de réinitialisation');
        }
    }
}



module.exports = MailService;