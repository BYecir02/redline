# Audit de l'état final de Redline

> **Date de l'audit :** 23 août 2026  
> **Périmètre :** mémoire, jalons, frontend React, backend Express, backend Symfony, moteur ESLint, persistance PostgreSQL, Docker et CI  
> **Objectif :** établir une base factuelle avant l'enrichissement du mémoire et la constitution des annexes de preuve

---

## 1. Verdict exécutif

Redline est un **projet réellement développé**, et non une simple maquette. Le dépôt contient notamment :

- un frontend React/TypeScript complet avec authentification, assistant de configuration et dashboard ;
- un backend historique Express avec authentification, surveillance de fichiers, SSE, persistance et statistiques ;
- un backend Symfony conforme à la contrainte CDA, avec JWT, Doctrine, contrôleurs, services, sécurité et analytique ;
- un moteur d'analyse ESLint indépendant et huit règles déterministes ;
- un modèle de données cohérent autour des utilisateurs, projets, détections et événements ;
- des tests Node et Symfony, une analyse PHPStan et une CI GitHub Actions ;
- un jeu de fichiers vulnérables destiné à la démonstration.

Le mémoire actuel est toutefois **plus affirmatif que les preuves disponibles**. Il décrit parfois l'architecture cible comme si tous les parcours étaient équivalents entre Express et Symfony, alors que plusieurs différences demeurent. Il annonce également certaines preuves qui ne sont pas encore insérées : captures du produit, résultat de CI, maquettes Figma, diagrammes rendus, dépôt/release et résultats de tests reproductibles.

### Synthèse F1–F12

- **8 exigences sont livrées ou livrées avec réserve** : F1, F2, F5, F6, F8, F9, F10 et F11.
- **4 exigences sont partielles dans l'architecture de soutenance Symfony** : F3, F4, F7 et F12.
- Aucune exigence n'est totalement fictive : chaque fonctionnalité annoncée possède au moins une implémentation ou un socle réel.
- L'écart principal n'est donc pas « projet absent », mais **périmètre exact mal explicité et preuves insuffisantes**.

### Priorités absolues avant de rallonger le mémoire

1. Décider et documenter le parcours officiel de démonstration avec Symfony : sélection native du dossier et polling navigateur, ou ajout des routes manquantes côté Symfony.
2. Constituer les preuves visuelles et exécutables avant de rédiger davantage.
3. Corriger les affirmations inexactes du mémoire et des jalons.
4. Relancer toutes les suites dans un environnement propre avec PostgreSQL, puis conserver les sorties et la capture de CI.
5. Ajouter un vrai guide utilisateur illustré, un plan de tests détaillé et un tableau « prévu / livré / reporté ».

---

## 2. Méthode et limites de l'audit

L'audit a reposé sur :

- la lecture du mémoire V1 et des jalons J1 à J6 ;
- l'inventaire des fichiers et des configurations du dépôt ;
- la lecture ciblée des composants frontend, routes, contrôleurs, services, entités, repositories, règles et tests ;
- la confrontation des exigences F1 à F12 avec les chemins de code réels ;
- l'exécution locale du typecheck et du build frontend ;
- la construction et le démarrage de l'environnement Docker complet ;
- l'exécution de PHPUnit, PHPStan, Vitest et du build Node dans les conteneurs ;
- une recette API Symfony → moteur et l'analyse du corpus `demo-detection` ;
- l'inspection de Docker Compose, des Dockerfiles, de la CI, de l'historique Git et des éléments de preuve disponibles.

Limites restantes :

- aucune vérification d'un environnement de production public n'a été possible, aucun lien de production n'étant fourni ;
- les appels réels à Anthropic n'ont pas été exécutés afin de ne pas utiliser une clé ou engendrer un coût sans nécessité ;
- aucun test end-to-end graphique n'a été exécuté dans un navigateur automatisé ;
- la CI distante n'a pas été consultée : les preuves ci-dessous proviennent de l'environnement Docker local du dépôt.

L'environnement Docker a permis de lever les incertitudes initiales sur Symfony et de révéler deux défauts reproductibles côté Node : génération Prisma absente de l'image et intégration incorrecte de `RuleTester` avec Vitest.

---

## 3. État vérifié du dépôt

### 3.1 Volumétrie utile

| Zone | Fichiers | Lignes pertinentes approximatives | Observation |
|---|---:|---:|---|
| Frontend `redline/src` | 51 | 4 000 | React, TypeScript, styles et logique navigateur |
| Express + moteur `redline-express/src` | 63 | 3 556 | API, moteur, surveillance, Prisma et tests |
| Symfony `redline-symfony/src` | 29 | 1 722 | Contrôleurs, services, entités et sécurité |
| Tests Symfony | 6 | 205 | 8 méthodes de test dans 5 classes principales |
| Jeu de démonstration | 9 | petit corpus ciblé | Motifs vulnérables et exemple sûr |
| Mémoire V1 | 1 037 lignes | 5 916 mots | Environ 44 305 caractères |

Le frontend ne contient actuellement **aucun fichier de test automatisé**. Le moteur/Express contient **18 fichiers `*.test.ts`**, dont huit suites `RuleTester` pour les huit skills.

### 3.2 État Git constaté

Branche auditée : `refactor/dashboard-hooks`, alignée sur `origin/refactor/dashboard-hooks` et `origin/develop` au début de l'audit.

Des modifications locales préexistaient et ont été préservées :

- `redline-symfony/Dockerfile` ;
- `redline/src/components/system/dashboard/Dashboard.tsx` ;
- `redline/src/components/ui/severity.ts` ;
- nouveaux fichiers `useIgnoredDetections.ts`, `domain/prompt.ts` et `domain/severity.ts`.

L'état observé inclut donc du travail non committé. Une release ou un tag de soutenance devra être créé seulement après validation et commit explicite de ces changements.

### 3.3 Architecture réellement présente

Le découplage du moteur est réel :

```text
Frontend React
  ├─ API Express : moteur intégré + surveillance Chokidar/SSE + Prisma
  └─ API Symfony : orchestration HTTP vers le moteur Node + Doctrine

Moteur Node/ESLint
  └─ POST /analyze → ScanReport
```

L'affirmation « deux backends interchangeables » doit cependant être nuancée. Les deux backends partagent le contrat principal d'authentification, analyse, skills, prompt, IA, projets, statistiques et faux positifs. **Symfony ne fournit pas** les routes Express suivantes :

- `POST /api/tree` ;
- `POST /api/watch/start` ;
- `POST /api/watch/stop` ;
- `POST /api/watch/sync` ;
- `GET /api/watch/stream`.

Le front peut fonctionner avec Symfony en utilisant l'API File System Access du navigateur et un polling toutes les deux secondes. En revanche, le mode « chemin local saisi » et le flux SSE restent liés à Express.

---

## 4. Matrice de traçabilité F1–F12

### Légende

- **Livré** : fonctionnalité identifiable de bout en bout dans le code.
- **Livré avec réserve** : fonction présente, mais preuve, sécurité ou cohérence à consolider.
- **Partiel** : une partie significative du besoin ou un parcours annoncé n'est pas couvert.
- **Non livré** : aucune implémentation exploitable constatée.

| ID | Exigence | Statut réel | Implémentation et preuve dans le dépôt | Écart / action nécessaire |
|---|---|---|---|---|
| **F1** | Authentification et isolation | **Livré avec réserve** | Écrans signup/login ; JWT côté Express et LexikJWT côté Symfony ; mots de passe hachés ; routes protégées ; requêtes analytiques scopées par utilisateur ; rate limiter Symfony. | Le JWT est stocké dans `localStorage`. Le flux SSE Express est public et repose sur un gestionnaire global : il ne garantit pas l'isolation de ce qui est diffusé. Ajouter tests d'autorisation par deux utilisateurs et documenter la différence Express/Symfony. |
| **F2** | Wizard multi-étapes | **Livré avec réserve** | Cinq étapes : dossiers, stack, sous-dossiers, clé API, skills. Session conservée côté navigateur. | En mode Symfony, les `skills` et `excluded` d'un projet ne sont pas mis à jour lors du scan ; la reprise ne restaure donc pas fidèlement la configuration enregistrée. |
| **F3** | Connexion du code source | **Partiel** | Sélecteur natif File System Access ; ajout de plusieurs dossiers ; chemin local ; exclusions automatiques de dossiers techniques. | Le chemin local appelle `/tree` et `/watch/*`, absents de Symfony. Officialiser le sélecteur navigateur pour la démo Symfony ou implémenter un service local sécurisé. |
| **F4** | Détection de la stack | **Partiel** | `detectStack()` propose JS, TS et plusieurs frameworks et laisse la correction manuelle. | La détection repose surtout sur le **nom du chemin**, pas sur `package.json`, les extensions réellement présentes ou les dépendances. Remplacer ou compléter par une inspection réelle des fichiers. |
| **F5** | Sélection des skills | **Livré** | Huit règles affichées par catégorie/sévérité, activation individuelle, recherche et filtrage selon la stack. | Le catalogue est dupliqué dans le front, Symfony et le moteur. Des commentaires front indiquent encore à tort que cinq règles restent à écrire. Mettre le moteur ou `/api/skills` comme source de vérité. |
| **F6** | Analyse déterministe | **Livré avec réserve sur les tests** | ESLint 9 configuré en mémoire, contrat `ScanReport`, huit règles réelles, microservice `/analyze`. Le corpus déclenche bien les huit skills et le contre-exemple sûr reste sans alerte. | 39 tests Node passent, mais Vitest marque les huit fichiers `RuleTester` en échec avec « No test suite found ». Corriger l'adaptateur `RuleTester`/Vitest et conserver une sortie entièrement verte. |
| **F7** | Surveillance temps réel | **Partiel** | Chokidar + SSE dans Express ; polling navigateur toutes les deux secondes pour les dossiers sélectionnés nativement. | Aucune route de surveillance dans Symfony. Le SSE Express est non authentifié et son état est global. La formulation « temps réel Symfony » doit être remplacée par « polling navigateur » ou la fonctionnalité doit être portée proprement. |
| **F8** | Dashboard | **Livré** | Alertes actives/résolues, filtres, sévérités, skills, tendances, statistiques, pause, rafraîchissement, panneau de prompt et analyses dépliables. Build de production validé. | Aucun test frontend. Le bundle dashboard atteint environ 571 kB avant gzip et déclenche un avertissement Vite. Ajouter tests de composants et captures desktop/mobile. |
| **F9** | Analyse contextuelle IA | **Livré avec réserve** | Bouton frontend et endpoint `/api/analyze` ; implémentation Anthropic dans les deux backends ; erreurs 400/502 prévues. | Pas de test automatisé de contrat et pas de preuve d'appel réussi conservée. La clé est « non stockée serveur », mais elle est enregistrée dans la session `localStorage` du front : corriger la documentation et envisager `sessionStorage` ou mémoire uniquement. |
| **F10** | Prompt correctif | **Livré avec réserve** | Sélection de plusieurs alertes et génération Markdown dans `domain/prompt.ts` ; endpoint backend équivalent et `PromptBuilderTest` Symfony. | Le front n'appelle pas l'endpoint `/generate-fix-prompt` : deux générateurs coexistent. Le test Symfony ne valide pas le prompt réellement copié par l'utilisateur. Unifier ou tester les deux contrats. |
| **F11** | Faux positifs | **Livré avec réserve** | Ignorer/restaurer dans le dashboard ; cache local ; persistance par utilisateur/projet ; exclusion des statistiques. | Persistance « best effort » silencieuse et endpoints non couverts par des tests dédiés. Ajouter tests de propriété, restauration et comportement hors ligne. |
| **F12** | Historique et analytique | **Partiel** | Quatre entités, réconciliation ACTIVE/RESOLVED/REOPENED, journal append-only, projets, tendances, MTTR et récurrences. Les tests DB Symfony passent dans PostgreSQL. | Le mode historique montre surtout les statistiques, pas une liste détaillée des détections passées. La configuration `skills/excluded` n'est pas alimentée côté Symfony. |

### Conclusion de la matrice

Le cœur différenciant de Redline est bien là : **détection déterministe → cycle de vie → sélection → prompt correctif**. Les lacunes se concentrent sur l'homogénéité Symfony/Express, la reprise d'historique, la robustesse de la détection de stack et les preuves de validation.

---

## 5. Résultats des vérifications exécutées

| Vérification | Résultat du 23/08/2026 | Interprétation |
|---|---|---|
| Front `npm run typecheck` | **Réussi** | Le TypeScript du frontend est valide. |
| Front `npm run build` | **Réussi** | 2 425 modules transformés ; build Vite produit. Avertissement sur un chunk > 500 kB. |
| Docker Compose complet | **Réussi** | Images `redline-php` et `redline-engine` construites ; PostgreSQL, Symfony et moteur démarrés ; base déclarée saine. |
| Symfony PHPStan niveau 5 | **Réussi dans Docker** | `No errors`. |
| Symfony PHPUnit complet | **Réussi dans Docker** | `OK (8 tests, 32 assertions)` avec PostgreSQL `redline_test`. |
| Recette API Symfony → moteur | **Réussie** | Health moteur `ok`, 8 skills publics, login démo, scan authentifié et détection `sql-injection`. |
| En-têtes de sécurité Symfony | **Réussi** | `nosniff`, `DENY` et `no-referrer` observés. |
| Corpus des huit skills | **Réussi fonctionnellement** | 16 issues sur les fichiers vulnérables, couvrant les huit skills ; fichiers sûrs sans alerte. |
| Node/Express TypeScript | **Réussi après génération Prisma manuelle** | Le build passe après copie du schéma et `prisma generate`. Le Dockerfile ne réalise pas ces étapes. |
| Node/Express Vitest | **Échec partiel** | 39 tests passent dans 10 fichiers ; les huit fichiers de règles échouent avec `No test suite found`. |

Le résultat annoncé dans J5 est désormais **reproduit exactement** dans Docker : `OK (8 tests, 32 assertions)`. Il peut être conservé dans le mémoire, accompagné d'une capture ou de la sortie datée. En revanche, il ne faut pas présenter l'ensemble du dépôt comme « 100 % au vert » tant que les huit suites `RuleTester` Node ne sont pas correctement enregistrées dans Vitest.

Le détail horodaté de cette recette est conservé dans `soutenance/Preuves-recette-Docker-2026-08-23.md`.

### Couverture de CI réelle

Le workflow `.github/workflows/ci.yml` couvre :

1. PostgreSQL éphémère ;
2. PHP 8.2 et Composer ;
3. génération des clés JWT ;
4. PHPStan ;
5. migration de la base de test ;
6. PHPUnit.

Il ne couvre pas actuellement :

- le typecheck et le build React ;
- les tests Vitest du moteur/Express ;
- le build des images Docker ;
- un test de contrat Symfony ↔ moteur ;
- un parcours end-to-end navigateur.

Pour une preuve plus forte, la CI doit devenir une matrice à trois jobs : `frontend`, `engine-express`, `symfony`, puis un job facultatif d'intégration Docker.

---

## 6. Écarts et contradictions documentaires à corriger

### 6.1 Dans le mémoire V1

| Emplacement | Affirmation actuelle | Correction factuelle recommandée |
|---|---|---|
| Ligne 11 | Date de soutenance à compléter | Insérer la date officielle. |
| Objectif O6, vers la ligne 181 | Application complète via `docker compose up` | Le Compose racine lance base + Symfony + moteur, mais pas le front ; clés, migrations et fixtures demandent aussi des commandes. |
| UI/UX, vers les lignes 296, 303 et 330 | Maquettes « voir annexe » | Les annexes correspondantes ne sont pas présentes dans le dépôt. Insérer les exports et les numéroter. |
| CI, vers la ligne 755 | CI exécutée à chaque push | Préciser qu'elle ne couvre aujourd'hui que Symfony/PHPStan/PHPUnit. |
| Déploiement, vers la ligne 779 | Accès applicatif complet | Présenter ces URLs comme environnement local de démonstration, pas comme production. |
| Sécurité/démonstration, vers la ligne 865 | Captures « voir annexe » | Créer et insérer les captures réelles. |
| Difficultés, vers les lignes 945–952 | Surveillance non portée dans Symfony | Conserver cet aveu, puis aligner F7, le résumé et la conclusion sur ce statut partiel. |
| Conclusion, vers la ligne 986 | Objectifs atteints, « plus de 8 règles » | Écrire « huit règles » et distinguer objectifs atteints, partiels et reportés. |
| Annexes, ligne 1031 | Lien dépôt à insérer, release `v1.0` | Le remote existe, mais aucun tag n'a été constaté. Insérer le lien et créer la release seulement après recette. |
| Fin, lignes 1035–1036 | Document à finaliser | Cette note confirme que la V1 n'est pas encore un mémoire final. La retirer une fois toutes les preuves insérées. |

### 6.2 Dans les autres documents

- Les jalons J1, J3, J4, J5 et J6 contiennent encore une date `[à compléter]`.
- J1 conclut que F1 à F12 sont implémentées et validées, alors que F3, F4, F7 et F12 nécessitent une formulation partielle.
- J5 affirme une suite intégralement verte : conserver l'affirmation seulement avec la capture de CI correspondante et son commit.
- J6 dit que la clé Anthropic n'est « jamais stockée ». Elle n'est pas persistée par le serveur, mais le frontend l'inclut actuellement dans `redline.session` dans `localStorage`.
- J6 présente le projet comme déployable sans configuration supplémentaire, alors que les clés JWT, migrations, fixtures et le démarrage séparé du front sont nécessaires.
- Le commentaire de `domain/catalog.ts` indique que seulement trois règles seraient implémentées ; les huit règles existent désormais. Ce commentaire est obsolète.
- Le commentaire d'en-tête du dashboard affirme encore que l'analyse IA est simulée, alors que le code appelle maintenant `/api/analyze`.

---

## 7. Points techniques à traiter avant la soutenance

### P0 — Bloquants pour une démonstration fiable

1. **Choisir le mode officiel Symfony.** Pour le parcours recommandé, sélectionner un dossier via la fenêtre native du navigateur. Ne pas saisir un chemin serveur tant que `/tree` et `/watch/*` ne sont pas implémentés côté Symfony.
2. **Rendre la recette reproductible.** La recette Docker fonctionne ; ajouter un script ou une commande documentée qui génère les clés, prépare `redline_test`, migre et lance les vérifications.
3. **Réparer l'image Node.** Copier `prisma/` dans l'image et exécuter `prisma generate`, puis intégrer explicitement ESLint `RuleTester` au runner Vitest afin d'obtenir 18 fichiers au vert.
4. **Tester le parcours complet.** Signup → choix dossier → stack → exclusions → skills → détection → analyse IA optionnelle → prompt → correction → résolution → statistiques.
5. **Aligner les affirmations du mémoire** sur les résultats de cette recette.

### P1 — Risques de sécurité et de cohérence

1. Protéger ou supprimer l'exposition publique du SSE Express ; créer une surveillance isolée par utilisateur/session.
2. Ne pas exposer le port `4000` du moteur hors du réseau Docker si seul Symfony doit l'appeler.
3. Restreindre le CORS Express en dehors du développement.
4. Éviter le stockage durable du JWT et de la clé IA dans `localStorage`, ou documenter clairement le risque XSS et la mesure compensatoire.
5. Valider réellement l'adresse email côté Symfony et normaliser sa casse, comme le fait Express.
6. Sauvegarder `skills` et `excluded` dans le projet Symfony lors des scans/configurations.
7. Unifier le catalogue de skills et le générateur de prompt afin d'éviter les divergences.

### P2 — Qualité et maintenabilité

1. Ajouter des tests frontend pour le wizard, les filtres, les faux positifs et le prompt copié.
2. Ajouter des tests Symfony avec faux client HTTP pour `/scan`, `/analyze` et `/generate-fix-prompt`.
3. Ajouter des tests d'autorisation multi-utilisateurs sur projets, statistiques et ignores.
4. Ajouter un contrat partagé ou une validation JSON Schema pour `ScanReport`.
5. Optimiser le chunk dashboard ou documenter ce choix de performance.
6. Remplacer la détection de stack par l'inspection de `package.json`, des extensions et des fichiers de configuration.

---

## 8. Inventaire des preuves

### 8.1 Preuves déjà présentes

| Preuve | État | Utilisation possible dans le mémoire |
|---|---|---|
| Code des trois couches | Présent | Extraits courts et commentés, jamais des pages entières de code |
| 8 règles ESLint | Présentes | Tableau des règles + un exemple positif/négatif par règle |
| 18 fichiers de tests Node | Présents, suite partielle | 39 tests passent ; huit fichiers `RuleTester` doivent être réparés |
| 8 tests Symfony | Présents et validés | 8 tests et 32 assertions au vert dans Docker |
| CI GitHub Actions | Présente | Extrait YAML + capture d'un run vert lié à un commit |
| Migration Doctrine | Présente | MPD, contraintes, index et clés étrangères |
| Docker Compose et Dockerfiles | Présents | Architecture de déploiement local |
| Corpus `demo-detection` | Présent | Scénario de démonstration reproductible |
| Recette Docker datée | Présente | Résultats des services, tests, API et huit skills |
| Historique Git | Présent | Stratégie de branches, jalons et progression |
| Jalons J1 à J6 | Présents | Matière de fond pour les chapitres détaillés |

### 8.2 Preuves absentes ou non finalisées

- aucune capture PNG/JPG du produit dans le dépôt ;
- aucun export local des wireframes ou maquettes Figma ;
- aucun diagramme rendu en image ; les diagrammes restent en Mermaid dans le Markdown ;
- aucune capture d'une CI verte ;
- aucun rapport de couverture ;
- aucun export de tests API, collection Postman ou équivalent ;
- aucun procès-verbal de recette F1–F12 signé/daté ;
- aucun résultat de test de performance ;
- aucun audit d'accessibilité ;
- aucun lien de production ;
- aucun tag ou release Git constaté ;
- aucun jeu de captures avant/après montrant une détection résolue ;
- aucun retour utilisateur formalisé.

### 8.3 Pack de preuves à produire

Créer un dossier d'annexes versionné et nommer les éléments de façon stable :

```text
soutenance/annexes/
  A01-auth-inscription.png
  A02-wizard-dossiers.png
  A03-wizard-stack.png
  A04-wizard-skills.png
  A05-dashboard-alertes.png
  A06-detail-detection.png
  A07-prompt-correctif.png
  A08-detection-resolue.png
  A09-statistiques-historique.png
  A10-faux-positif-ignore.png
  B01-ci-verte.png
  B02-vitest-sortie.txt
  B03-phpunit-sortie.txt
  B04-phpstan-sortie.txt
  B05-build-front-sortie.txt
  C01-architecture.png
  C02-cas-utilisation.png
  C03-sequence-scan.png
  C04-classes.png
  C05-mcd.png
  D01-recette-f1-f12.md
```

Chaque figure du mémoire doit comporter : numéro, titre, source, date ou commit, et une phrase expliquant ce qu'elle prouve.

---

## 9. Ce qu'il faut reprendre du rapport CALENDRIA

Le rapport CALENDRIA est plus convaincant surtout parce qu'il **matérialise** son travail : nombreuses figures, dictionnaire détaillé, parcours utilisateur, description de déploiement, tableaux de validation et annexes. Redline possède déjà une meilleure matière sur certains sujets — sécurité, veilles, difficultés rencontrées, anglais et justification du découplage — mais cette matière reste trop compacte et trop peu illustrée.

À reprendre :

- une page de garde finalisée et une table des matières paginée ;
- une introduction avec contexte, problème, objectifs et annonce du plan ;
- un tableau clair « prévu / réalisé / partiel / reporté » ;
- un guide utilisateur illustré étape par étape ;
- un dictionnaire de données complet avec types, contraintes et justification ;
- des diagrammes rendus et lisibles, accompagnés d'explications ;
- un chapitre de tests avec cas, préconditions, entrées, résultats attendus et résultats observés ;
- un chapitre de déploiement réellement reproductible ;
- des annexes numérotées et citées depuis le corps du texte.

À ne pas reprendre :

- les sections restées « à réaliser » dans un rapport prétendument final ;
- les incohérences de nombres de tests ;
- les artefacts de navigateur dans les pages imprimées ;
- l'accumulation de captures sans analyse ;
- les longues répétitions des jalons sans consolidation éditoriale.

---

## 10. Proposition de structure pour un mémoire de 80 pages utile

La longueur doit venir des preuves, des décisions et de l'analyse, pas du remplissage.

| Partie | Volume cible | Contenu à développer |
|---|---:|---|
| Préliminaires | 5–7 pages | Garde, remerciements, résumés FR/EN, glossaire, sommaire |
| Contexte et problématique | 5–6 pages | IA générative, risques du code produit, utilisateurs, benchmark sourcé |
| Cahier des charges | 6–8 pages | objectifs SMART, personas, F1–F12, non-fonctionnel, risques, critères d'acceptation |
| Gestion de projet | 5–6 pages | planning prévu/réel, jalons, branches, décisions, écarts et arbitrages |
| UX/UI | 8–10 pages | parcours, zoning, wireframes, charte, composants, responsive, accessibilité, captures finales |
| Modélisation des données | 7–8 pages | dictionnaire, MCD/MLD/MPD, index, contraintes, cycle de vie, requêtes analytiques |
| Architecture et conception | 10–12 pages | cas d'utilisation, séquences, classes, n-tiers, contrat `ScanReport`, comparaison Express/Symfony |
| Réalisation technique | 10–12 pages | moteur ESLint, registre de skills, watcher/polling, réconciliation, prompt, IA, extraits expliqués |
| Sécurité et RGPD | 6–8 pages | modèle de menace, OWASP, JWT, CORS, rate limit, stockage navigateur, limites et correctifs |
| Tests et qualité | 8–10 pages | stratégie, matrice F1–F12, cas de tests, sorties réelles, CI, couverture et limites |
| Déploiement | 5–7 pages | Docker, variables, procédure vérifiée, logs, sauvegarde, observabilité, rollback |
| Guide utilisateur | 6–8 pages | tutoriel complet illustré, erreurs fréquentes, interprétation des résultats |
| Veilles, difficultés, bilan | 7–9 pages | sources datées, décisions influencées, problèmes rencontrés, compétences, perspectives |
| Annexes | hors décompte ou 15+ pages | preuves, sorties de tests, diagrammes, recette, extraits de configuration |

Cette structure peut dépasser 80 pages tout en restant défendable, à condition que chaque section apporte une décision, une explication ou une preuve.

---

## 11. Plan d'action de consolidation

### Étape A — Fixer la vérité produit

- valider la matrice F1–F12 ;
- choisir le parcours Symfony officiel ;
- décider quels écarts seront corrigés et lesquels seront déclarés comme limites ;
- supprimer les commentaires obsolètes et harmoniser les termes.

### Étape B — Produire les preuves

- exécuter la recette complète dans Docker ;
- capturer les écrans du parcours ;
- conserver les sorties des tests/builds ;
- obtenir une CI verte sur le commit final ;
- rendre les diagrammes et exporter les maquettes.

### Étape C — Corriger le produit à fort impact

- persister la configuration projet côté Symfony ;
- sécuriser la surveillance Express ;
- unifier catalogue et prompt ;
- ajouter les tests manquants les plus critiques ;
- fiabiliser la détection de stack.

### Étape D — Réécrire le mémoire

- remplacer les promesses par des résultats observés ;
- intégrer un tableau prévu/réalisé/reporté ;
- approfondir la réalisation technique ;
- ajouter le guide utilisateur ;
- référencer chaque preuve dans le texte ;
- actualiser résultats de tests, date, dépôt, commit et release.

### Étape E — Recette éditoriale finale

- vérifier tous les renvois de figures et annexes ;
- vérifier la cohérence des chiffres ;
- relire orthographe, typographie et encodage ;
- exporter en PDF et contrôler visuellement chaque page ;
- faire relire le document par une personne qui ne connaît pas le projet.

---

## 12. Conclusion

La bonne stratégie n'est pas de gonfler immédiatement le mémoire à 80 pages. Il faut d'abord transformer Redline en **dossier démontrable** : une version identifiée, un parcours officiel, une recette reproductible et un pack de preuves.

Une fois ces éléments produits, le projet fournit assez de matière réelle pour un mémoire long et solide : double backend, découplage du moteur, règles ESLint, cycle de vie des détections, analytique, sécurité, CI et retour d'expérience. Les ajouts prioritaires ne sont donc pas des paragraphes génériques, mais des captures, résultats, critères d'acceptation, comparaisons techniques et analyses honnêtes des écarts.

Le prochain livrable logique est le **procès-verbal de recette F1–F12**, puis la collecte des captures correspondantes. C'est ce document de recette qui permettra ensuite de réécrire le mémoire final sans inventer et sans contradiction.
