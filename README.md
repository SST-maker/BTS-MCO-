# NCR MCO Quiz Arena V4.1

Version statique V4.1 pour GitHub Pages, sans compilation. Base technique V4 conservée. Banque de **1 556 questions** exclusivement fondée sur les six manuels fournis : **155 séances, toutes à au moins 10 questions**, avec Standard, Difficile et Expert dans chaque séance. Les 238 questions V4 sont conservées à l’identique. Voir `COUVERTURE_SEANCES.csv` et `RELECTURE_PEDAGOGIQUE.md`.

**Avant utilisation en classe : lire `QA_FINAL.md`.** Les parcours et le SQL ont été testés localement. Le rendu responsive en navigateur, Supabase en production et les téléphones réels n’ont pas pu être validés dans cet environnement. Cette livraison ne constitue donc pas une certification de fonctionnement multi-appareils.

## Installation sur ton projet existant

1. Termine les parties en cours. Conserve une copie de ton ancien déploiement.
2. Ouvre **ton projet Supabase actuel → SQL Editor → New query**. Copie l’intégralité de `supabase.sql`, jusqu’au `commit;`, puis exécute-la. Le script crée un schéma privé `ncr_arena`, cinq RPC publiques et un signal Realtime. Il ne supprime pas les anciennes tables et ne transfère pas les parties V3. Il peut être réexécuté ; le registre de questions est fourni dans ce même fichier.
3. Vérifie dans **Authentication → Users** que ton compte formateur existant est présent. Il reste utilisable avec son e-mail et son mot de passe. Aucun nouveau compte n’a été créé par cette livraison.
4. Vérifie que l’inscription publique et les connexions anonymes ne sont pas ouvertes aux élèves si ce projet est dédié à ce quiz. La règle V4 considère un compte Auth avec e-mail comme un formateur ; elle n’implémente pas une liste de métiers ou de rôles NCR Suite. Si d’autres applications partagent ce projet et créent des comptes ordinaires, une autorisation métier spécifique doit être définie avant usage. Ne désactive pas un mécanisme nécessaire à une autre application sans examiner son impact.
5. `config.js` conserve l’URL et la **clé publishable publique** reçues dans l’archive. Vérifie qu’elles correspondent au projet où tu exécutes le SQL. N’utilise jamais une clé `service_role` ou `sb_secret_` dans ce fichier.
6. Décompresse le ZIP. Dépose son **contenu à la racine** de ton dépôt GitHub, sans dossier supplémentaire. Dans **Settings → Pages**, choisis la branche contenant ces fichiers, dossier `/ (root)`. Aucun `npm build` n’est nécessaire. Rien n’a été envoyé sur GitHub par l’assistant.
7. Ouvre l’URL HTTPS de Pages, par exemple `https://utilisateur.github.io/nom-du-repo/`. Les chemins sont relatifs et le QR reprend le véritable chemin hébergé. Fais un rechargement complet après remplacement des fichiers.

## Vérification avant le premier cours

- Ouvre l’espace Formateur, connecte-toi, crée un quiz et vérifie le nombre de questions annoncé.
- Scanne le QR avec deux téléphones ; vérifie le prénom, l’avatar, l’apparition dans le lobby et le lancement.
- Fais une bonne réponse, une mauvaise réponse et une expiration sans réponse. Vérifie les corrections et les scores.
- Mets un téléphone en arrière-plan, reviens, puis coupe/rétablis brièvement son réseau. Il doit récupérer la phase serveur ; le secours prend normalement quelques secondes, davantage après plusieurs échecs.
- Recharge les pages élève et formateur. Vérifie le podium, le replay et le changement de quiz avec les mêmes joueurs.
- Vérifie le portrait et le paysage sur les appareils réellement utilisés. Wake Lock dépend du navigateur et ne doit pas bloquer le quiz lorsqu’il est indisponible.

## Utilisation

Le formateur choisit matière, année, chapitre, séance, niveau, quantité et durée. Seul le propriétaire authentifié de la salle pilote le live. Les élèves rejoignent avec un code à six chiffres et un prénom ; ils n’ont pas besoin de compte.

Les réponses et les points sont validés côté serveur. Une bonne réponse rapporte 800 points de connaissance, jusqu’à 200 de rapidité et jusqu’à 100 de série ; une mauvaise réponse vaut zéro. Une absence de réponse rompt la série lors de la correction. La première réponse acceptée est définitive. Le replay remet les scores à zéro en gardant les identités ; une nouvelle classe ferme l’ancienne salle.

L’identité élève utilise un secret aléatoire propre au navigateur et au code, enregistré avant l’envoi. Le serveur ne stocke que son empreinte. La salle active est conservée dans `sessionStorage` pour le rechargement de l’onglet. Un autre téléphone, un autre navigateur ou l’effacement du stockage peut créer une autre identité. Les salles expirent après 24 heures ; limite de 100 profils par salle et 20 salles actives par formateur.

Realtime signale qu’il faut relire l’état ; seul le snapshot serveur fait autorité. Un seul snapshot est envoyé à la fois. Repli : environ 7 secondes lorsque Realtime est connecté, 3 secondes lorsqu’il ne l’est pas, puis temporisation progressive jusqu’à environ 30 secondes après échec. Les pages cachées ne lancent pas de lecture réseau périodique. Retour au premier plan et réseau rétabli déclenchent une reprise. À l’échéance, un snapshot peut faire passer automatiquement la salle en correction, même si le formateur est en arrière-plan.

Le live nécessite Internet et Supabase. Les bibliothèques sont locales, mais l’application n’est pas un mode multijoueur hors connexion. La banque et ses réponses sont publiques dans le site statique : il s’agit d’un outil d’entraînement, pas d’un dispositif d’examen anti-triche.

## En cas de problème

| Symptôme | Action |
|---|---|
| « Installation V4 requise » | Exécuter le SQL complet dans le même projet que `config.js`, attendre la mise à jour de l’API puis recharger. |
| « Banque ou filtres incompatibles » | Déployer `questions.json` et le SQL du même ZIP. Ne pas mélanger deux versions. |
| Connexion formateur refusée | Vérifier compte, mot de passe et accès réseau dans Authentication. Aucune récupération de mot de passe n’est ajoutée à cette V4. |
| « Synchronisation de secours » | Le quiz utilise le polling. Vérifier la publication `supabase_realtime` et la table `public.ncr_v4_signals`, ainsi que les WebSockets du réseau. |
| Salle expirée ou introuvable | Rejoindre une salle active avec son code ; après 24 heures, créer une nouvelle salle. |
| Zéro question disponible | Choisir une autre séance ou le mix ; vérifier les filtres et la cohérence des fichiers déployés. |
| Assets ou JSON absents | Vérifier que les fichiers et `assets/` ont été copiés ensemble à la racine du dépôt ; conserver les noms exacts. |

## Architecture et maintenance

- `index.html`, `style.css`, `app.js` : vues et interactions.
- `core.js` : sélection, niveaux, variété, familles de raisonnements, validation et temps restant.
- `sync.js` : snapshots, Realtime, repli, timeout et protection contre les réponses obsolètes.
- `questions.json`, `catalog.json`, `source_index.json` : contenu et repères de cours. Les manuels PDF ne sont pas redistribués dans ce ZIP.
- `supabase.sql` : schéma privé, autorisations, transitions, score atomique et registre de réponses.
- `vendor/` : Supabase JS 2.57.4, QRCode.js 1.0.0 et licences. Versions fixes, aucun CDN nécessaire au chargement.

Contrôles facultatifs avec Node.js 18 ou ultérieur, depuis le dossier extrait :

```sh
node maintenance/check.cjs
node maintenance/engine-tests.cjs
```

Après une modification pédagogique volontaire de `questions.json`, conserver les métadonnées de séance/source et faire une relecture du manuel. Ajouter une source à `source_index.json` si nécessaire. Puis :

```sh
node maintenance/check.cjs --sync
node maintenance/check.cjs
node maintenance/engine-tests.cjs
```

`--sync` recalcule les compteurs et le registre SQL. Déployer SQL et fichiers ensemble, entre deux cours, sans modifier les réponses d’une partie en cours. Les identifiants doivent rester stables lorsque le contenu est inchangé ; utiliser un nouvel identifiant en cas de changement de sens ou de correction. Le moteur conserve au maximum 1 200 identifiants récents dans le navigateur du formateur. L’anti-répétition réduit les répétitions lorsque le stock le permet, sans inventer de questions ni changer le niveau.

Aucune purge automatique des anciennes parties n’est exécutée. Une politique de conservation et de suppression des prénoms/résultats doit être choisie par l’administrateur selon son usage. Les comptes, données et règles des anciennes tables restent sous sa gestion.
