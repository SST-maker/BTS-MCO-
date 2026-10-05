# QA final — NCR MCO Quiz Arena V5 Classroom Experience

Date : 5 octobre 2026. Périmètre : copie V5 de la V4.1 figée, tests locaux, corrections et livraison statique. Aucun déploiement Supabase ou GitHub de production n’a été effectué.

## Résultat

Les contrôles exécutés passent : **12 groupes moteur/synchronisation, 23 groupes PostgreSQL, 19 groupes fonctionnels DOM, 10 groupes Classroom, 2 décodages QR**, contrôle banque/ressources et parcours dans le navigateur intégré. Ces chiffres désignent des groupes de tests, pas autant d’appareils réels.

La banque officielle reste à **1 556 questions**, **155 séances à au moins 10 questions**, **aucune séance sous le seuil**, avec les trois niveaux dans chaque séance. Aucune question ni correction pédagogique n’a changé en V5. Le tableau détaillé reste dans `COUVERTURE_SEANCES.csv`. `QA_FINAL.md` et `RELECTURE_PEDAGOGIQUE.md` sont les rapports pédagogiques V4.1 conservés ; le présent fichier décrit les résultats techniques V5.

## Fonctionnalités livrées

- Pendant la question : uniquement le compteur global de réponses reçues. Aucun histogramme ni pourcentage dans la vue ou le snapshot serveur, même pour le formateur.
- Après fermeture manuelle ou expiration : histogramme A/B/C/D issu des réponses réellement enregistrées, réservé au propriétaire de la salle. Bonne réponse mise en évidence ; erreurs et absences conservées. Pourcentages calculés sur les réponses reçues, arrondis à une décimale si nécessaire ; leur somme affichée peut donc légèrement différer de 100 %. Quatre zéros si personne ne répond.
- Feedback élève : bonne/mauvaise réponse, choix personnel erroné, correction existante, points gagnés, total et position. Série affichée à partir de trois bonnes réponses consécutives, avec sa valeur réelle. « Rapide » seulement pour une bonne réponse dont le délai serveur est au plus le minimum entre 5 secondes et 25 % de la durée.
- Progression de classement : gain de places lorsque le rang initial de la question a été observé ; écart au Top 5 pour un élève au-delà du cinquième rang et un écart positif. Aucun gain inventé lorsque le rang de départ est inconnu.
- Classement conservant les mêmes éléments visuels entre les snapshots ; animation de déplacement lorsqu’une position change et que le navigateur la prend en charge.
- Six sons WAV locaux courts : lobby, dernières secondes, réussite, erreur, correction et podium. Désactivés par défaut, choix mémorisé par navigateur, déclenchement après interaction. Échec de lecture/autoplay absorbé. Coupure et passage en arrière-plan interrompent les sons.
- Présentations occasionnelles Expert et dernière question, sans modification du temps ni du score. La case de préparation désactive ces présentations sur l’écran formateur uniquement ; les repères élève restent disponibles.
- Podium : troisième, deuxième puis premier, délais respectifs 0,25 / 0,85 / 1,45 seconde ; confettis sobres, classement complet, replay et changement de quiz existants.
- Animations courtes, préférence de réduction des animations respectée. Vibration facultative, protégée si absente ou refusée.

## Fonctionnalités reportées

**Flash, Double points et Réflexion** ne sont pas implémentés : ils nécessiteraient de modifier les durées ou le scoring serveur, conservés sur la base validée. Aucun intitulé ne promet un bonus inexistant.

**Mode équipes reporté à une version ultérieure.**

## Modifications serveur et invariants

Le seul changement SQL porte sur `ncr_v4_snapshot` : ajout de quatre comptes anonymes après clôture, seulement lorsque l’autorisation existante identifie le propriétaire. Signature et appel du RPC inchangés. Aucune modification des tables, règles Auth, droits, RLS, calcul du score, RPC de réponse, transitions ou mécanisme de synchronisation.

Comparaison binaire effectuée : `questions.json`, `catalog.json`, `source_index.json`, `core.js`, `sync.js`, `config.js` et `style.css` sont identiques à la base V4.1. Le SQL hors définition du snapshot est identique. Le ZIP V4.1 figé conserve son SHA-256 `780ed258599d23dd373e021bb6ce24c8060b4ee8bf832c44eabef6b9b00f9b37`.

Il faut exécuter le **SQL V5 fourni** dans le projet existant pour obtenir l’histogramme. Avec l’ancien snapshot, le client affiche une répartition indisponible, sans inventer de comptes. La V4.1 reste compatible avec le champ additionnel du snapshot.

## Défauts trouvés et corrigés

1. L’agrégat SQL utilisait `n`, ambigu avec la variable PL/pgSQL de même nom. Qualification en `counts.n` et `counts.choice`, puis tests PostgreSQL repassés.
2. Le rang de départ pouvait manquer à la sortie du lobby ou être remplacé lors d’un rechargement. Capture à l’arrivée effective de la question, conservation en session et restauration sans recalcul après une réponse. Test du gain de six places et de sa conservation après recharge.
3. L’histogramme ne se recalculait qu’au changement de phase. Il tient maintenant aussi compte d’un changement des comptes ou de l’effectif, sans recréer les barres sur les snapshots identiques.
4. Libellé du réglage de présentation précisé pour ne pas laisser croire qu’il modifie aussi les téléphones.

## Environnements et preuves

- Node.js 24.18.0 ; jsdom 26.1.0 ; PostgreSQL local via PGlite 0.3.10. Le SQL livré est exécuté, y compris ses fonctions de score, d’autorisation et de transition. Auth, transport HTTP et signaux Realtime sont des fixtures locales ; aucun faux résultat n’est présenté comme une validation du service Supabase distant.
- Application servie sous `/nom-du-repo/`, avec ressources relatives. Tests de trois élèves indépendants, reconnexion, événements manqués, coupure/rétablissement réseau simulés et repli polling réel du client.
- Navigateur intégré : connexion avec compte de fixture, création, élève via URL du QR, bonne puis mauvaise réponse, score inchangé sur erreur, fermeture, histogramme 1/1 à 100 %, nouvelle question sans histogramme, dernière question, podium à trois profils, classement complet, recharge, mémorisation Son coupé et replay vers lobby avec score zéro.
- Console du navigateur : aucune erreur/alerte JavaScript relevée dans les onglets formateur et élève sur ce parcours.
- Rendu observé en large et étroit ; dimensions CSS effectivement rapportées : **2880 × 1800**, **780 × 1688**, **640 × 800**, **480 × 844**. Aucun débordement horizontal détecté dans la vue élève vérifiée à 480 × 844. L’outil n’a pas appliqué les dimensions demandées exactement : les dimensions réellement mesurées sont retenues, pas les dimensions visées. **320–430 px et appareils physiques restent non vérifiés.**
- Captures de travail : histogramme, question élève étroite et podium. Examen visuel effectué. Les animations du podium sont également contrôlées par leurs délais CSS calculés ; ce n’est pas une mesure de fluidité/FPS.
- Journal texte livré : `maintenance/QA_V5_TEST_RESULTS.txt`.

## Matrice des contrôles demandés

| # | Contrôle | Résultat et portée |
|---|---|---|
| 1 | Connexion formateur | PASS, Auth de fixture DOM et navigateur ; Auth distant non testé |
| 2 | Création salle | PASS, SQL idempotent, DOM et navigateur |
| 3 | Plusieurs élèves | PASS, trois contextes DOM indépendants ; 100 inscriptions SQL séquentielles |
| 4 | Lobby | PASS, arrivées, avatars, code, QR et bouton de lancement |
| 5 | Démarrage | PASS, même question, commandes obsolètes neutralisées |
| 6 | Question | PASS, choix, durée et verrous de réponse |
| 7 | Compteur | PASS, deux réponses comptées pour trois profils |
| 8 | Répartition cachée | PASS, snapshot `distribution=null`, DOM vide et élément masqué pendant question |
| 9 | Bonne réponse | PASS, SQL/DOM/navigateur |
| 10 | Mauvaise réponse | PASS, zéro point, choix erroné et correction visibles |
| 11 | Expiration | PASS, refus tardif, snapshot en correction même avec formateur caché |
| 12 | Révélation | PASS, fermeture manuelle et automatique |
| 13 | Histogramme | PASS, SQL [1,0,1,0], DOM 50/50, navigateur 100 % sur un vote |
| 14 | Pourcentages | PASS, cas 4/13/6/2 → 16/52/24/8 %, zéro vote sans NaN |
| 15 | Scoring | PASS, formule exacte comparée au délai serveur, total cumulé |
| 16 | Streak | PASS, cinq bonnes réponses, séries 3 et 5, erreur/absence réinitialisent |
| 17 | Rapidité | PASS, correct rapide / lent / erreur / absence ; donnée serveur |
| 18 | Classement | PASS, gain réel, restauration du rang, Top 5, noms échappés, éléments conservés |
| 19 | Son ON | PASS, appels de lecture simulés et interaction navigateur sans erreur ; écoute matérielle non vérifiée |
| 20 | Son OFF | PASS, absence d’appel, arrêt, préférence conservée après recharge |
| 21 | Autoplay bloqué | PASS, rejet simulé de `play()` absorbé ; sans geste, aucun son au rechargement |
| 22 | Flash | Reporté, aucun timer spécial livré |
| 23 | Double points | Reporté, aucun multiplicateur livré |
| 24 | Réflexion | Reporté, bonus de vitesse inchangé |
| 25 | Dernière question | PASS, libellé avant réponse ; opt-out de projection testé |
| 26 | Podium | PASS, trois profils, ordre des délais, classement complet et commandes accessibles |
| 27 | Replay | PASS, identités conservées, nouvelle manche, scores et séries remis à zéro |
| 28 | Changement quiz | PASS, autre matière/année/niveau, mêmes profils |
| 29 | Perte réseau | PASS, simulation de refus fetch, écran sans corruption |
| 30 | Retour réseau | PASS, récupération de la phase correcte |
| 31 | Arrière-plan | PASS, arrêt polling et libération Wake Lock dans le harnais |
| 32 | Retour application | PASS, focus/visibility/online déclenchent la reprise |
| 33 | Responsive téléphone | Partiel : vue étroite 480 px validée ; téléphones et 320–430 px non vérifiés |
| 34 | Responsive desktop | PASS sur la largeur réellement mesurée de 2880 px ; autres desktop non certifiés |
| 35 | Sous-dossier Pages | PASS local sous `/nom-du-repo/`, QR décodé, chemins relatifs ; pas de publication distante |
| 36 | JavaScript | PASS, syntaxe, DOM et consoles navigateur du parcours testé |
| 37 | Double score | PASS, double clic et renvoi d’une réponse ; première réponse conservée |
| 38 | Sécurité V4.1 | PASS local, autres RPC/droits inchangés, autre propriétaire/élève rejetés, agrégat absent pour élève |

## Limites explicites

Pas de tests sur iPhone/Android physiques, Safari/Chrome mobiles réels, réseau Wi-Fi de classe, Supabase Auth/Realtime hébergé, GitHub Pages distant ni charge multiclient concurrente réelle. Les 100 inscriptions sont séquentielles. Vibrations et audio sont testés par simulation et contrôle des fichiers, sans validation de sensation ou niveau sonore sur appareils. La fluidité réelle n’a pas été mesurée.

La banque, réponses comprises, reste publique dans le site statique comme en V4.1. Cet outil d’entraînement n’est pas un système d’examen anti-triche. Les autorisations serveur empêchent les écritures non autorisées ; elles ne rendent pas le JSON pédagogique secret.

## Archive finale

Nom : `NCR_MCO_Quiz_Arena_V5_Classroom_GitHub.zip`. Livrable sans compilation, `index.html` à la racine, 24 avatars, six WAV, scripts, CSS, JSON, configuration existante, SQL et documentation. Le processus de livraison vérifie le CRC, extrait tous les fichiers, compare toutes les empreintes SHA-256 du manifeste et relance les contrôles banque et moteur depuis le dossier extrait. Aucun harnais Auth simulé, dépendance de test, fichier temporaire ou secret serveur n’est inclus.
