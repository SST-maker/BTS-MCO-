# NCR MCO Quiz Arena — V2.3

Version prête à déployer sur GitHub Pages pour un quiz BTS MCO live en classe.

## Contenu

- **1 347 questions** ADOC/DRCV, 1re et 2e année ;
- questions courtes adaptées au live ;
- QR code + code à 6 chiffres ;
- réponses synchronisées depuis les téléphones ;
- chrono, score, séries, classement et podium ;
- **24 avatars illustrés** exactement issus de l’aperçu validé (robots NCR, animaux, monstres, espace) ;
- choix de l’avatar à la connexion avec le prénom ;
- avatar visible dans le lobby, le classement, l’attente élève et le podium ;
- bouton **Rejouer avec la même classe** ;
- bouton **Changer le quiz • garder les joueurs** ;
- reconnexion automatique d’un élève sur le même téléphone.

## Installation Supabase

1. Ouvrir le projet Supabase.
2. Aller dans **SQL Editor**.
3. Exécuter `supabase.sql` (également si une ancienne version était déjà installée).
4. Dans **Project Settings > API**, récupérer le Project URL et la clé anon/public.
5. Renseigner `config.js` :

```js
window.NCR_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJ..."
};
```

## Déploiement GitHub Pages

1. Envoyer **le contenu du dossier** à la racine du dépôt GitHub.
2. Dans GitHub : **Settings > Pages**.
3. Choisir **Deploy from a branch**, branche `main`, dossier `/ (root)`.
4. Ouvrir l’URL GitHub Pages obtenue.

Le QR code généré par l’hôte pointera automatiquement vers cette URL avec le code de la salle.

## Fichiers

- `index.html` : interface
- `style.css` : design responsive
- `app.js` : logique hôte/élève + avatars + live
- `questions.json` : banque de 1 347 questions
- `catalog.json` : matières / chapitres / séances
- `source_index.json` : index pédagogique
- `assets/avatars/` : les 24 avatars WebP
- `supabase.sql` : tables, RLS et Realtime
- `config.js` : paramètres Supabase
- `.nojekyll` : déploiement GitHub Pages sans traitement Jekyll

## Important

La clé `anon/public` Supabase est conçue pour être exposée côté navigateur lorsque les politiques RLS sont correctement configurées. Ne jamais mettre une clé `service_role` dans `config.js`.
