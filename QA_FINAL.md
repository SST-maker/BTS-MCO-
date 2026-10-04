# QA final — NCR MCO Quiz Arena V4.1

## Résultat de la livraison locale

1 556 questions : 238 références V4 conservées exactement et 1 318 ajouts. Les 155 séances ont au moins 10 questions et proposent Standard, Difficile et Expert. Aucune séance sous le seuil, aucun niveau manquant. Aucun contenu V3 réintroduit. La base technique V4 est conservée ; seuls les contenus, compteurs, registre SQL de questions et documents de livraison évoluent.

La couverture est atteinte. La validation technique locale est réussie, avec les limites navigateur et services distants décrites plus bas. Cette archive n'est pas une certification de production ou une recette sur téléphones réels.

## Banque et sources

| Manuel | Questions | Séances ≥ 10 |
|---|---:|---:|
| ADOC 1re | 286 | 28 |
| ADOC 2e | 240 | 24 |
| DRCV 1re | 280 | 28 |
| DRCV 2e | 230 | 23 |
| GO 1re | 280 | 28 |
| GO 2e | 240 | 24 |

Répartition : 457 Standard, 620 Difficile, 479 Expert. Énoncé le plus long : 182 caractères ; réponse la plus longue : 88 caractères. Les niveaux expriment la difficulté pédagogique estimée ; ils ne proviennent pas d'un étalonnage statistique auprès d'élèves.

Contrôles exhaustifs automatisés réussis : IDs uniques, énoncés exacts normalisés non dupliqués, quatre choix distincts non vides, un index de bonne réponse valide, explication et piège présents, métadonnées cohérentes avec le catalogue et l'index des manuels, pages dans les bornes réelles des six PDF, absence de `...` et de `…` dans les contenus de questions. Aucune troncature CSS par ellipsis ou line-clamp. La correction indique la justification, le piège est un champ distinct et la notion est conservée avec son titre.

La validité sémantique d'une seule réponse ne peut pas être prouvée par un index numérique : elle a été examinée pendant la rédaction et dans une relecture transversale de 54 questions, trois par combinaison manuel/niveau, détaillée dans `RELECTURE_PEDAGOGIQUE.md`. Les sources sont exclusivement les six manuels fournis ; les mini-cas et chiffres pédagogiques nouveaux appliquent leurs notions, sans source externe.

Détection de quasi-doublons : normalisation, Jaccard de mots et similarité de caractères. Deux candidats initiaux examinés : une permutation numérique ADOC remplacée ; un calcul GO conservé car le BFR négatif introduit le raisonnement sur une ressource d'exploitation. Le contrôle lexical n'est pas une garantie exhaustive de non-proximité sémantique, notamment pour les notions reprises entre manuels. Distracteurs manifestement hors sujet repérés dans la relecture corrigés ponctuellement. Aucune refonte des matières terminées.

## Tests exécutés sur V4.1

- Banque/catalogue/SQL/assets : `node maintenance/check.cjs` réussi, 1 556 questions, 155 séances, zéro séance vide, 24 avatars et registre SQL aligné.
- Moteur et synchronisation : 12 groupes réussis, sélection par niveau, absence de doublons de tirage, ordre des snapshots, changement de salle, nettoyage, visibilité, réseau et repli.
- PostgreSQL embarqué PGlite : 20 groupes réussis sur le SQL livré. Fonctions PL/pgSQL et règles de rôles exécutées ; contexte Auth substitué localement. Création autorisée/refusée, propriété de salle, refus d'accès direct élèves, réponse unique, mauvais choix, score atomique, expiration, série, replay, fermeture, migration idempotente et publication contrôlés. 100 inscriptions séquentielles et refus du dépassement ; pas de test de concurrence réseau réelle.
- Interface jsdom avec serveur PostgreSQL local : 17 groupes réussis. Connexion formateur simulée, filtres des six manuels, création, QR en sous-dossier, trois élèves indépendants, bonne/mauvaise réponse, double clic, refresh, expiration sans formateur actif, perte/retour réseau simulés, arrière-plan/retour, podium, replay, changement de quiz, nouvelle classe, déconnexion/reconnexion et absence d'erreur JavaScript dans ce harnais.
- Deux QR générés par la bibliothèque livrée décodés par jsQR ; URL de sous-dossier et zéro initial du code conservés.
- GitHub Pages : service statique local sous `/nom-du-repo/`, chargement des scripts/JSON/assets et parcours testés. Chemins de l'application relatifs ; aucun déploiement GitHub effectué.
- Empreintes de `index.html`, `style.css`, `app.js`, `core.js`, `sync.js`, `config.js` et de toute la logique SQL avant le registre de questions identiques à la base V4 figée. Aucun changement de sécurité ou de scoring.

Le harnais existant a été adapté au format français du total au-delà de 1 000 et au nouveau nombre de questions d'un filtre ; ces corrections portent sur les attentes des tests, pas sur l'application.

## Limites explicites

- Chromium relancé pour la recette : arrêt au démarrage avec SIGABRT. Aucun rendu responsive navigateur ni capture visuelle V4.1 validés. CSS contrôlé statiquement aux ruptures prévues, sans prétendre mesurer les débordements en pixels.
- iPhone/Safari, Android, tablette, vidéoprojecteur, clavier, orientation, vibration et veille réels non testés.
- Auth Supabase réelle, JWT distant, PostgREST, WebSockets Realtime et concurrence multi-connexions non testés. Le harnais utilise Auth et transport simulés ; le fallback de synchronisation de l'application est réellement exercé localement.
- Wake Lock testé par substitution. QR non scanné par caméra réelle. GitHub Pages distant non déployé ni vérifié.
- Banque publique avec réponses dans le JSON : entraînement, pas examen anti-triche. Les règles V4 d'autorisation formateur restent inchangées ; consulter le README si le projet Supabase est partagé.

## Conditionnement

Le ZIP comprend `index.html` directement à la racine, scripts, JSON, 24 avatars, assets d'origine, bibliothèques et licences, SQL complet, README, QA, tableau de couverture, relecture et manifeste SHA-256. Il exclut manuels PDF, dépendances de tests, serveurs simulés, captures et fichiers temporaires.

La procédure de livraison ouvre le ZIP, contrôle tous les CRC, extrait dans un dossier indépendant, compare chaque fichier au manifeste, puis réexécute contrôle de banque/SQL/assets et 12 tests moteur depuis cette extraction. La preuve du résultat est enregistrée à côté du travail de conditionnement. Une fois validé, ce ZIP V4.1 ne sera plus modifié pendant la V5.

## Couverture détaillée des 155 séances

Le fichier `COUVERTURE_SEANCES.csv` permet également de filtrer les comptes et alertes.

| Matière | Année | Chapitre | Séance | Standard | Difficile | Expert | Total | Alertes |
|---|---|---|---|---:|---:|---:|---:|---|
| ADOC | 1re | 01 | 01 | 4 | 4 | 4 | 12 | — |
| ADOC | 1re | 01 | 02 | 3 | 4 | 3 | 10 | — |
| ADOC | 1re | 01 | 03 | 4 | 5 | 3 | 12 | — |
| ADOC | 1re | 01 | 05 | 3 | 3 | 4 | 10 | — |
| ADOC | 1re | 02 | 10 | 2 | 4 | 4 | 10 | — |
| ADOC | 1re | 02 | 11 | 4 | 4 | 2 | 10 | — |
| ADOC | 1re | 02 | 12 | 3 | 5 | 2 | 10 | — |
| ADOC | 1re | 02 | 06 | 3 | 3 | 4 | 10 | — |
| ADOC | 1re | 02 | 07 | 4 | 3 | 3 | 10 | — |
| ADOC | 1re | 02 | 08 | 3 | 5 | 2 | 10 | — |
| ADOC | 1re | 03 | 13 | 3 | 4 | 3 | 10 | — |
| ADOC | 1re | 03 | 14 | 3 | 3 | 4 | 10 | — |
| ADOC | 1re | 03 | 16 | 2 | 5 | 3 | 10 | — |
| ADOC | 1re | 03 | 17 | 3 | 4 | 3 | 10 | — |
| ADOC | 1re | 03 | 19 | 4 | 3 | 3 | 10 | — |
| ADOC | 1re | 04 | 20 | 3 | 4 | 3 | 10 | — |
| ADOC | 1re | 04 | 21 | 4 | 3 | 3 | 10 | — |
| ADOC | 1re | 04 | 22 | 3 | 4 | 3 | 10 | — |
| ADOC | 1re | 04 | 23 | 4 | 3 | 3 | 10 | — |
| ADOC | 1re | 04 | 24 | 3 | 4 | 3 | 10 | — |
| ADOC | 1re | 04 | 25 | 3 | 4 | 3 | 10 | — |
| ADOC | 1re | 04 | 27 | 3 | 3 | 4 | 10 | — |
| ADOC | 1re | 04 | 28 | 4 | 3 | 3 | 10 | — |
| ADOC | 1re | 05 | 29 | 5 | 3 | 2 | 10 | — |
| ADOC | 1re | 05 | 30 | 4 | 5 | 2 | 11 | — |
| ADOC | 1re | 05 | 32 | 3 | 4 | 3 | 10 | — |
| ADOC | 1re | 05 | 33 | 3 | 5 | 2 | 10 | — |
| ADOC | 1re | 05 | 34 | 3 | 5 | 3 | 11 | — |
| ADOC | 2e | 01 | 01 | 3 | 5 | 2 | 10 | — |
| ADOC | 2e | 01 | 02 | 4 | 4 | 2 | 10 | — |
| ADOC | 2e | 01 | 03 | 2 | 4 | 4 | 10 | — |
| ADOC | 2e | 01 | 05 | 3 | 4 | 3 | 10 | — |
| ADOC | 2e | 01 | 06 | 4 | 4 | 2 | 10 | — |
| ADOC | 2e | 01 | 07 | 3 | 3 | 4 | 10 | — |
| ADOC | 2e | 02 | 10 | 3 | 4 | 3 | 10 | — |
| ADOC | 2e | 02 | 11 | 4 | 3 | 3 | 10 | — |
| ADOC | 2e | 02 | 13 | 2 | 5 | 3 | 10 | — |
| ADOC | 2e | 02 | 09 | 4 | 4 | 2 | 10 | — |
| ADOC | 2e | 03 | 14 | 4 | 4 | 2 | 10 | — |
| ADOC | 2e | 03 | 15 | 4 | 4 | 2 | 10 | — |
| ADOC | 2e | 03 | 18 | 2 | 4 | 4 | 10 | — |
| ADOC | 2e | 03 | 19 | 2 | 4 | 4 | 10 | — |
| ADOC | 2e | 04 | 20 | 4 | 3 | 3 | 10 | — |
| ADOC | 2e | 04 | 21 | 3 | 4 | 3 | 10 | — |
| ADOC | 2e | 04 | 22 | 2 | 4 | 4 | 10 | — |
| ADOC | 2e | 04 | 24 | 3 | 3 | 4 | 10 | — |
| ADOC | 2e | 04 | 26 | 2 | 4 | 4 | 10 | — |
| ADOC | 2e | 05 | 27 | 4 | 3 | 3 | 10 | — |
| ADOC | 2e | 05 | 28 | 3 | 4 | 3 | 10 | — |
| ADOC | 2e | 05 | 30 | 2 | 5 | 3 | 10 | — |
| ADOC | 2e | 05 | 31 | 3 | 3 | 4 | 10 | — |
| ADOC | 2e | 05 | 32 | 2 | 5 | 3 | 10 | — |
| DRCV | 1re | 00 | 01 | 3 | 4 | 3 | 10 | — |
| DRCV | 1re | 01 | 02 | 4 | 3 | 3 | 10 | — |
| DRCV | 1re | 01 | 03 | 3 | 4 | 3 | 10 | — |
| DRCV | 1re | 01 | 04 | 3 | 4 | 3 | 10 | — |
| DRCV | 1re | 01 | 05 | 4 | 3 | 3 | 10 | — |
| DRCV | 1re | 02 | 06 | 3 | 4 | 3 | 10 | — |
| DRCV | 1re | 02 | 07 | 3 | 4 | 3 | 10 | — |
| DRCV | 1re | 02 | 09 | 2 | 4 | 4 | 10 | — |
| DRCV | 1re | 03 | 11 | 4 | 3 | 3 | 10 | — |
| DRCV | 1re | 03 | 12 | 3 | 3 | 4 | 10 | — |
| DRCV | 1re | 04 | 13 | 4 | 3 | 3 | 10 | — |
| DRCV | 1re | 04 | 14 | 2 | 4 | 4 | 10 | — |
| DRCV | 1re | 05 | 15 | 3 | 4 | 3 | 10 | — |
| DRCV | 1re | 05 | 16 | 4 | 3 | 3 | 10 | — |
| DRCV | 1re | 05 | 18 | 3 | 3 | 4 | 10 | — |
| DRCV | 1re | 06 | 19 | 2 | 5 | 3 | 10 | — |
| DRCV | 1re | 06 | 20 | 3 | 3 | 4 | 10 | — |
| DRCV | 1re | 06 | 22 | 3 | 4 | 3 | 10 | — |
| DRCV | 1re | 06 | 23 | 3 | 3 | 4 | 10 | — |
| DRCV | 1re | 06 | 24 | 3 | 4 | 3 | 10 | — |
| DRCV | 1re | 06 | 25 | 3 | 4 | 3 | 10 | — |
| DRCV | 1re | 06 | 27 | 2 | 4 | 4 | 10 | — |
| DRCV | 1re | 07 | 28 | 3 | 4 | 3 | 10 | — |
| DRCV | 1re | 07 | 29 | 3 | 4 | 3 | 10 | — |
| DRCV | 1re | 07 | 31 | 3 | 3 | 4 | 10 | — |
| DRCV | 1re | 07 | 32 | 2 | 4 | 4 | 10 | — |
| DRCV | 1re | 07 | 33 | 3 | 4 | 3 | 10 | — |
| DRCV | 1re | 07 | 34 | 2 | 5 | 3 | 10 | — |
| DRCV | 2e | 01 | 10 | 2 | 5 | 3 | 10 | — |
| DRCV | 2e | 01 | 11 | 2 | 4 | 4 | 10 | — |
| DRCV | 2e | 01 | 13 | 3 | 3 | 4 | 10 | — |
| DRCV | 2e | 01 | 14 | 2 | 4 | 4 | 10 | — |
| DRCV | 2e | 01 | 15 | 2 | 4 | 4 | 10 | — |
| DRCV | 2e | 01 | 01 | 3 | 4 | 3 | 10 | — |
| DRCV | 2e | 01 | 02 | 3 | 3 | 4 | 10 | — |
| DRCV | 2e | 01 | 03 | 2 | 5 | 3 | 10 | — |
| DRCV | 2e | 01 | 05 | 2 | 4 | 4 | 10 | — |
| DRCV | 2e | 01 | 06 | 3 | 4 | 3 | 10 | — |
| DRCV | 2e | 01 | 07 | 3 | 4 | 3 | 10 | — |
| DRCV | 2e | 02 | 18 | 4 | 3 | 3 | 10 | — |
| DRCV | 2e | 02 | 19 | 2 | 5 | 3 | 10 | — |
| DRCV | 2e | 02 | 20 | 3 | 4 | 3 | 10 | — |
| DRCV | 2e | 02 | 21 | 2 | 5 | 3 | 10 | — |
| DRCV | 2e | 02 | 22 | 3 | 4 | 3 | 10 | — |
| DRCV | 2e | 02 | 24 | 3 | 4 | 3 | 10 | — |
| DRCV | 2e | 02 | 26 | 2 | 4 | 4 | 10 | — |
| DRCV | 2e | 02 | 27 | 3 | 3 | 4 | 10 | — |
| DRCV | 2e | 02 | 28 | 2 | 4 | 4 | 10 | — |
| DRCV | 2e | 02 | 30 | 2 | 4 | 4 | 10 | — |
| DRCV | 2e | 02 | 31 | 2 | 5 | 3 | 10 | — |
| DRCV | 2e | 02 | 32 | 2 | 3 | 5 | 10 | — |
| GO | 1re | 01 | 01 | 5 | 3 | 2 | 10 | — |
| GO | 1re | 01 | 02 | 2 | 5 | 3 | 10 | — |
| GO | 1re | 01 | 03 | 4 | 4 | 2 | 10 | — |
| GO | 1re | 02 | 04 | 4 | 4 | 2 | 10 | — |
| GO | 1re | 02 | 05 | 3 | 3 | 4 | 10 | — |
| GO | 1re | 03 | 10 | 4 | 4 | 2 | 10 | — |
| GO | 1re | 03 | 11 | 2 | 4 | 4 | 10 | — |
| GO | 1re | 03 | 12 | 3 | 5 | 2 | 10 | — |
| GO | 1re | 03 | 13 | 3 | 4 | 3 | 10 | — |
| GO | 1re | 03 | 06 | 3 | 5 | 2 | 10 | — |
| GO | 1re | 03 | 07 | 3 | 4 | 3 | 10 | — |
| GO | 1re | 04 | 14 | 4 | 4 | 2 | 10 | — |
| GO | 1re | 04 | 15 | 2 | 6 | 2 | 10 | — |
| GO | 1re | 04 | 16 | 3 | 5 | 2 | 10 | — |
| GO | 1re | 04 | 18 | 2 | 5 | 3 | 10 | — |
| GO | 1re | 04 | 19 | 3 | 4 | 3 | 10 | — |
| GO | 1re | 04 | 20 | 3 | 4 | 3 | 10 | — |
| GO | 1re | 04 | 22 | 3 | 4 | 3 | 10 | — |
| GO | 1re | 05 | 23 | 4 | 4 | 2 | 10 | — |
| GO | 1re | 05 | 24 | 3 | 5 | 2 | 10 | — |
| GO | 1re | 05 | 25 | 2 | 5 | 3 | 10 | — |
| GO | 1re | 05 | 27 | 3 | 5 | 2 | 10 | — |
| GO | 1re | 05 | 28 | 2 | 5 | 3 | 10 | — |
| GO | 1re | 05 | 29 | 2 | 3 | 5 | 10 | — |
| GO | 1re | 06 | 31 | 4 | 4 | 2 | 10 | — |
| GO | 1re | 06 | 32 | 3 | 4 | 3 | 10 | — |
| GO | 1re | 06 | 33 | 1 | 4 | 5 | 10 | — |
| GO | 1re | 06 | 34 | 2 | 4 | 4 | 10 | — |
| GO | 2e | 01 | 01 | 5 | 3 | 2 | 10 | — |
| GO | 2e | 01 | 02 | 2 | 5 | 3 | 10 | — |
| GO | 2e | 01 | 03 | 3 | 5 | 2 | 10 | — |
| GO | 2e | 02 | 10 | 2 | 5 | 3 | 10 | — |
| GO | 2e | 02 | 04 | 4 | 3 | 3 | 10 | — |
| GO | 2e | 02 | 05 | 3 | 4 | 3 | 10 | — |
| GO | 2e | 02 | 06 | 2 | 5 | 3 | 10 | — |
| GO | 2e | 02 | 09 | 2 | 4 | 4 | 10 | — |
| GO | 2e | 03 | 12 | 4 | 3 | 3 | 10 | — |
| GO | 2e | 03 | 13 | 2 | 5 | 3 | 10 | — |
| GO | 2e | 03 | 15 | 4 | 4 | 2 | 10 | — |
| GO | 2e | 03 | 16 | 3 | 5 | 2 | 10 | — |
| GO | 2e | 03 | 19 | 2 | 4 | 4 | 10 | — |
| GO | 2e | 03 | 21 | 4 | 4 | 2 | 10 | — |
| GO | 2e | 03 | 22 | 3 | 4 | 3 | 10 | — |
| GO | 2e | 03 | 23 | 2 | 5 | 3 | 10 | — |
| GO | 2e | 03 | 24 | 2 | 4 | 4 | 10 | — |
| GO | 2e | 04 | 26 | 4 | 4 | 2 | 10 | — |
| GO | 2e | 04 | 28 | 3 | 4 | 3 | 10 | — |
| GO | 2e | 04 | 29 | 3 | 4 | 3 | 10 | — |
| GO | 2e | 04 | 30 | 3 | 4 | 3 | 10 | — |
| GO | 2e | 04 | 31 | 4 | 4 | 2 | 10 | — |
| GO | 2e | 04 | 32 | 1 | 5 | 4 | 10 | — |
| GO | 2e | 04 | 33 | 3 | 4 | 3 | 10 | — |
