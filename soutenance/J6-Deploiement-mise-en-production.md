# Déploiement & Mise en Production - Projet Redline

> **Projet Fil Rouge - Bachelor 3 Développement**
> Jalon 6 - Déploiement, mise en production et rapport final
>
> **Auteur :** Badirou Mohamed Yecir
> **Formation :** Bachelor 3 Développement - IPSSI
> **Date :** [à compléter]
> **Version :** 1.0

---

## Sommaire

1. [Produit final livrable](#1-produit-final-livrable)
2. [Prérequis](#2-prérequis)
3. [Lancement du projet (pas à pas)](#3-lancement-du-projet-pas-à-pas)
4. [Variables d'environnement](#4-variables-denvironnement)
5. [Environnements (dev / test / prod)](#5-environnements-dev--test--prod)
6. [Passage en production](#6-passage-en-production)
7. [Stratégie de mise en production](#7-stratégie-de-mise-en-production)
8. [Structure du rapport final consolidé](#8-structure-du-rapport-final-consolidé)

---

## 1. Produit final livrable

- **Code source** taggé en release (ex. `v1.0`) sur le dépôt Git.
- **Conteneurs Docker** prêts : un `docker-compose.yml` (racine) qui lance
  l'ensemble en une commande.
- **Trois services orchestrés** :
  - `database` - PostgreSQL 16 (historique des détections) ;
  - `php` - l'API Symfony ;
  - `engine` - le moteur d'analyse Node (ESLint), interne.
- **Front React** (dossier `redline/`) pointant sur l'API Symfony.

## 2. Prérequis

- **Docker** et **Docker Compose** (Docker Desktop sous Windows/macOS).
- **Node.js 20+** (uniquement pour lancer le front en développement).

## 3. Lancement du projet (pas à pas)

Depuis la racine du projet :

```bash
# 1. Démarrer les conteneurs (base + API Symfony + moteur Node)
docker compose up -d --build

# 2. Générer la paire de clés JWT (les .pem ne sont pas versionnés)
docker compose exec php php bin/console lexik:jwt:generate-keypair --no-interaction

# 3. Appliquer les migrations de base de données
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction

# 4. Charger le compte et les données de démonstration
docker compose exec php php bin/console doctrine:fixtures:load --no-interaction
```

Puis lancer le front :

```bash
cd redline
npm install
npm run dev        # http://localhost:5173
```

**Accès :**
- Front : http://localhost:5173
- API Symfony : http://localhost:8000
- Compte de démonstration : **`demo@redline.dev` / `demo1234`**

> Le jury ou un développeur tiers peut ainsi déployer l'application en local sans
> configuration supplémentaire.

## 4. Variables d'environnement

| Variable | Rôle | Où |
|----------|------|-----|
| `DATABASE_URL` | Connexion PostgreSQL | Injectée par `docker-compose` |
| `ENGINE_URL` | URL interne du moteur Node | Injectée par `docker-compose` |
| `JWT_SECRET_KEY` / `JWT_PUBLIC_KEY` | Chemins des clés JWT | `.env` (chemins, pas de secret) |
| `JWT_PASSPHRASE` | Passphrase de la clé JWT | Vide (clé sans passphrase ; clé privée non versionnée) |
| `CORS_ALLOW_ORIGIN` | Origines autorisées (CORS) | `.env` |
| `VITE_API_URL` | URL de l'API côté front | `redline/.env` |
| Clé API Anthropic | Analyse IA | **Fournie par l'utilisateur à l'exécution**, jamais stockée |

> **Sécurité** : la clé privée JWT et les secrets locaux (`.env.local`) sont
> **exclus du dépôt** (`.gitignore`). Aucun secret exploitable n'est versionné.

## 5. Environnements (dev / test / prod)

| Environnement | `APP_ENV` | Base | Particularités |
|---------------|-----------|------|----------------|
| Développement | `dev` | `redline` | Debug activé, OPcache, données de démo |
| Test | `test` | `redline_test` | Base isolée, utilisée par PHPUnit et la CI |
| Production | `prod` | Base dédiée | Debug **désactivé**, secrets régénérés, HTTPS |

Symfony gère ces environnements nativement (fichiers `.env`, `when@test` /
`when@prod` dans la configuration).

## 6. Passage en production

Points de durcissement pour un déploiement réel :

- **`APP_ENV=prod`, `APP_DEBUG=0`** (désactive le profileur et les traces).
- **Serveur applicatif** : remplacer le serveur PHP intégré (dev) par
  **PHP-FPM + Nginx** ou **FrankenPHP**.
- **Base de données** : un PostgreSQL managé (ex. Supabase), `DATABASE_URL`
  pointant dessus, secrets hors dépôt.
- **Clés JWT** : régénérées sur l'environnement de production.
- **CORS** : restreint à l'origine réelle du front déployé (plus de `localhost:*`).
- **HTTPS** : terminaison TLS via le reverse proxy.
- **Cache** : `composer install --no-dev --optimize-autoloader` +
  `cache:warmup`.

## 7. Stratégie de mise en production

Pour minimiser les interruptions lors d'une mise à jour, plusieurs stratégies
existent :

- **Blue/Green** : deux environnements identiques ; on déploie la nouvelle version
  (green) en parallèle, on teste, puis on bascule le routage. Retour arrière
  immédiat en cas de problème.
- **Rolling update** : mise à jour progressive conteneur par conteneur, sans
  coupure globale.
- **Déploiement en fenêtre de maintenance** : plus simple, acceptable pour ce
  projet où une courte interruption n'est pas critique.

Pour Redline, une approche **conteneurs + reconstruction d'image + redémarrage**
(éventuellement automatisée via la CI/CD) est adaptée à l'échelle du projet.

## 8. Structure du rapport final consolidé

Le rapport final assemble tous les livrables des jalons en un document unique
(avec page de garde, sommaire et numérotation). Correspondance jalons → chapitres :

| Chapitre | Source | Jalon |
|----------|--------|-------|
| III. Cahier des charges | `J1-Cahier-des-charges-fonctionnel.md` | J1 |
| IV. Méthodologie et organisation | `J2-Methodologie-et-conception-UX-UI.md` | J2 |
| V. Conception UI/UX | `J2-...` + maquettes Figma | J2 |
| VI. Modélisation de la BD | `J3-Modelisation-base-de-donnees.md` | J3 |
| VII. Conception de l'application | `J4-Conception-application-architecture.md` | J4 |
| VIII. Architecture multi-couches | `J4-...` | J4 |
| IX. Sécurité | `J5-Securite-OWASP.md` | J5 |
| X. Politique de tests | `J5-Rapport-de-tests.md` | J5 |
| XI. Déploiement et mise en production | ce document | J6 |
| Annexes | captures CI, extraits de tests, etc. | - |

À compléter dans le rapport final :
- un **guide utilisateur** court (parcours de démonstration) ;
- une **conclusion et perspectives** (bilan, améliorations futures : réactivation
  de la boucle de correction automatique, extension des skills, version desktop).

---

*Document rédigé dans le cadre du Jalon 6. Il constitue le chapitre XI
(Déploiement et mise en production) du rapport final, et cadre l'assemblage du
document consolidé.*
