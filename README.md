# NCR MCO Quiz Arena — V2.2

Application de quiz live BTS MCO pour une utilisation en classe : l’hôte projette la partie, les élèves rejoignent par QR code ou code à 6 chiffres, répondent depuis leur téléphone, puis le classement et le podium sont affichés en temps réel.

## Nouveautés V2.2

- **1 347 questions** dans la banque ADOC/DRCV, avec davantage de variantes courtes par notion ;
- toujours aucune question ou réponse tronquée avec des points de suspension ;
- choix de 5, 10, 15, 20, 30, 40, 50 ou 60 questions selon le volume disponible ;
- choix d’un **avatar** lors de l’entrée dans la salle ;
- avatar visible dans le lobby, le classement et le podium ;
- bouton **Rejouer avec la même classe** à la fin : les élèves restent connectés, les scores et réponses sont remis à zéro et une nouvelle sélection de questions est tirée ;
- bouton **Changer le quiz • garder les joueurs** : le formateur peut choisir une autre matière, année, chapitre ou séance sans faire rescanner le QR code aux élèves ;
- reconnexion automatique d’un élève sur le même appareil si la page est actualisée ;
- responsive mobile conservé et optimisé pour les écrans élèves.

## Banque de questions

- ADOC 1re année
- ADOC 2e année
- DRCV 1re année
- DRCV 2e année
- **1 347 questions** au total
- filtres matière > année > chapitre > séance
- tirage aléatoire à chaque manche

Les formulations de jeu restent volontairement courtes. Les corrections restent plus développées après chaque question afin que le formateur puisse exploiter la réponse avec la classe.

## Mise à jour Supabase obligatoire pour la V2.2

Si tu avais déjà exécuté le SQL d’une ancienne version, **réexécute le fichier `supabase.sql` de cette V2.2**. Il ajoute :

- la colonne `avatar` sur les joueurs ;
- l’autorisation de supprimer les réponses d’une manche, nécessaire pour relancer un quiz avec les mêmes joueurs.

Le script utilise `IF NOT EXISTS` lorsque nécessaire et peut donc servir aussi bien à une nouvelle installation qu’à une mise à jour.

## Installation Supabase

1. Ouvrir le projet Supabase.
2. Aller dans **SQL Editor**.
3. Copier/coller `supabase.sql` puis l’exécuter.
4. Dans **Project Settings > API**, récupérer le Project URL et la clé anon/public.
5. Renseigner `config.js` :

```js
window.NCR_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJ..."
};
```

## Déploiement

Le dossier est statique et peut être hébergé sur Cloudflare Pages, GitHub Pages ou tout hébergement HTTPS. Pour que les élèves rejoignent par QR code, l’URL doit être accessible depuis leurs téléphones.

## Fichiers principaux

- `index.html` : interface
- `style.css` : design responsive
- `app.js` : logique hôte/élève, temps réel, avatars, relance et score
- `questions.json` : banque de 1 347 questions
- `catalog.json` : structure matières / chapitres / séances
- `source_index.json` : index des notions issues des manuels
- `supabase.sql` : base de données + Realtime + RLS
- `config.js` : configuration Supabase

## Sécurité

Cette version est destinée à l’entraînement en classe. Les réponses correctes restent dans le bundle web afin de conserver un déploiement simple. Pour un examen certifiant, la validation des réponses devrait être déplacée côté serveur.
