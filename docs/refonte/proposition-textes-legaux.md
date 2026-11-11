# Proposition de rédaction : données personnelles (à valider, non appliquée)

Les textes actuels (`CGU.DATA`, `PRIVACY.*`) disent qu'aucune donnée n'est collectée. Or le site :

- envoie par e-mail les demandes de mise à jour des matchups (formulaire : champions, type de problème, message facultatif) via `api/send-email` (Gmail) ;
- charge Google AdSense (cookies publicitaires) après consentement, via le CMP Google « Confidentialité et messages » ;
- est hébergé par Vercel (journaux techniques : adresse IP, navigateur) ;
- intègre YouTube (mode confidentialité renforcée, chargé au clic) et le lecteur Twitch (au clic).

Les éléments entre crochets sont à compléter par l'éditeur. Rien n'est appliqué au site tant que ce texte n'est pas validé.

---

## CGU — « Gestion des données » (remplace `CGU.DATA.DESCRIPTION`)

> Le site ne demande pas de créer de compte. Certaines données sont toutefois traitées : le contenu des formulaires que vous envoyez volontairement, les données techniques nécessaires à l'hébergement, et, avec votre accord, les cookies publicitaires de Google. Le détail figure dans la politique de confidentialité.

## Politique de confidentialité

**1. Responsable du traitement.** [Nom de l'éditeur], joignable à [adresse e-mail de contact].

**2. Données traitées et finalités.**
- *Formulaire « Demande de mise à jour »* : champions concernés, type de problème et message facultatif. Ces informations sont transmises par e-mail à l'éditeur pour corriger les données du site. Le formulaire ne demande ni nom ni adresse e-mail ; n'y indiquez pas d'informations personnelles. Base légale : intérêt légitime (amélioration du contenu). Conservation : [durée, par ex. 12 mois] dans la boîte e-mail de l'éditeur.
- *Hébergement* : l'hébergeur Vercel Inc. traite des données techniques (adresse IP, type de navigateur, pages demandées) pour fournir le service et le sécuriser. Base légale : intérêt légitime. Conservation : selon la politique de Vercel.
- *Publicité* : Google AdSense peut déposer des cookies et traiter des identifiants pour afficher des publicités, personnalisées ou non. Ces traitements n'ont lieu qu'après votre choix dans la fenêtre de consentement (certifiée IAB TCF v2.2). Base légale : consentement, modifiable à tout moment via le lien « Gérer les cookies » [à ajouter dans le pied de page une fois le CMP publié].
- *Contenus intégrés* : la vidéo YouTube (mode confidentialité renforcée) et le lecteur Twitch ne se chargent qu'à votre demande. Les plateformes concernées appliquent alors leurs propres politiques.

**3. Destinataires.** L'éditeur ; les sous-traitants techniques (Vercel pour l'hébergement, Google pour la messagerie et la publicité). Certaines données peuvent être transférées hors de l'Union européenne (États-Unis), dans le cadre des garanties prévues par ces prestataires [à vérifier : Data Privacy Framework / clauses contractuelles types].

**4. Vos droits.** Accès, rectification, effacement, opposition, limitation et retrait du consentement, en écrivant à [adresse e-mail de contact]. Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).

**5. Cookies.** Le site lui-même ne dépose pas de cookie de mesure d'audience. Les cookies publicitaires de Google ne sont déposés qu'avec votre consentement. Certaines préférences peuvent être conservées localement dans votre navigateur.

**6. Modifications.** Cette politique peut évoluer ; la date de mise à jour est indiquée en tête de page [à ajouter].
