import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end(); // Répondre avec un statut 200 pour les requêtes OPTIONS
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subject,message } = req.body;

  if (!subject) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Utilisez des variables d'environnement
        pass: process.env.EMAIL_PASS, // Utilisez des variables d'environnement
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'hatovod@gmail.com', // Destinataire (peut aussi être dynamique si souhaité)
      subject: subject,
      text: message,
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: 'E-mail envoyé avec succès' });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'e-mail:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'e-mail' });
  }
}
