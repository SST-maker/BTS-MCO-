# NCR MCO Quiz Arena — V1

Application web de quiz live pour BTS MCO, pensée pour un cours en présentiel : le formateur projette l'écran hôte, les étudiants rejoignent avec un QR code ou un code à 6 chiffres, répondent depuis leur téléphone, puis un classement et un podium sont affichés.

## Contenu de cette V1

- ADOC 1re année
- ADOC 2e année
- DRCV 1re année
- DRCV 2e année
- 689 questions dans la banque initiale
- filtres matière > année > chapitre > séance
- tirage aléatoire de 5, 10, 15, 20 ou 30 questions selon le volume disponible
- chrono 15 / 20 / 30 / 45 / 60 secondes
- lobby live avec les prénoms
- QR code + code de salle
- réponses synchronisées en temps réel
- score prenant en compte justesse + rapidité + petit bonus de série
- correction après chaque question
- classement intermédiaire
- podium final et classement complet

La banque a été construite à partir des quatre manuels fournis. Deux variantes automatiques sont générées à partir des notions du manuel : reconnaissance de définition et reconnaissance de notion, complétées par des questions d'application/calcul rédigées spécifiquement.

## Installation Supabase

1. Créer ou ouvrir un projet Supabase.
2. Ouvrir **SQL Editor**.
3. Copier/coller le contenu de `supabase.sql` et l'exécuter.
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

Le dossier est statique. Tu peux l'héberger sur Cloudflare Pages, GitHub Pages ou n'importe quel hébergeur statique HTTPS. Pour le QR code, le site doit être accessible depuis les téléphones des élèves.

Pour un test local sur ton ordinateur :

```bash
python -m http.server 8080
```

Puis ouvre `http://localhost:8080` depuis le dossier du projet. Le multijoueur depuis plusieurs téléphones nécessitera toutefois une adresse réseau/publique accessible et Supabase configuré.

## Fichiers

- `index.html` : interface complète
- `style.css` : design responsive
- `app.js` : logique hôte/élève, score, temps réel et podium
- `questions.json` : banque de questions
- `catalog.json` : matières, chapitres et séances disponibles
- `source_index.json` : index des notions extrait des manuels
- `supabase.sql` : base de données + Realtime + politiques RLS
- `config.js` : URL et clé publique Supabase

## Limite de sécurité de la V1

Cette version est faite pour l'entraînement en classe, pas pour un examen certifiant. Les réponses correctes sont présentes dans le bundle web afin que le jeu reste simple et rapide à déployer. Un élève très technique pourrait donc les retrouver via les outils développeur. Une V2 peut déplacer la validation et le calcul du score côté serveur si nécessaire.
