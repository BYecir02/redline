# Rapport de Tests - Projet Redline

> **Projet Fil Rouge - Bachelor 3 Développement**
> Jalon 5 - Politique de tests (chapitre X)
>
> **Auteur :** Badirou Mohamed Yecir
> **Formation :** Bachelor 3 Développement - IPSSI
> **Date :** [à compléter]
> **Version :** 1.0

---

## Sommaire

1. [Politique de tests](#1-politique-de-tests)
2. [Tests unitaires](#2-tests-unitaires)
3. [Tests fonctionnels](#3-tests-fonctionnels)
4. [Tests d'intégration](#4-tests-dintégration)
5. [Vérifications manuelles (périmètre non automatisé)](#5-vérifications-manuelles-périmètre-non-automatisé)
6. [Outils et exécution](#6-outils-et-exécution)
7. [Intégration continue (CI)](#7-intégration-continue-ci)
8. [Résultats actuels](#8-résultats-actuels)

---

## 1. Politique de tests

La stratégie de test suit trois niveaux, du plus isolé au plus intégré :

- **Tests unitaires** : logique pure, sans dépendance (base, réseau).
- **Tests fonctionnels** : la chaîne HTTP complète (requête → contrôleur →
  réponse), via un client de test qui simule les appels à l'API.
- **Tests d'intégration** : la logique métier avec une **vraie base PostgreSQL de
  test** (environnement `test`, base `redline_test` isolée de la base de dev).

Priorité assumée : **couvrir en automatique le cœur métier** (authentification,
cycle de vie des détections, agrégations analytiques) plutôt que de viser un
pourcentage de couverture élevé mais superficiel. Les fonctionnalités dépendant de
services externes sont isolées par des doubles de test : le contrat HTTP Anthropic
est vérifié avec `MockHttpClient` côté Symfony et le SDK est mocké avec Vitest côté
Express. Aucun secret ni appel réseau payant n'est nécessaire dans la CI.

---

## 2. Tests unitaires

Ils portent sur des composants purs, exécutés sans base ni réseau.

**Exemple - `PromptBuilderTest`** : vérifie que le générateur de prompt correctif
produit un texte contenant le fichier, le skill, le message du problème, **et** la
consigne stricte de sortie (« renvoie UNIQUEMENT le code corrigé »). Un second cas
vérifie le comportement sur un rapport vide.

**Contrat IA - `AiExplainerTest` et `issueExplainer.test.ts`** : ces tests
vérifient les en-têtes Anthropic, le corps de la requête, le modèle explicite ou
par défaut, la concaténation des blocs texte et les cas d'erreur. Ils emploient
uniquement une fausse clé (`test-key-never-sent`) et interdisent tout appel réseau.

---

## 3. Tests fonctionnels

Ils testent les endpoints de bout en bout via `WebTestCase` (client HTTP simulé).

- **`SkillControllerTest`** : `GET /api/skills` répond `200`, est **public** (sans
  jeton) et renvoie exactement **8 règles** avec les champs attendus.
- **`AuthControllerTest`** : parcours complet
  - inscription (`POST /api/auth/signup`) → `201` + jeton + utilisateur ;
  - connexion (`POST /api/auth/login`) → `200` + jeton ;
  - `GET /api/auth/me` avec le jeton → le bon utilisateur ;
  - mauvais mot de passe → `401` ;
  - `/me` sans jeton → `401` (contrôle d'accès vérifié).

---

## 4. Tests d'intégration

Ils exercent la logique métier contre la vraie base de test.

- **`ReconciliationTest`** (cœur du produit) : vérifie le **cycle de vie complet**
  d'une détection au fil des re-scans :
  1. deux problèmes détectés → deux détections `ACTIVE` ;
  2. un problème disparaît → il passe `RESOLVED`, l'autre reste `ACTIVE` ;
  3. le problème réapparaît → **réouverture** (`ACTIVE`, `reopenCount = 1`).
- **`AnalyticsTest`** : après persistance de détections, la synthèse
  (`AnalyticsRepository::summary`) renvoie les **bons totaux** (actives/résolues,
  événements) et les bonnes **dimensions** (par sévérité).

Ces deux tests valident la partie la plus spécifique et la plus délicate du
backend (réconciliation par signature et agrégations SQL).

---

## 5. Vérifications manuelles et frontières externes

La logique métier et les contrats techniques sont automatisés. Les vérifications
manuelles restantes portent sur l'intégration réelle des services et sur le rendu
visuel :

| Endpoint | Dépendance | Vérification |
|----------|------------|--------------|
| `POST /api/scan` | Moteur Node (ESLint) | Testé manuellement (cURL + démo navigateur) : détections réelles sur des fichiers vulnérables |
| `POST /api/analyze` | API Anthropic | Contrat automatisé avec mocks Symfony et Express : succès, modèle par défaut, clé absente, fournisseur invalide, erreur fournisseur et réponse vide. Un test réel reste facultatif et exige la clé personnelle de l'utilisateur |
| `POST /api/generate-fix-prompt` | Moteur Node | Testé manuellement : prompt généré si problèmes, `null` sinon |
| CORS, en-têtes de sécurité, rate-limit | - | Testés manuellement (preflight, `429` après 5 échecs) |

Cette séparation permet de tester la robustesse de Redline sans enregistrer de clé
Anthropic dans le dépôt ou dans GitHub Actions.

---

## 6. Outils et exécution

- **PHPUnit** (via `symfony/test-pack`) - framework de test.
- **Vitest** - tests du moteur Express et contrat mocké du SDK Anthropic.
- **MockHttpClient** - simulation déterministe des réponses HTTP Anthropic côté
  Symfony.
- **`WebTestCase`** (tests fonctionnels) et **`KernelTestCase`** (tests
  d'intégration avec conteneur de services et base réelle).
- **Base de test dédiée** : environnement `test`, base `redline_test` (suffixe
  automatique), migrée avant l'exécution - isolée de la base de développement.

Exécution locale :
```bash
php bin/console doctrine:database:create --env=test --if-not-exists
php bin/console doctrine:migrations:migrate --env=test --no-interaction
php bin/phpunit
```

---

## 7. Intégration continue (CI)

Une pipeline **GitHub Actions** (`.github/workflows/ci.yml`) exécute les contrôles
**à chaque push et pull request**. Elle contient quatre jobs indépendants :

1. frontend : tests Vitest, vérification TypeScript et build Vite ;
2. moteur Express : génération Prisma, build TypeScript et tests Vitest ;
3. backend Symfony : PostgreSQL éphémère, PHPStan, migrations et PHPUnit ;
4. Docker Compose : validation de la configuration complète.

Un échec de test fait échouer le build : toute régression est détectée dès le push.

> **À insérer :** capture d'écran d'une exécution réussie du workflow (onglet
> « Actions » du dépôt), attestant du statut « build passing ».

---

## 8. Résultats actuels

À la date de rédaction, **l'intégralité de la suite passe** :

```
PHPUnit 11.5.56 by Sebastian Bergmann and contributors.

................                                                  16 / 16 (100%)

OK (16 tests, 62 assertions)
```

| Suite | Type | Tests |
|-------|------|-------|
| PromptBuilderTest | Unitaire | 2 |
| SkillControllerTest | Fonctionnel | 1 |
| AuthControllerTest | Fonctionnel | 3 |
| ProjectConfigurationTest | Fonctionnel | 2 |
| AiExplainerTest | Contrat HTTP mocké | 6 |
| ReconciliationTest | Intégration | 1 |
| AnalyticsTest | Intégration | 1 |
| **Total Symfony** | | **16 tests, 62 assertions, 100 % au vert** |
| Moteur Express | Unitaire, contrôleur et contrat SDK mocké | **109 tests dans 19 fichiers, 100 % au vert** |

Le cœur métier (authentification, cycle de vie des détections, analytics) est
couvert en automatique et vérifié à chaque push par la CI. Le contrat Anthropic
est lui aussi automatisé, sans clé réelle et sans dépendance au réseau (§5).

---

*Document rédigé dans le cadre du Jalon 5. Il constitue le chapitre X (Politique de
tests) du rapport final.*
