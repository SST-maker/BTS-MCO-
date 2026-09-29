NCR MCO Quiz Arena V3.4 — Audit qualité + banque pédagogique étendue

Cette version repart de la V3.3 avec un audit beaucoup plus sévère de la banque.

- 973 questions supprimées car trop directes, trop mécaniques, tronquées ou peu pédagogiques.
- 1421 nouvelles questions ajoutées.
- 2571 questions au total.
- Les nouvelles questions privilégient les associations de notions, distinctions fines, doubles/triples raisonnements, mini-cas et diagnostics de formules.
- Les niveaux Standard pédagogique, Difficile et Expert restent disponibles.
- La correction détaillée côté élève et le filet de sécurité de synchronisation de la V3.3 sont conservés.
- Aucun nouveau SQL n’est nécessaire par rapport à la V3.3.

Un rapport `QA_BANQUE_V3_4.txt` est inclus dans le dossier.

NCR MCO Quiz Arena V3.3 — Synchronisation élève + correction détaillée

Nouveautés :
- Filet de sécurité de synchronisation côté élève : vérification automatique de l’état de la salle toutes les 2,5 s en complément de Supabase Realtime.
- Resynchronisation immédiate au retour dans l’app, au focus, au retour réseau et après une reprise iOS/Safari.
- Correction élève enrichie : bonne réponse, réponse choisie en cas d’erreur, explication complète et repère de cours.
- Aucun changement SQL nécessaire par rapport à la V3.2.

NCR MCO Quiz Arena V3.2 — Banque pédagogique élargie

381 nouvelles questions, uniquement de niveau difficile ou expert. Elles demandent de distinguer deux ou trois notions ou d’associer plusieurs formules, sans revenir aux questions trop évidentes.
Total : 2123 questions. Historique anti-répétition porté à 2 500 questions.

# NCR MCO Quiz Arena V3.1 — Banque pédagogique contrôlée

Cette version conserve le compte formateur, Supabase Realtime, le QR code, les avatars, l’écran éveillé et le podium animé.

## Refonte pédagogique V3.1

La banque a été reconstruite à partir des six manuels NCR Solutions. Elle contient **1959 questions conservées après contrôle qualité**, volontairement moins que la V3.0 : la priorité est donnée à la qualité plutôt qu’au volume artificiel.

- aucun niveau « facile / révision » ;
- Standard pédagogique, Difficile et Expert ;
- mini-cas professionnels, choix de méthodes, formules, interprétation et distinctions entre notions proches ;
- suppression des questions/réponses tronquées détectées, des choix dupliqués et des formulations se terminant en plein milieu ;
- sélection plus variée pendant un live : priorité aux notions et types de questions encore peu utilisés ;
- historique anti-répétition porté à 1 500 questions sur le navigateur du formateur.

**Aucun nouveau SQL n’est nécessaire si la V3.0 avec compte formateur et colonne `difficulty` est déjà installée.**

NCR MCO Quiz Arena V3.0 — niveaux de difficulté + anti-répétition

Nouveautés :
- 4 625 questions au total
- Choix du niveau avant chaque partie : Révision / Intermédiaire / Difficile / Expert / Mixte
- Niveau Difficile sélectionné par défaut
- Banque enrichie avec des distracteurs proches et des associations notion-explication
- Historique local anti-répétition : les questions récemment jouées sont évitées autant que possible
- La difficulté est conservée quand le formateur relance une partie avec la même classe
- Compte formateur Supabase Auth conservé

Important : exécuter le nouveau supabase.sql une fois pour ajouter le champ difficulty aux salles existantes.

NCR MCO Quiz Arena V2.9 — compte formateur

Ajouts principaux :
- Connexion formateur par e-mail / mot de passe via Supabase Auth
- Seul un formateur connecté peut créer et piloter une partie
- Les élèves peuvent toujours rejoindre la partie avec le code / QR code

Mise en place :
1. Exécuter supabase.sql
2. Renseigner config.js
3. Dans Supabase > Authentication > Users, créer le compte formateur
4. Déployer le dossier sur GitHub Pages / hébergeur

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
