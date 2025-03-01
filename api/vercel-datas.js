// api/vercel-datas.js
export default function handler(req, res) {
    if (req.method === 'GET') {
      // Accède aux variables d'environnement pour récupérer les données sensibles
      const RIOT_API_KEY = process.env.RIOT_API_KEY;
      const TWITCH_TOKEN = process.env.TWITCH_TOKEN;
  
      if (!RIOT_API_KEY || !TWITCH_TOKEN) {
        return res.status(404).json({ error: 'Données non trouvées' });
      }

      try {
        // Retourner les données sensibles sous forme de JSON
        return res.status(200).json({ RIOT_API_KEY: RIOT_API_KEY, TWITCH_TOKEN: TWITCH_TOKEN });
      } catch (error) {
        return res.status(500).json({ error: 'Erreur'});
      }
    } else {
      // Si la méthode n'est pas GET, on renvoie une erreur
      return res.status(405).json({ error: 'Méthode non autorisée' });
    }
  }
  