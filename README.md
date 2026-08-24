# Redline

**Outil de revue de code généré par IA.** Redline analyse le code produit par un
assistant IA (Cursor, Copilot...), le confronte à des règles regroupées en
*skills* (sécurité, qualité, robustesse), et génère un **prompt correctif
structuré** à renvoyer à l'IA, jusqu'à ce que le code soit propre.

> Projet fil rouge de fin d'année - Bachelor 3 Développement, IPSSI
> (certification Concepteur Développeur d'Applications).

---

## Sommaire

- [Principe](#principe)
- [Interface desktop-first](#interface-desktop-first)
- [Architecture : deux backends, un moteur](#architecture--deux-backends-un-moteur)
- [Stack technique](#stack-technique)
- [Structure du dépôt](#structure-du-dépôt)
- [Démarrage rapide](#démarrage-rapide)
- [Les skills](#les-skills)
- [API backend](#api-backend)
- [Modèle de données](#modèle-de-données)
- [Scripts utiles](#scripts-utiles)
- [État et feuille de route](#état-et-feuille-de-route)

---

## Principe

Le parcours utilisateur se déroule en deux temps :

1. **Configuration (wizard)** - on choisit un dossier de code, on confirme la
   stack détectée, on sélectionne les sous-dossiers à surveiller, on renseigne une
   clé API (optionnelle, pour l'analyse contextuelle par IA), et on active les
   skills pertinents.
2. **Analyse (dashboard)** - Redline analyse les fichiers, fait remonter les
   alertes groupées par skill et par sévérité, trace les tendances, et permet de
   sélectionner des alertes pour **générer un prompt de correction** à copier vers
   l'assistant IA.

## Interface desktop-first

Redline est un outil de développement destiné à être utilisé sur ordinateur, en
parallèle d'un éditeur de code. Le dashboard combine une arborescence de dossiers,
des indicateurs, une liste d'alertes et un panneau de génération de prompt. Une
version mobile de ce poste de travail dégraderait donc la lisibilité et la
manipulation de ces informations.

- La connexion et la création de compte restent utilisables sur une petite largeur.
- Le wizard et le dashboard demandent une largeur de fenêtre minimale de `1024 px`.
- Sous ce seuil, Redline affiche un message explicatif au lieu de compresser les panneaux.
- La résolution de travail recommandée est `1280 × 720` ou supérieure.
- Entre `1024 px` et `1099 px`, le prompt correctif s'ouvre dans une modale ; à partir
  de `1100 px`, il peut rester affiché dans une troisième colonne redimensionnable.

## Architecture : deux backends, un moteur

Le principe de conception central de Redline est le **découplage du moteur
d'analyse**. Pour le démontrer concrètement, le projet fournit **deux backends
interchangeables** exposant la même API autour du **même moteur d'analyse** :

```
                    ┌──────────────────────────┐
                    │   Front React (Vite)      │
                    │   lit les fichiers côté    │
                    │   navigateur (File System) │
                    └────────────┬─────────────┘
                                 │  API REST (VITE_API_URL)
              ┌──────────────────┴──────────────────┐
              ▼                                      ▼
   ┌────────────────────┐                ┌────────────────────┐
   │  redline-express    │                │  redline-symfony    │
   │  Node / Express      │                │  Symfony 7 / PHP     │
   │  Prisma · JWT        │                │  Doctrine · LexikJWT │
   │  port 3001           │                │  port 8000           │
   └─────────┬──────────┘                └─────────┬──────────┘
             │ moteur en interne                    │ moteur en HTTP (:4000)
             ▼                                      ▼
        ┌───────────────────────────────────────────────┐
        │   Moteur d'analyse : ESLint + skills           │
        │   (redline-express/src/engine + src/skills)    │
        └───────────────────────────────────────────────┘
```

- **`redline-express`** - le backend **d'origine**, en Node/Express, complet
  (authentification JWT, persistance Prisma, routes, surveillance temps réel). Il
  embarque le moteur d'analyse **en interne** (même processus). Port `3001`.
- **`redline-symfony`** - le **même périmètre d'API** réécrit en **Symfony / PHP**,
  imposé par l'école pour la certification CDA. Comme PHP ne peut pas exécuter
  ESLint (un outil Node), Symfony appelle le moteur en **micro-service HTTP**. Port
  `8000`.
- **Le moteur d'analyse** (ESLint + skills) est **partagé** : le même code sert en
  interne à Express et est exposé par `redline-express/src/engine-server.ts`
  (`POST /analyze`, port `4000`) pour Symfony.

Résultat : **on change de framework backend sans toucher ni au front, ni au
moteur.** C'est la démonstration vivante du découplage.

### Règles en couches (« skills »)

Chaque skill est une **règle ESLint + ses métadonnées de domaine** (catégorie,
sévérité, stacks ciblées), empilées en trois niveaux enfichables :

- **Niveau 1 - universel** (langage-agnostique) : secrets en dur, TODO/FIXME,
  absence de gestion d'erreurs...
- **Niveau 2 - spécifique langage** (JS/TS) : `console.log` oubliés, imports
  inutilisés...
- **Niveau 3 - spécifique framework** (Express, React...) : CORS trop permissif,
  XSS via `innerHTML` / `dangerouslySetInnerHTML`...

Le registre des skills (`redline-express/src/skills/index.ts`) est la **seule**
surface que le moteur connaît : l'analyzer monte les règles sélectionnées comme un
plugin ESLint à la volée (flat config en mémoire) et traduit les messages en un
contrat JSON stable (`ScanReport`), consommé tel quel par les backends puis le
front.

## Stack technique

| Couche | Technologies |
| ------ | ------------ |
| **Frontend** | React 18 · Vite · TypeScript · Tailwind · Recharts · lucide-react |
| **Backend A (origine)** | Node.js 20 · Express 4 · TypeScript (ESM, `tsx`) · Prisma 6 · JWT |
| **Backend B (soutenance)** | Symfony 7.4 · PHP 8.2 · Doctrine ORM 3 · LexikJWT (RS256) |
| **Moteur d'analyse** | ESLint 9 (flat config en mémoire) · `@typescript-eslint/parser` |
| **Persistance** | PostgreSQL 16 (Prisma côté Express, Doctrine côté Symfony) |
| **IA** | API Anthropic (analyse contextuelle à la demande) |
| **Tests** | Vitest (moteur + skills) · PHPUnit · PHPStan niveau 5 |
| **Infra dev** | Docker Compose · GitHub Actions (CI Symfony) |

## Structure du dépôt

```
redline/
├── redline/                 # Frontend - React + Vite + TypeScript (commun aux 2 backends)
│   └── src/
│       ├── api/             # client HTTP, auth, gestion du token
│       ├── app/App.tsx      # coquille : auth → wizard setup ↔ dashboard
│       ├── domain/          # types, catalogue de skills, stack, config IA
│       ├── components/
│       │   ├── ui/          # présentation pure (Toggle, SeverityBadge, FolderTree...)
│       │   └── system/      # domaines assemblés (auth, setup/*, dashboard/*)
│       └── styles/          # Tailwind + thème (terracotta #c0392b, police Outfit)
│
├── redline-express/         # Backend A - Node / Express (d'origine) + MOTEUR partagé
│   ├── src/
│   │   ├── server.ts        # backend Express complet (port 3001)
│   │   ├── engine-server.ts # moteur seul exposé en HTTP pour Symfony (port 4000)
│   │   ├── routes/ controllers/ middlewares/ auth/ config/ db/   # backend Express
│   │   ├── engine/          # analyzer (ESLint), watcher, promptBuilder, aiClient, loop
│   │   ├── skills/          # une règle ESLint par skill (+ index.ts)
│   │   └── types/report.ts  # contrat JSON moteur ↔ front (source de vérité)
│   └── prisma/schema.prisma # User · Project · Detection · DetectionEvent
│
├── redline-symfony/         # Backend B - Symfony 7 / PHP 8.2 (version soutenance CDA)
│   ├── src/
│   │   ├── Controller/      # Auth, Scan, Skill, Project, Stats, Detection, Analyze
│   │   ├── Service/         # AnalyzerClient (appelle le moteur), DetectionReconciler...
│   │   ├── Entity/          # User, Project, Detection, DetectionEvent (Doctrine)
│   │   └── Enum/            # DetectionStatus, EventType
│   ├── migrations/          # schéma PostgreSQL (Doctrine Migrations)
│   └── tests/               # PHPUnit (WebTestCase + KernelTestCase)
│
├── demo-detection/          # Fichiers d'exemple truffés de problèmes (jeu d'essai)
├── soutenance/              # Livrables de soutenance (jalons, mémoire)
└── docker-compose.yml       # Orchestration : frontend + Symfony + moteur + PostgreSQL
```

## Démarrage rapide

Le front est **commun** : il cible le backend indiqué par `VITE_API_URL`. Choisis
un des deux backends ci-dessous, puis lance le front.

### Option A - Backend d'origine (Node / Express)

```bash
cd redline-express
docker compose up -d          # Postgres local (port hôte 55432)
npm install
cp .env.example .env          # ajuste si besoin (JWT_SECRET, DATABASE_URL...)
npx prisma migrate deploy     # applique le schéma
npm run dev                   # API sur http://localhost:3001
```

Le front doit alors cibler `http://localhost:3001/api` (voir `redline/.env`).

### Option B - Backend soutenance (Symfony), via Docker Compose

À la racine du dépôt :

```bash
docker compose up -d --build
```

Lance quatre conteneurs : `redline-db` (PostgreSQL, port 55433), `redline-php`
(Symfony, port 8000), `redline-engine` (le moteur Node, port 4000) et
`redline-frontend` (React servi par Nginx, port 5173). Puis :

```bash
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction
docker compose exec php php bin/console doctrine:fixtures:load --no-interaction
```

L'application complète est accessible sur `http://localhost:5173`. Nginx transmet
les requêtes `/api` au backend Symfony sur le réseau Docker interne.

Compte de démonstration : **`demo@redline.dev`** / **`demo1234`**.

### Frontend en développement local

Le lancement séparé reste disponible pour travailler sur l'interface avec le
rechargement à chaud, ou pour utiliser le backend Express :

```bash
cd redline
npm install
npm run dev                   # UI sur http://localhost:5173
```

### Prérequis

- **Node.js ≥ 20**
- **Docker Desktop** (base de données)

## Les skills

8 skills implémentés dans le moteur (règles ESLint réelles, chacune couverte par
des tests) :

| Skill | Catégorie | Sévérité | Détecte |
| ----- | --------- | -------- | ------- |
| `sql-injection` | Sécurité | critique | Requêtes SQL construites par concaténation |
| `hardcoded-secret` | Sécurité | critique | API keys / tokens / mots de passe en clair |
| `xss-risk` | Sécurité | warning | `innerHTML` / `dangerouslySetInnerHTML` |
| `cors-wildcard` | Sécurité | warning | `Access-Control-Allow-Origin: *` |
| `missing-error-handling` | Robustesse | warning | Appels `async`/`await` sans `try/catch` |
| `console-logs` | Qualité | warning | `console.log` de debug oubliés |
| `unused-imports` | Qualité | info | Modules importés jamais utilisés |
| `todo-fixme` | Qualité | info | Commentaires `TODO` / `FIXME` non résolus |

**Ajouter un skill** : créer `redline-express/src/skills/<mon-skill>/rule.ts`
(règle ESLint + `meta`) et l'enregistrer dans `src/skills/index.ts`. Les deux
backends en héritent automatiquement.

## API backend

Les deux backends exposent le **même contrat d'API** (préfixe `/api`). 🔒 = route
protégée (Bearer JWT). Base : `http://localhost:3001` (Express) ou
`http://localhost:8000` (Symfony).

### Auth
| Méthode | Route | Description |
| ------- | ----- | ----------- |
| `POST` | `/api/auth/signup` | Création de compte |
| `POST` | `/api/auth/login` | Connexion → renvoie un JWT |
| `GET` | `/api/auth/me` 🔒 | Utilisateur courant (validation du jeton) |

### Analyse
| Méthode | Route | Description |
| ------- | ----- | ----------- |
| `GET` | `/api/skills` | Catalogue public des skills |
| `POST` | `/api/scan` 🔒 | Analyse un fichier via le moteur → `ScanReport` |
| `POST` | `/api/generate-fix-prompt` 🔒 | Génère le prompt correctif à partir d'un rapport |
| `POST` | `/api/analyze` 🔒 | Analyse IA à la demande d'un problème (API Anthropic) |

### Analytics et données utilisateur
| Méthode | Route | Description |
| ------- | ----- | ----------- |
| `GET` | `/api/stats/summary` 🔒 | Synthèse (totaux, sévérité, MTTR...) |
| `GET` | `/api/stats/trends` 🔒 | Tendances horodatées (minute/heure/jour) |
| `GET` | `/api/projects` 🔒 | Historique des sessions analysées |
| `GET` | `/api/detections/ignored` 🔒 | Détections marquées comme faux positifs |
| `POST` | `/api/detections/ignore` 🔒 | Ignorer une détection |
| `POST` | `/api/detections/restore-all` 🔒 | Restaurer toutes les détections ignorées |

> Le backend Express propose en plus une **surveillance temps réel** par flux SSE
> (`/api/watch/*`, `/api/tree`), héritée de sa version d'origine. La version
> Symfony s'appuie sur une analyse à la demande côté navigateur. Toutes les routes
> protégées sont scopées par utilisateur (`WHERE user_id = :uid`).

## Modèle de données

Quatre entités, identiques dans les deux backends (Prisma côté Express, Doctrine
côté Symfony). La base ne stocke que **l'historique** des détections (l'analyse
elle-même reste *stateless*) :

- **`User`** - compte authentifié, possède ses projets (isolés).
- **`Project`** - un dossier analysé, mémorise les skills activés et les
  sous-dossiers exclus pour rejouer la config à la reprise de session.
- **`Detection`** - l'**identité** d'un problème via une *signature* stable
  (`fichier::skill::extrait`), avec son cycle de vie (`ACTIVE`/`RESOLVED`,
  `firstSeenAt`/`lastSeenAt`/`resolvedAt`, `reopenCount`, `ignored`). Mise à jour
  au fil des scans plutôt que recréée (réconciliation).
- **`DetectionEvent`** - journal horodaté *append-only*
  (`APPEARED`/`RESOLVED`/`REOPENED`) alimentant les courbes de tendance et l'audit.

## Scripts utiles

**Backend Express** (`redline-express/`)
```bash
npm run dev          # backend complet en watch (tsx, port 3001)
npm test             # Vitest (moteur + skills)
npm run db:migrate   # prisma migrate dev
npm run db:studio    # Prisma Studio (explorateur de base)
```

**Backend Symfony** (`redline-symfony/`, via `docker compose exec php ...`)
```bash
php bin/console doctrine:migrations:migrate      # applique le schéma
php bin/console doctrine:fixtures:load           # (re)charge les données de démo
php bin/phpunit                                  # tests fonctionnels + unitaires
vendor/bin/phpstan analyse                       # analyse statique (niveau 5)
```

**Frontend** (`redline/`)
```bash
npm run dev          # serveur de dev Vite
npm run typecheck    # tsc --noEmit
npm run build        # typecheck + build de production
```

## État et feuille de route

**Fait**
- Backend Express complet (auth JWT, scan, stats, historique, surveillance SSE)
- Backend Symfony équivalent (version soutenance CDA) branché sur le même moteur
- Moteur d'analyse ESLint découplé + 8 skills testés
- Persistance Postgres (historique, tendances, réconciliation, faux positifs)
- Front branché sur les backends réels (wizard + dashboard)
- CI GitHub Actions (PHPStan + PHPUnit), orchestration Docker Compose

**À venir**
- Enrichissement des skills niveau 3 (React, Express, Symfony)
- Réactivation optionnelle de la boucle de correction automatique (`engine/loop.ts`)
- Déploiement et mise en production

---

<sub>Identité visuelle : accent terracotta `#c0392b`, police Outfit, palette
terreuse.</sub>
