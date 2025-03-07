// api/vercel-datas.js
export default function handler(req, res) {
    // Ajoute les en-têtes CORS pour autoriser les requêtes depuis localhost
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
    // Vérifie si la méthode est OPTIONS, utile pour la gestion des pré-requêtes CORS
    if (req.method === 'OPTIONS') {
      return res.status(200).end(); // Réponds avec un statut 200 pour les pré-requêtes OPTIONS
    }
  
    const RIOT_API_KEY = process.env.RIOT_API_KEY;
    const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
    const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
    const TWITCH_ACCESS_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
    const EMAIL_PASS = process.env.EMAIL_PASS;
    const EMAIL_USER = process.env.EMAIL_USER;
  
    // Vérifie si les variables d'environnement existent
    if (!RIOT_API_KEY || !TWITCH_CLIENT_SECRET || !TWITCH_CLIENT_ID || !TWITCH_ACCESS_TOKEN || !EMAIL_PASS || !EMAIL_USER) {
      return res.status(500).json({ error: 'Variables d\'environnement manquantes' });
    }
  
    // Retourne un objet JSON avec les données
    return res.status(200).json({ RIOT_API_KEY, TWITCH_TOKEN,TWITCH_CLIENT_ID, EMAIL_PASS ,EMAIL_USER });
  }
  