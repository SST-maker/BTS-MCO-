# QA_FINAL — NCR MCO Quiz Arena V4

Date de clôture des contrôles locaux : 4 octobre 2026.

**Statut : application assemblée et tests locaux réussis ; validation visuelle responsive et validation Supabase réelle encore nécessaires avant un cours.** Aucun déploiement, aucune modification de base distante et aucun push GitHub n’ont été effectués.

## Version et périmètre

NCR MCO Quiz Arena V4, livrable statique sans build. Reprise de la copie locale issue de `BTS-MCO--main.zip`, avec les six manuels de `Archive.zip`. La fin de mission s’est limitée à la banque, aux tests, aux corrections et au conditionnement. Le robot, les icônes et les 24 avatars sont conservés.

## Architecture

- HTML et CSS autonomes ; contrôleur de vues `app.js` ; moteur testable `core.js` ; synchronisation isolée `sync.js`.
- État autoritaire en base : lobby → question → correction → question suivante/podium. Revision de phase pour les commandes, revision de signal pour les snapshots.
- RPC protégées : création, entrée élève, lecture, transition, réponse. Schéma privé `ncr_arena`, RLS, verrouillage et unicité des réponses. Signal Realtime public limité à un UUID et une revision.
- Auth e-mail/mot de passe conservée. Configuration publique d’origine conservée. Aucun secret privé ajouté au frontend.
- Bibliothèques Supabase/QR intégrées localement à version fixe ; déploiement à la racine ou dans un sous-dossier.

## Bugs corrigés et protections vérifiées

1. Double clic/double réponse : verrou client, unicité serveur et réponse idempotente ; aucun deuxième ajout de points.
2. Réponse après expiration, après changement de question ou reset : rejet côté serveur, avec verrou partagé par les transitions.
3. Commandes obsolètes : contrôle de revision ; une répétition ne saute pas deux phases.
4. Événements manqués ou snapshots en désordre : lecture de l’état réel, rejet des revisions anciennes et des réponses d’une ancienne salle.
5. Timers et abonnements : nettoyage au changement de salle ; une seule lecture réseau en vol.
6. Retour réseau, focus, visibilité et rechargement : reprise de la salle et du profil ; secret élève enregistré avant la première requête d’entrée.
7. Écran bloqué si le formateur passe en arrière-plan à l’échéance : le snapshot serveur effectue la correction automatiquement une fois le délai atteint.
8. Absence de réponse : rupture de série à la correction ; replay atomique des scores et du numéro de manche.
9. Salle expirée ou accès élève invalide : arrêt de la synchronisation et retour à l’accueil, au lieu d’une boucle sans issue.
10. Wake Lock : demande unique, libération à l’arrière-plan et à la fin ; contrôle de l’état après une demande asynchrone.
11. Banque : le validateur conserve les signes des réponses numériques et ne confond plus « +44 » et « −44 ».
12. Sélection : difficulté stricte, familles de raisonnements proches exclues d’une même sélection, quantité réellement disponible annoncée.
13. Migration : publication conditionnelle, exécution répétée et conservation des données déjà présentes vérifiées localement.
14. Interface : textes complets, prénoms échappés, boutons d’avatar plus larges sur mobile. Cette dernière correction est contrôlée dans le CSS, sans mesure visuelle navigateur.

## Banque de questions

Convention de comptage : les identifiants V3 ont tous été retirés ; les questions V4 ont de nouveaux identifiants. Les nombres « ajoutées » et « réécrites » ne sont pas comptés deux fois.

| Indicateur | Nombre |
|---|---:|
| Banque initiale | 2 571 |
| Identifiants initiaux supprimés | 2 571 |
| Réécrites avec identifiant initial conservé | 0 |
| Nouvelles questions V4 ajoutées | 238 |
| Banque finale | **238** |

Cette réduction est importante. Il s’agit d’une banque resserrée et non d’une couverture exhaustive des six manuels. Les 30 chapitres et 155 séances du catalogue sont représentés, pour 198 notions distinctes sur les 528 repères extraits. Toutes les séances n’offrent pas les trois niveaux ; certaines ne contiennent qu’une question. Une demande de 10 ou 60 questions peut donc produire une partie beaucoup plus courte, explicitement annoncée à la préparation.

| Manuel | Standard | Difficile | Expert | Total |
|---|---:|---:|---:|---:|
| ADOC 1re | 14 | 14 | 12 | 40 |
| ADOC 2e | 12 | 11 | 12 | 35 |
| DRCV 1re | 17 | 19 | 18 | 54 |
| DRCV 2e | 10 | 9 | 10 | 29 |
| GO 1re | 15 | 16 | 15 | 46 |
| GO 2e | 11 | 12 | 11 | 34 |
| **Total** | **79** | **81** | **78** | **238** |

Par matière : ADOC 75, DRCV 83, GO 80. Par année : 1re 140, 2e 98.

### Étendue réelle de l’audit pédagogique

Chaque entrée initiale possède une décision et des alertes structurelles dans `maintenance/audit_initial.csv`. Les retraits ont été décidés par familles de gabarits après examen des répétitions, permutations de définitions et distracteurs. **Ce journal ne prouve pas une relecture manuelle individuelle exhaustive des 2 571 questions initiales**, qui n’est pas revendiquée.

Les questions nouvelles ont été rédigées à partir des passages extraits des six PDF, avec repères de matière, année, chapitre, séance, notion et pages. Les mini-cas chiffrés servent d’exercices et ne prétendent pas représenter des données commerciales réelles. Aucun contenu pédagogique extérieur n’a été ajouté. Des distracteurs peu crédibles ont été remplacés lors de la relecture finale.

Une recherche de proximité lexicale par paire à l’intérieur de chaque chapitre a servi à la relecture : seuil de revue 0,56, avec comparaison de séquences. Le doublon réseau associé a été remplacé par une question sur le réseau mixte. Les variantes proches sur la l’acompte, la trésorerie nette, VAN/IP, les bases marge/marque, l’échantillonnage et la GRC sont regroupées ou espacées par le moteur. Cette méthode n’est pas une preuve d’absence absolue de proximité sémantique.

### Contrôles automatiques sur les 238 questions — réussis

- Exactement quatre propositions non vides et distinctes après normalisation conservant les signes.
- Index entier entre 0 et 3 ; niveau parmi Standard/Difficile/Expert.
- Identifiants uniques ; aucun doublon exact d’énoncé après normalisation.
- Aucune occurrence de `...` ou `…` dans les énoncés, choix, explications ou pièges.
- Énoncés ≤ 182 caractères ; propositions ≤ 84 caractères dans la banque finale.
- Explication, piège, notion et source présents ; pages et correspondances au catalogue vérifiées.
- Compteurs du catalogue recalculés ; zéro séance vide.
- Registre SQL et réponses JSON alignés intégralement.

Les contrôles de structure ne remplacent pas un jugement pédagogique. Le calibrage de difficulté est éditorial, sans mesure statistique auprès d’étudiants ; il pourra nécessiter un ajustement après usage.

## Tests effectivement exécutés

### Base PostgreSQL locale — 20 groupes réussis

Exécution des vraies fonctions SQL et règles RLS avec PGlite 0.3.10, rôles `anon`/`authenticated` et fonctions Auth de test. Ce n’est pas une connexion au projet Supabase distant.

- Refus de création anonyme et avec compte Auth anonyme ; refus des commandes/snapshots d’un autre formateur.
- Création et réessai idempotents ; contrôles de filtres/niveaux de la banque.
- Entrée et réessai élève ; refus d’accès direct aux tables privées et d’écriture dans les signaux.
- Réponse correcte, incorrecte, double envoi, score unique, index invalide et échéance serveur.
- Transitions obsolètes, correction, progression, fin de manche, reset conservant les identités et fermeture.
- Cent entrées distinctes, réessai au plafond, refus du 101e profil. **Test séquentiel**, pas mesure de charge concurrente en production.
- Expiration automatique depuis un snapshot élève, sans correction prématurée.
- Refus d’avatar et d’identité invalides.
- Réexécution du SQL sur données existantes sans perte des profils/scores.
- Publication `supabase_realtime` créée pour le test ; ajout unique de `ncr_v4_signals` malgré les réexécutions.

### Moteur et synchronisation — 12 groupes réussis

Tests reproductibles livrés dans `maintenance/engine-tests.cjs` : six manuels/trois niveaux, unicité, familles proches, mix équilibré lorsque possible, historique/réemploi, pool insuffisant sans changement de niveau, délai/identité de manche, signes numériques, lecture unique en vol, snapshot obsolète, ancienne salle/abonnement, page cachée/réseau absent, arrêt sur salle invalide.

### Interface et parcours — 17 groupes réussis dans un DOM simulé

Exécution de l’interface réelle avec jsdom 26, servie sous `/nom-du-repo/`, connectée aux RPC SQL locales. **Auth est simulée ; Realtime est volontairement indisponible pour éprouver le fallback. Canvas et Wake Lock sont des substituts de test. jsdom ne mesure pas le rendu visuel.**

1. Chargement, 24 avatars, accès formateur protégé et refus d’identifiants incorrects simulés.
2. Connexion et persistance de session formateur simulées.
3. Choix des six manuels et des niveaux.
4. Création, lobby, contenu du QR et URL incluant le sous-dossier.
5. Trois contextes élèves distincts, prénom, avatar choisi, attente et arrivée via fallback ; échappement d’un prénom contenant du HTML.
6. Lancement et même question sur les écrans.
7. Bonne/mauvaise réponse, double clic, verrouillage et score serveur.
8. Rechargement élève/formateur conservant salle, identité, score et réponse.
9. Expiration avec formateur caché, absence de réponse et corrections pédagogiques.
10. Événements manqués, panne réseau simulée, retour en ligne, retour de visibilité et question suivante.
11. Plusieurs questions, podium et classement complet.
12. Replay avec même classe, nouvelle manche et scores remis à zéro.
13. Changement GO 1re → DRCV 2e, difficulté et séance, avec conservation des joueurs.
14. Nouvelle classe fermant l’ancienne salle et retour élève à l’accueil.
15. Déconnexion/reconnexion formateur simulées.
16. Nettoyage d’une salle enregistrée mais invalide.
17. Aucune erreur JavaScript d’exécution dans ce harnais.

### QR, fichiers et compatibilité statique

- Deux matrices produites par la bibliothèque QR livrée ont été décodées avec jsQR 1.4.0 : URL GitHub Pages avec sous-dossier et code commençant par zéro conservés. Le scan par une caméra réelle n’est pas validé.
- JSON, syntaxe JavaScript, IDs HTML uniques, assets référencés et 24 avatars vérifiés. Les octets des assets et de la configuration d’origine sont comparés lors du conditionnement.
- Aucun build serveur ni chemin d’asset commençant par `/` nécessaire au site livré. Le harnais de test n’est pas inclus dans l’application.
- CSS analysable, sans ellipsis ni line-clamp pour tronquer le contenu. Points de rupture 360/700/1000/1600 px, paysage de faible hauteur, réduction des animations et zones tactiles contrôlés **statiquement**.

## Limites non vérifiées

- **[NON VÉRIFIÉ SUR APPAREIL RÉEL]** iPhone/Safari, Android, tablette, vidéoprojecteur ; mise en veille/réveil réelle, gestes, clavier et orientation.
- **Rendu responsive non vérifié en navigateur, même émulé.** Chromium et WebKit téléchargés pour le test quittent au démarrage (`SIGABRT`/code 134). Le navigateur intégré retourne une erreur du processus de contrôle. Aucun contrôle de débordement en pixels, aucune capture réelle et aucune validation visuelle de toutes les vues ne sont revendiqués.
- Auth Supabase réelle, renouvellement du JWT, WebSockets Realtime, PostgREST, latence, concurrence multi-connexions et paramètres du projet distant non testés. Les tests de rôles locaux ne constituent pas une validation du déploiement distant.
- Aucun déploiement GitHub Pages effectué ; le service statique local sous sous-dossier est testé, pas l’hébergement GitHub réel.
- Wake Lock testé par substitution uniquement. Son support et sa reprise sur iOS restent à contrôler.
- Banque de 238 questions, non exhaustive ; variété limitée dans les filtres étroits. Audit initial par gabarits, sans relecture humaine exhaustive de chaque ancienne question.
- Les réponses sont accessibles dans le JSON public ; pas de garantie anti-triche. Les comptes Auth e-mail du projet sont considérés comme formateurs : vérifier ce périmètre si le projet Supabase est partagé avec une autre application.

## Livraison et décision avant cours

Le ZIP contient l’application, la migration complète, le README, ce rapport, les licences et les contrôles de maintenance. Il exclut les PDF, anciennes banques, dépendances de test, captures, serveurs simulés et fichiers temporaires.

La livraison locale est utilisable pour installation et recette. **Le feu vert pour un cours réel reste conditionné à l’installation SQL et au parcours de vérification sur les appareils de la classe décrit dans le README.** Les limites ci-dessus sont explicites ; la V4 n’est pas présentée comme certifiée en production.

## Échantillon de relecture finale

36 questions lues, deux par combinaison matière × année × niveau. Les identifiants permettent de retrouver les énoncés, choix, explications et pièges dans `questions.json`. Les pages ci-dessous sont les repères du manuel fourni, non des liens Internet.

| Manuel | Niveau | Identifiants relus | Repères/pages |
|---|---|---|---|
| ADOC 1re | Standard | `v4-adoc-1re-1fee39ecf7` ; `v4-adoc-1re-d61ae7406a` | 1.2 / p. 10 ; 1.10 / p. 50 |
| ADOC 1re | Difficile | `v4-adoc-1re-fe4906e2ab` ; `v4-adoc-1re-c4920a120c` | 1.7 / p. 36 ; 1.5 / p. 22 |
| ADOC 1re | Expert | `v4-adoc-1re-4af6b53d30` ; `v4-adoc-1re-45fa21297e` | 1.7 / p. 36 ; 1.5 / p. 22 |
| ADOC 2e | Standard | `v4-adoc-2e-4a4c5afe1d` ; `v4-adoc-2e-396f4703bd` | 1.3 / p. 38 ; 1.5 / p. 68 |
| ADOC 2e | Difficile | `v4-adoc-2e-82f42a3b8c` ; `v4-adoc-2e-208ced1a52` | 1.4 / p. 52 ; 1.5 / p. 68 |
| ADOC 2e | Expert | `v4-adoc-2e-77d8b11d39` ; `v4-adoc-2e-e4ffaf0f53` | 1.4 / p. 52 ; 1.8 / p. 110 |
| DRCV 1re | Standard | `v4-drcv-1re-cfe22f829d` ; `v4-drcv-1re-cf9d55b0a5` | 0.1 / p. 7 ; 0.5 / p. 16 |
| DRCV 1re | Difficile | `v4-drcv-1re-015dda4306` ; `v4-drcv-1re-5c0a3e6e6c` | 0.6 / p. 17 ; 0.1 / p. 7 |
| DRCV 1re | Expert | `v4-drcv-1re-5d8565249d` ; `v4-drcv-1re-3020e9d21b` | 0.5 / p. 16 ; 0.6 / p. 17 |
| DRCV 2e | Standard | `v4-drcv-2e-1cf4f32dcb` ; `v4-drcv-2e-692b47be04` | 1.4 / p. 27 ; 1.8 / p. 50 |
| DRCV 2e | Difficile | `v4-drcv-2e-d2eabf6c52` ; `v4-drcv-2e-036dd60c51` | 1.6 / p. 37 ; 1.7 / p. 42 |
| DRCV 2e | Expert | `v4-drcv-2e-6aa10f61c2` ; `v4-drcv-2e-463433f5cd` | 1.7 / p. 42 ; 1.4 / p. 27 |
| GO 1re | Standard | `v4-go-1re-c65136027e` ; `v4-go-1re-cc1b813b4d` | 1.1.3 / p. 16 ; 1.1.5 / p. 20 |
| GO 1re | Difficile | `v4-go-1re-fcf8dd7076` ; `v4-go-1re-e5175c756e` | 1.2.3 / p. 34 ; 1.2.2 / p. 31 |
| GO 1re | Expert | `v4-go-1re-50b17e024e` ; `v4-go-1re-043cf17f8d` | 1.1.5 / p. 20 ; 1.2.2 / p. 31 |
| GO 2e | Standard | `v4-go-2e-ac1ae6af2a` ; `v4-go-2e-860fb871a4` | 1.1.3 / p. 13 ; 1.1.8 / p. 24 |
| GO 2e | Difficile | `v4-go-2e-890afa35d2` ; `v4-go-2e-a091a2a412` | 1.2.1 / p. 32 ; 1.2.2 / p. 41 |
| GO 2e | Expert | `v4-go-2e-37a50c0657` ; `v4-go-2e-d99728e873` | 1.1.6 / p. 20 ; 1.2.3 / p. 46 |

Points de relecture : bases valeur/volume et marge/marque ; conventions d’attractivité propres à chaque manuel ; représentativité et arrondi des effectifs ; ordre des réductions/TVA/acompte ; sens des coefficients de maîtrise ; distinction entre mise en œuvre et efficacité d’une action. Les réponses chiffrées de cet échantillon ont été recalculées.

## Contrôle du ZIP

Archive créée réellement puis ouverte avec vérification CRC de chaque entrée. Extraction indépendante, comparaison SHA-256 de chaque fichier au manifeste et réexécution des contrôles de banque/SQL/assets ainsi que des 12 tests moteur/synchronisation depuis le dossier extrait : réussies. Aucun dossier parent imposé ; `index.html` est à la racine. Le manifeste `SHA256SUMS.txt` couvre tous les fichiers sauf lui-même.
