# Preuves de recette Docker — Redline

> **Date d'exécution :** 23 août 2026  
> **Environnement :** Docker Desktop 4.51.0, Docker Engine 28.5.2, conteneurs Linux  
> **Branche :** `refactor/dashboard-hooks`

## 1. Démarrage de l'architecture

Commande :

```bash
docker compose up -d --build
```

Résultat observé :

| Service | Image | État | Port hôte |
|---|---|---|---:|
| PostgreSQL | `postgres:16-alpine` | démarré, healthy | 55433 |
| Moteur | `redline-engine` | démarré | 4000 |
| Symfony | `redline-php` | démarré | 8000 |

Les images Symfony et moteur ont été construites sans erreur. Le moteur a journalisé :

```text
Moteur d'analyse Redline en écoute sur http://0.0.0.0:4000
```

## 2. Préparation Symfony

Commandes exécutées :

```bash
docker compose exec -T php php bin/console lexik:jwt:generate-keypair --overwrite --no-interaction
docker compose exec -T php php bin/console doctrine:database:create --env=test --if-not-exists --no-interaction
docker compose exec -T php php bin/console doctrine:migrations:migrate --env=test --no-interaction
```

Résultats :

- paire de clés JWT générée ;
- base isolée `redline_test` disponible ;
- migration `DoctrineMigrations\Version20260727094446` déjà appliquée ;
- aucune fixture n'a été rechargée et aucune donnée de développement n'a été purgée.

## 3. PHPUnit

Commande :

```bash
docker compose exec -T php php bin/phpunit
```

Résultat exact :

```text
PHPUnit 11.5.56 by Sebastian Bergmann and contributors.
Runtime: PHP 8.2.33

........  8 / 8 (100%)

OK (8 tests, 32 assertions)
```

Conclusion : la preuve annoncée dans `J5-Rapport-de-tests.md` est reproductible dans l'environnement Docker prévu.

## 4. PHPStan

Commande :

```bash
docker compose exec -T php vendor/bin/phpstan analyse --no-progress --memory-limit=1G
```

Résultat :

```text
[OK] No errors
```

## 5. Recette API Symfony → moteur

Vérifications réalisées sans modifier les données métier :

| Vérification | Résultat |
|---|---|
| `GET http://localhost:4000/health` | `status: ok` |
| `GET http://localhost:8000/api/skills` | HTTP 200, 8 skills |
| Connexion `demo@redline.dev` | réussie, JWT reçu |
| `POST /api/scan` authentifié | rapport reçu pour `audit-demo.js` |
| Code injecté pour le test | concaténation SQL avec `req.body.id` |
| Résultat du scan | 1 issue, skill `sql-injection` |

En-têtes observés sur la réponse Symfony :

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
```

Cette vérification valide le chemin :

```text
client HTTP → authentification Symfony → /api/scan → AnalyzerClient → moteur Node/ESLint → ScanReport
```

## 6. Corpus `demo-detection`

Les neuf fichiers ont été envoyés au moteur avec les huit skills activés.

| Fichier | Issues | Skills déclenchés |
|---|---:|---|
| `auth.js` | 0 | — |
| `config-secrets.ts` | 4 | `hardcoded-secret`, `unused-imports` |
| `cors-config.js` | 0 | — |
| `db-users.js` | 0 | — |
| `middleware.js` | 4 | `console-logs`, `cors-wildcard`, `todo-fixme` |
| `orders-api.js` | 3 | `console-logs`, `missing-error-handling`, `sql-injection` |
| `Profile.jsx` | 0 | — |
| `safe-example.js` | 0 | — |
| `widget.jsx` | 5 | `todo-fixme`, `unused-imports`, `xss-risk` |

Résultat global : **16 issues** et **8 skills distincts déclenchés**.

Les fichiers sûrs ou corrigés sont restés sans alerte dans ce scénario, ce qui apporte des exemples négatifs en complément des détections positives.

## 7. Tests Node/Vitest

Premier lancement dans l'image construite :

- 36 tests passaient ;
- `scan.controller.test.ts` échouait car le client Prisma n'était pas généré ;
- les huit fichiers de règles étaient signalés sans suite de test.

Cause Docker identifiée : le Dockerfile du moteur copie `package.json`, `tsconfig.json` et `src`, mais ne copie pas `prisma/` et n'exécute pas `prisma generate`.

Pour poursuivre le diagnostic sans modifier le dépôt, le schéma Prisma a été copié temporairement dans le conteneur, puis le client a été généré. Après cette opération :

```text
Test Files  8 failed | 10 passed (18)
Tests       39 passed (39)
```

Les huit échecs restants sont tous :

```text
Error: No test suite found in file /app/src/skills/<skill>/rule.test.ts
```

Conclusion : la logique des autres suites est verte, mais les fichiers basés sur ESLint `RuleTester` ne sont pas correctement enregistrés auprès de Vitest. Ils ne constituent donc pas encore une preuve automatisée exécutable des huit règles.

## 8. Build Node

Dans l'image initiale, le build TypeScript échouait à cause des types Prisma non générés. Après la génération temporaire du client :

```bash
docker compose exec -T engine npm run build
```

Résultat : **succès, code de sortie 0**.

Correctif requis dans l'image :

1. copier le dossier `prisma/` ;
2. exécuter `npx prisma generate` pendant la construction ;
3. conserver le moteur d'analyse seul comme commande de production, ou séparer clairement l'image moteur de l'image backend Express complet.

## 9. Bilan de recette

| Domaine | Verdict |
|---|---|
| Orchestration Docker | validée |
| PostgreSQL test | validé |
| Symfony PHPUnit | validé, 8/8 et 32 assertions |
| Symfony PHPStan | validé, aucune erreur |
| API Symfony → moteur | validée |
| Catalogue des 8 skills | validé |
| Détection fonctionnelle des 8 skills | validée sur le corpus |
| Build frontend | validé séparément |
| Build Node | valide après génération Prisma, Dockerfile à corriger |
| Vitest Node | partiel : 39 tests passent, 8 suites `RuleTester` non enregistrées |
| API Anthropic réelle | non testée |
| Parcours graphique navigateur complet | non automatisé |

Ce document peut servir de source au chapitre « Politique de tests » et aux annexes, mais une capture de la CI verte et une exécution Vitest entièrement réussie restent nécessaires avant d'affirmer que toutes les validations sont au vert.
