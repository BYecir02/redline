# Redline

**Outil de revue de code généré par IA.** Redline surveille en continu le code
produit par un assistant IA (Cursor, Copilot…), l'analyse contre des règles
regroupées en *skills* (sécurité, qualité, robustesse), et génère un **prompt
correctif structuré** à renvoyer à l'IA — jusqu'à ce que le code soit propre.

> Projet double usage : soutenance de fin d'année (bac+4 Dev Data & IA, IPSSI) et
> démonstration de compétences pour une alternance « Développeur Full-Stack
> augmenté par l'IA » (orchestration d'agents de dev IA + garde-fous qualité).

---

## Sommaire

- [Principe](#principe)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Structure du dépôt](#structure-du-dépôt)
- [Démarrage rapide](#démarrage-rapide)
- [Les skills](#les-skills)
- [API backend](#api-backend)
- [Modèle de données](#modèle-de-données)
- [Scripts utiles](#scripts-utiles)
- [État & feuille de route](#état--feuille-de-route)

---

## Principe

Le parcours utilisateur se déroule en deux temps :

1. **Configuration (wizard)** — on connecte un ou plusieurs dossiers, on confirme
   la stack détectée, on choisit les sous-dossiers à surveiller, on renseigne une
   clé API (optionnelle, pour l'analyse contextuelle par IA), et on active les
   skills pertinents.
2. **Surveillance (dashboard temps réel)** — Redline observe les fichiers, fait
   remonter les alertes groupées par skill et par sévérité, trace les tendances,
   et permet de sélectionner des alertes pour **générer un prompt de correction**
   à copier vers l'assistant IA.

Le point clé de conception : le **moteur d'analyse est découplé du framework**.
Ajouter le support d'un nouveau langage ou framework revient à ajouter un module
de skill, sans toucher au cœur (orchestration, watcher, génération de prompt).

## Architecture

### Règles en couches (« skills »)

Chaque skill est une **règle ESLint + ses métadonnées de domaine** (catégorie,
sévérité, stacks ciblées). Elles s'empilent en trois niveaux indépendants et
enfichables :

- **Niveau 1 — universel** (langage-agnostique) : secrets en dur, TODO/FIXME,
  absence de gestion d'erreurs…
- **Niveau 2 — spécifique langage** (JS/TS) : `console.log` oubliés, imports
  inutilisés…
- **Niveau 3 — spécifique framework** (Express, React…) : CORS trop permissif,
  XSS via `innerHTML`/`dangerouslySetInnerHTML`…

Le registre des skills (`backend/src/skills/index.ts`) est la **seule** surface
que le moteur connaît : `analyzer.ts` monte les règles sélectionnées comme un
plugin ESLint à la volée (flat config 100 % en mémoire) et traduit les messages
en un contrat JSON stable (`ScanReport`) consommé tel quel par le front.

### Flux de surveillance

```
Dossier surveillé ──(chokidar)──▶ Watcher ──▶ analyzer (ESLint) ──▶ ScanReport
                                     │                                   │
                                     │                          persistance Postgres
                                     │                          (historique / tendances)
                                     ▼
                              flux SSE (/watch/stream) ──▶ Dashboard React (alertes live)
                                                                  │
                                                    sélection d'alertes ──▶ prompt correctif
```

La boucle de correction **100 % automatique** (analyse → prompt → appel IA →
re-analyse, avec garde-fou `maxAttempts`) existe dans le code
(`engine/loop.ts`) mais est **volontairement mise de côté** : le flux actuel
s'arrête à la génération du prompt, que l'utilisateur applique lui-même via sa
session IA.

## Stack technique

| Couche       | Technologies                                                        |
| ------------ | ------------------------------------------------------------------- |
| **Frontend** | React 18 · Vite 6 · TypeScript · Tailwind 4 · Recharts · lucide-react |
| **Backend**  | Node.js ≥ 20 · Express 4 · TypeScript (ESM, `tsx`)                   |
| **Moteur**   | ESLint 9 (flat config en mémoire) · `@typescript-eslint/parser`     |
| **Watcher**  | chokidar · SSE (Server-Sent Events)                                  |
| **Persistance** | PostgreSQL 16 · Prisma 6                                          |
| **Auth**     | JWT (`jsonwebtoken`) · `bcryptjs`                                    |
| **IA**       | `@anthropic-ai/sdk` (analyse contextuelle à la demande)             |
| **Tests**    | Vitest (18 fichiers de test côté backend)                           |
| **Infra dev**| Docker Compose (Postgres)                                           |

> Le backend Symfony (PHP) imposé par l'école est prévu comme **second** backend
> pour démontrer le découplage du moteur — non présent dans ce dépôt à ce stade.

## Structure du dépôt

```
redline/
├── redline/                 # Frontend — React + Vite + TypeScript
│   └── src/
│       ├── api/             # client HTTP, auth, gestion du token
│       ├── app/App.tsx      # coquille : auth → wizard setup ↔ dashboard
│       ├── domain/          # types, catalogue de skills, stack, config IA
│       ├── components/
│       │   ├── ui/          # présentation pure (Toggle, SeverityBadge, FolderTree…)
│       │   └── system/      # domaines assemblés (auth, setup/*, dashboard/*)
│       └── styles/          # Tailwind + thème (terracotta #c0392b, police Outfit)
│
├── redline-backend/         # Backend — Express + moteur d'analyse
│   ├── src/
│   │   ├── app.ts / server.ts   # app Express (testable) + démarrage
│   │   ├── config/          # chargement & validation de l'environnement
│   │   ├── routes/          # auth, scan, stats, projects, detections
│   │   ├── controllers/     # logique HTTP par domaine
│   │   ├── middlewares/     # requireAuth (JWT), errorHandler
│   │   ├── engine/          # analyzer, watcher, promptBuilder, aiClient, loop
│   │   ├── skills/          # un dossier par règle (rule.ts + rule.test.ts)
│   │   ├── db/              # client Prisma + repositories + reconcile
│   │   └── types/report.ts  # contrat JSON moteur ↔ front (source de vérité)
│   ├── prisma/schema.prisma # User · Project · Detection · DetectionEvent
│   └── docker-compose.yml   # Postgres local (port hôte 55432)
│
└── demo-detection/          # Fichiers d'exemple truffés de problèmes (jeu d'essai)
```

## Démarrage rapide

### Prérequis

- **Node.js ≥ 20**
- **Docker Desktop** (pour la base Postgres locale)

### 1. Base de données

```bash
cd redline-backend
docker compose up -d          # démarre Postgres (conteneur redline-postgres, port 55432)
```

> ⚠️ Le port hôte est **55432** (et non 5432) : les ports 5432/5433 sont réservés
> à un PostgreSQL 18 natif potentiellement installé sur la machine. Les données
> persistent dans le volume `redline_pgdata` — un `docker compose down` ne les
> efface pas.
>
> Si le conteneur existe déjà mais est arrêté (`Conflict. The container name is
> already in use`), il suffit de le redémarrer : `docker start redline-postgres`.

### 2. Backend

```bash
cd redline-backend
npm install
cp .env.example .env          # puis ajuste si besoin (JWT_SECRET, DATABASE_URL…)
npx prisma migrate deploy     # applique le schéma (4 migrations)
npm run dev                   # API sur http://localhost:3001
```

Vérification : `GET http://localhost:3001/health` → `{ "status": "ok" }`.

### 3. Frontend

```bash
cd redline
npm install
npm run dev                   # UI sur http://localhost:5173
```

Le front cible `http://localhost:3001/api` par défaut (surchargeable via
`VITE_API_URL`).

## Les skills

8 skills implémentés côté backend (règles ESLint réelles, chacune couverte par
des tests) :

| Skill                    | Catégorie   | Sévérité   | Détecte                                             |
| ------------------------ | ----------- | ---------- | --------------------------------------------------- |
| `sql-injection`          | Sécurité    | critique   | Requêtes SQL construites par concaténation          |
| `hardcoded-secret`       | Sécurité    | critique   | API keys / tokens / mots de passe en clair          |
| `xss-risk`               | Sécurité    | warning    | `innerHTML` / `dangerouslySetInnerHTML`             |
| `cors-wildcard`          | Sécurité    | warning    | `Access-Control-Allow-Origin: *`                    |
| `missing-error-handling` | Robustesse  | warning    | Appels `async`/`await` sans `try/catch`             |
| `console-logs`           | Qualité     | warning    | `console.log` de debug oubliés                      |
| `unused-imports`         | Qualité     | info       | Modules importés jamais utilisés                    |
| `todo-fixme`             | Qualité     | info       | Commentaires `TODO` / `FIXME` non résolus           |

**Ajouter un skill** : créer `src/skills/<mon-skill>/rule.ts` (règle ESLint +
`meta`) et l'enregistrer dans `src/skills/index.ts`. Aucun autre fichier du
moteur n'est touché.

## API backend

Base : `http://localhost:3001`. 🔒 = route protégée (Bearer JWT).

### Auth
| Méthode | Route              | Description                          |
| ------- | ------------------ | ------------------------------------ |
| `POST`  | `/api/auth/signup` | Création de compte                   |
| `POST`  | `/api/auth/login`  | Connexion → renvoie un JWT           |
| `GET`   | `/api/auth/me` 🔒  | Utilisateur courant (validation jeton)|

### Analyse & surveillance
| Méthode | Route                       | Description                                   |
| ------- | --------------------------- | --------------------------------------------- |
| `GET`   | `/api/skills`               | Catalogue public des skills                   |
| `POST`  | `/api/scan` 🔒              | Analyse un fichier → `ScanReport`             |
| `POST`  | `/api/generate-fix-prompt` 🔒 | Génère le prompt correctif à partir d'un rapport |
| `POST`  | `/api/tree` 🔒              | Arbre réel des sous-dossiers d'un chemin      |
| `POST`  | `/api/analyze` 🔒           | Analyse IA à la demande d'un problème          |
| `POST`  | `/api/watch/sync` 🔒        | Surveille exactement cet ensemble de dossiers |
| `POST`  | `/api/watch/start` 🔒       | Démarre la surveillance (compat mono-dossier) |
| `POST`  | `/api/watch/stop` 🔒        | Arrête la surveillance                        |
| `GET`   | `/api/watch/stream`         | Flux SSE des événements (via `EventSource`)   |

### Analytics & données utilisateur
| Méthode | Route                            | Description                              |
| ------- | -------------------------------- | ---------------------------------------- |
| `GET`   | `/api/stats/summary` 🔒          | Synthèse (totaux, sévérité, MTTR…)       |
| `GET`   | `/api/stats/trends` 🔒           | Tendances horodatées (minute/heure/jour) |
| `GET`   | `/api/projects` 🔒               | Historique des sessions surveillées      |
| `GET`   | `/api/detections/ignored` 🔒     | Détections marquées comme faux positifs  |
| `POST`  | `/api/detections/ignore` 🔒      | Ignorer une détection                    |
| `POST`  | `/api/detections/restore-all` 🔒 | Restaurer toutes les détections ignorées |

> Note : `/watch/stream` n'est pas protégé car `EventSource` ne peut pas porter
> d'en-tête `Authorization` — il ne lit qu'un état en mémoire ; l'isolation par
> utilisateur se joue à l'écriture en base.

## Modèle de données

Prisma / PostgreSQL. La base ne stocke que **l'historique** des détections
(l'analyse elle-même reste *stateless*) :

- **`User`** — compte authentifié, possède ses projets (isolés).
- **`Project`** — un dossier racine surveillé (unique par utilisateur), mémorise
  les skills activés et les sous-dossiers exclus pour rejouer la config à la
  reprise de session.
- **`Detection`** — l'**identité** d'un problème via une *signature* stable
  (`fichier::skill::extrait`), avec son cycle de vie (`ACTIVE`/`RESOLVED`,
  `firstSeenAt`/`lastSeenAt`/`resolvedAt`, `reopenCount`, `ignored`). Mise à jour
  au fil des scans plutôt que recréée.
- **`DetectionEvent`** — journal horodaté *append-only*
  (`APPEARED`/`RESOLVED`/`REOPENED`) alimentant les courbes de tendance et l'audit.

## Scripts utiles

**Backend** (`redline-backend/`)
```bash
npm run dev          # serveur en watch (tsx)
npm run build        # compilation TypeScript
npm test             # Vitest (run unique)
npm run test:watch   # Vitest en watch
npm run db:up        # docker compose up -d
npm run db:down      # docker compose down
npm run db:migrate   # prisma migrate dev
npm run db:studio    # Prisma Studio (explorateur de base)
```

**Frontend** (`redline/`)
```bash
npm run dev          # serveur de dev Vite
npm run typecheck    # tsc --noEmit
npm run build        # typecheck + build de production
```

## État & feuille de route

**Fait**
- Moteur d'analyse ESLint découplé + 8 skills testés
- Watcher temps réel (chokidar → SSE)
- Auth JWT, persistance Postgres (historique, tendances, MTTR, faux positifs)
- Front branché sur le backend réel (wizard + dashboard live)

**À venir**
- Second backend **Symfony** (démonstration du découplage du moteur)
- Réactivation optionnelle de la **boucle de correction automatique**
  (`engine/loop.ts`) avec garde-fou anti-boucle infinie
- Enrichissement des skills niveau 3 (React, Express, Symfony)
- Validation objective des détections contre des outils matures (PHPStan, OWASP…)

---

<sub>Identité visuelle : accent terracotta `#c0392b`, police Outfit, palette
terreuse.</sub>
