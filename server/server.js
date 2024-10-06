
import express from 'express';
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';
import cors from 'cors'; // Importez cors

const app = express();
const port = process.env.PORT || 4000;

// Middleware pour activer CORS
app.use(cors()); // Cela permet toutes les origines, à personnaliser si besoin

// Middleware pour analyser le corps des requêtes JSON
app.use(bodyParser.json());

// Route pour envoyer un e-mail
app.post('/api/send-email', async (req, res) => {
    const { subject, message } = req.body; // Assurez-vous d'inclure 'to'

    if (!subject) {
        return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Vous pouvez choisir un autre service
            auth: {
                user: 'hatoproductions@gmail.com', // Remplacez par votre adresse e-mail
                pass: 'cgrbzzqsejaorkzf', // Remplacez par votre mot de passe ou un mot de passe d'application
            },
        });

        const mailOptions = {
            from: 'hatoproductions@gmail.com', // Votre adresse e-mail vérifiée
            to: 'hatovod@gmail.com', // Destinataire
            subject: subject,
            text: message,
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ message: 'E-mail envoyé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'e-mail:', error);
        return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'e-mail' });
    }
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
