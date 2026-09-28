## V2.1 — formulations complètes, sans points de suspension

Les questions et réponses du live sont désormais courtes mais complètes. Aucun texte de quiz n’est tronqué avec « … » et les noms se renvoient à la ligne au lieu d’être coupés.

# NCR MCO Quiz Arena — V2 Responsive

Application de quiz live BTS MCO pour une utilisation en classe : l’hôte projette la partie, les élèves rejoignent par QR code ou code à 6 chiffres, répondent depuis leur téléphone, puis le classement et le podium sont affichés.

## Ce qui change dans la V2

- responsive mobile entièrement retravaillé pour les téléphones élèves ;
- interface hôte optimisée pour vidéoprojecteur, tablette et petits écrans ;
- lobby, écran de connexion, correction et podium adaptés aux écrans étroits ;
- boutons de réponse plus grands et plus tactiles ;
- gestion des petits téléphones et du mode paysage ;
- barre supérieure et espacements réduits sur mobile pour laisser plus de place au quiz ;
- questions fortement raccourcies pour une lecture rapide en live ;
- réponses raccourcies, tandis que les explications détaillées restent visibles après la réponse ;
- chrono par défaut porté à **30 secondes** ;
- choix de chrono : 20 s rapide, 30 s normal, 45 s confort, 60 s réflexion.

## Banque de questions

- ADOC 1re année
- ADOC 2e année
- DRCV 1re année
- DRCV 2e année
- **689 questions** conservées
- filtres matière > année > chapitre > séance
- tirage aléatoire de 5, 10, 15, 20 ou 30 questions selon le volume disponible

Les corrections et explications restent plus développées que les formulations affichées pendant le chrono : le but est que l’élève lise vite pendant la manche, puis que le formateur puisse exploiter la correction pédagogiquement.

### Mesures de longueur V2

Sur les 689 questions :

- question médiane : environ 67 caractères ;
- 90 % des questions : moins de 88 caractères ;
- réponses : environ 49 caractères en médiane ;
- 90 % des réponses : moins de 90 caractères.

## Installation Supabase

1. Créer ou ouvrir un projet Supabase.
2. Ouvrir **SQL Editor**.
3. Copier/coller le contenu de `supabase.sql` et l’exécuter.
4. Dans **Project Settings > API**, récupérer :
   - Project URL
   - anon / public key
5. Ouvrir `config.js` et renseigner :

```js
window.NCR_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJ..."
};
```

## Déploiement

Le dossier est statique. Il peut être hébergé sur Cloudflare Pages, GitHub Pages ou tout hébergement statique HTTPS. Le site doit être accessible depuis les téléphones des élèves pour que le QR code fonctionne.

Pour un test local :

```bash
python -m http.server 8080
```

## Fichiers

- `index.html` : interface
- `style.css` : design responsive V2
- `app.js` : logique hôte/élève, temps réel, score et podium
- `questions.json` : banque de questions raccourcies
- `catalog.json` : structure matières / chapitres / séances
- `source_index.json` : index des notions des manuels
- `supabase.sql` : base de données + Realtime + RLS
- `config.js` : configuration Supabase

## Sécurité

Cette version est destinée à l’entraînement en classe. Les réponses correctes restent dans le bundle web afin de garder un déploiement simple. Pour un examen certifiant, il faudrait déplacer la validation des réponses côté serveur.
