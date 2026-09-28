NCR MCO Quiz Arena V2.8 — Difficulté renforcée

- Difficulté renforcée dans ADOC, DRCV et GO
- Environ 85 % de questions avancées lors du tirage quand la séance le permet
- Questions contextualisées avec distracteurs proches issus du même chapitre / de la même séance
- Davantage de reconnaissance de formules sans demander le calcul numérique
- Les anciens QCM simples restent disponibles mais sont moins souvent tirés
- Aucun changement Supabase requis par rapport à la V2.7

NCR MCO Quiz Arena V2.7

Évolution GO :
- calculs directs remplacés par des questions de choix de formule ;
- 188 nouvelles questions de formule avancées ;
- distracteurs proches pour obliger à identifier la bonne base et le bon dénominateur ;
- sélection GO équilibrée pour proposer environ 55 % de questions avancées quand la séance le permet.

NCR MCO Quiz Arena V2.6

Ajout Gestion opérationnelle (GO) :
- GO 1re année : 6 chapitres, 367 nouvelles questions
- GO 2e année : 4 chapitres, 493 nouvelles questions
- Banque totale : 2207 questions
- Questions de notions + applications et calculs courts adaptés au live

NCR MCO Quiz Arena V2.5

- Salle d’attente redesignée : avatar et prénom des joueurs nettement plus grands
- Grille responsive pensée pour une classe complète

NCR MCO Quiz Arena V2.4

- Wake lock écran éveillé sur les vues live compatibles
- Podium animé avec confettis
- Icône/logo robot utilisé comme favicon et identité visuelle

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
