# Conception de l'Application & Architecture - Projet Redline

> **Projet Fil Rouge - Bachelor 3 Développement**
> Jalon 4 - Conception de l'application (UML) et architecture multi-couches
>
> **Auteur :** Badirou Mohamed Yecir
> **Formation :** Bachelor 3 Développement - IPSSI
> **Date :** [à compléter]
> **Version :** 1.0

---

## Sommaire

1. [Diagramme de cas d'utilisation](#1-diagramme-de-cas-dutilisation)
2. [Diagrammes de séquence](#2-diagrammes-de-séquence)
3. [Diagramme de classes](#3-diagramme-de-classes)
4. [Architecture multi-couches](#4-architecture-multi-couches)
5. [Composants externes et bibliothèques](#5-composants-externes-et-bibliothèques)

---

## 1. Diagramme de cas d'utilisation

Un seul acteur : l'**Utilisateur authentifié** (développeur, débutant ou vibe
codeur). Certaines actions publiques (consulter le catalogue) ne requièrent pas de
connexion.

```mermaid
flowchart LR
    U([Utilisateur])

    subgraph Authentification
        UC1(S'inscrire)
        UC2(Se connecter)
    end
    subgraph Configuration
        UC3(Consulter le catalogue de règles)
    end
    subgraph Analyse
        UC4(Analyser du code)
        UC5(Obtenir une analyse IA d'un problème)
        UC6(Générer un prompt correctif)
    end
    subgraph Suivi
        UC7(Consulter projets et statistiques)
        UC8(Gérer les faux positifs)
    end

    U --- UC1
    U --- UC2
    U --- UC3
    U --- UC4
    U --- UC5
    U --- UC6
    U --- UC7
    U --- UC8
```

| # | Cas d'utilisation | Endpoint | Accès |
|---|-------------------|----------|-------|
| UC1 | S'inscrire | `POST /api/auth/signup` | Public |
| UC2 | Se connecter | `POST /api/auth/login` | Public |
| UC3 | Consulter le catalogue de règles | `GET /api/skills` | Public |
| UC4 | Analyser du code | `POST /api/scan` | Authentifié |
| UC5 | Obtenir une analyse IA d'un problème | `POST /api/analyze` | Authentifié |
| UC6 | Générer un prompt correctif | `POST /api/generate-fix-prompt` | Authentifié |
| UC7 | Consulter projets et statistiques | `GET /api/projects`, `/api/stats/*` | Authentifié |
| UC8 | Gérer les faux positifs | `GET/POST /api/detections/*` | Authentifié |

> **Note de périmètre** : la configuration guidée (wizard : sélection des dossiers,
> détection de la stack, choix des règles) est gérée côté front et se reflète dans
> l'appel `POST /api/scan` ; la surveillance temps réel relève du moteur / de la
> version desktop. Les cas ci-dessus couvrent les interactions exposées par l'API
> Symfony.

---

## 2. Diagrammes de séquence

### 2.1 Connexion (authentification JWT)

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant F as Front React
    participant C as AuthController
    participant R as UserRepository
    participant H as PasswordHasher
    participant J as JWTTokenManager

    U->>F: saisit email + mot de passe
    F->>C: POST /api/auth/login
    C->>R: findOneBy(email)
    R-->>C: User (ou null)
    C->>H: isPasswordValid(user, password)
    H-->>C: vrai / faux
    alt identifiants valides
        C->>J: create(user)
        J-->>C: jeton JWT
        C-->>F: 200 { token, user }
        F-->>U: connecté (jeton stocké)
    else identifiants invalides
        C-->>F: 401 { error }
    end
```

### 2.2 Analyse de code avec persistance (cas central)

Ce diagramme illustre le principe directeur : **Symfony orchestre, le moteur Node
analyse**. Il montre la délégation au service d'analyse puis la réconciliation en
base.

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant F as Front React
    participant C as ScanController
    participant A as AnalyzerClient
    participant E as Moteur Node (ESLint)
    participant Rec as DetectionReconciler
    participant DB as PostgreSQL

    U->>F: sélectionne un dossier à analyser
    F->>C: POST /api/scan { code, filename, skills, projectPath }
    C->>A: analyze(code, filename, skills)
    A->>E: POST /analyze (HTTP interne)
    E-->>A: rapport { issues[] }
    A-->>C: rapport
    opt projectPath fourni
        C->>Rec: reconcileFileReport(project, rapport)
        Rec->>DB: upsert détections (create / reopen / touch / resolve)
        Rec->>DB: écrit les événements (APPEARED / RESOLVED / REOPENED)
    end
    C-->>F: 200 rapport
    F-->>U: affiche les alertes
```

### 2.3 Analyse IA d'un problème (API externe)

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant F as Front React
    participant C as AnalyzeController
    participant X as AiExplainer
    participant AN as API Anthropic

    U->>F: clique « Analyser » sur une alerte
    F->>C: POST /api/analyze { apiKey, skillName, snippet, ... }
    C->>X: explain(contexte, provider, model, apiKey)
    X->>AN: POST /v1/messages (clé de l'utilisateur)
    AN-->>X: réponse (analyse en langage naturel)
    X-->>C: texte de l'analyse
    C-->>F: 200 { analysis }
    F-->>U: affiche l'explication
```

---

## 3. Diagramme de classes

### 3.1 Modèle du domaine (entités)

```mermaid
classDiagram
    class User {
        -int id
        -string email
        -string passwordHash
        -DateTimeImmutable createdAt
        +getRoles()
        +getUserIdentifier()
    }
    class Project {
        -int id
        -string path
        -string label
        -array skills
        -array excluded
        -DateTimeImmutable createdAt
    }
    class Detection {
        -int id
        -string file
        -string skillId
        -string category
        -string severity
        -int line
        -string signature
        -DetectionStatus status
        -bool ignored
        -int reopenCount
        -DateTimeImmutable firstSeenAt
        -DateTimeImmutable resolvedAt
    }
    class DetectionEvent {
        -int id
        -EventType type
        -string skillId
        -string severity
        -DateTimeImmutable at
    }
    class DetectionStatus {
        <<enumeration>>
        ACTIVE
        RESOLVED
    }
    class EventType {
        <<enumeration>>
        APPEARED
        RESOLVED
        REOPENED
    }

    User "1" *-- "0..*" Project : possède
    Project "1" *-- "0..*" Detection : contient
    Project "1" *-- "0..*" DetectionEvent : journalise
    Detection "0..1" o-- "0..*" DetectionEvent : génère
    Detection ..> DetectionStatus : utilise
    DetectionEvent ..> EventType : utilise
```

Les liens **pleins (composition ◆)** traduisent une dépendance de cycle de vie
(`ON DELETE CASCADE` : supprimer un utilisateur ou un projet purge ses données
rattachées). Le lien **creux (agrégation ◇)** entre `Detection` et
`DetectionEvent` traduit le `ON DELETE SET NULL` : un événement (ex. résolution)
**survit** à la suppression de sa détection - d'où la cardinalité `0..1` côté
détection.

### 3.2 Couches applicatives (contrôleurs, services, dépôts)

L'application suit une séparation stricte des responsabilités. Chaque contrôleur
délègue à des services métier, qui s'appuient sur des dépôts Doctrine.

| Couche | Classes | Rôle |
|--------|---------|------|
| **Contrôleurs** (HTTP) | `AuthController`, `SkillController`, `ScanController`, `ProjectController`, `StatsController`, `DetectionController`, `AnalyzeController` | Reçoivent la requête, valident les entrées, délèguent, formatent la réponse JSON |
| **Services** (métier) | `AnalyzerClient`, `DetectionReconciler`, `AnalyticsRepository`, `AiExplainer`, `PromptBuilder`, `SkillCatalog` | Logique métier : orchestration du moteur, réconciliation, agrégations, appel IA |
| **Dépôts** (données) | `UserRepository`, `ProjectRepository`, `DetectionRepository`, `DetectionEventRepository` | Accès aux entités via Doctrine ORM |
| **Entités** (modèle) | `User`, `Project`, `Detection`, `DetectionEvent` (+ enums) | Représentation persistante du domaine |

Exemples de collaborations clés :
- `ScanController` → `AnalyzerClient` (appel du moteur) puis `DetectionReconciler`
  (persistance).
- `DetectionReconciler` → `EntityManager` + `ProjectRepository` +
  `DetectionRepository`.
- `AnalyzeController` → `AiExplainer` → API Anthropic.
- `StatsController` / `ProjectController` / `DetectionController` →
  `AnalyticsRepository` (SQL agrégé scopé par utilisateur).

---

## 4. Architecture multi-couches

### 4.1 Architecture logique (MVC + services)

L'application respecte le pattern **MVC** de Symfony, enrichi d'une **couche de
services** métier :

- **Modèle** : les entités Doctrine (`User`, `Project`, `Detection`,
  `DetectionEvent`) et leur persistance en base.
- **Vue** : l'application front **React** (SPA) consommant l'API ; côté serveur,
  les réponses sont du **JSON** (API REST, pas de Twig).
- **Contrôleur** : les contrôleurs Symfony, qui ne contiennent **aucune logique
  métier** - ils délèguent aux services.
- **Services** : la logique métier isolée (réconciliation, analyse, agrégations),
  testable et réutilisable.

Principe directeur : **le moteur d'analyse est découplé du framework.** Symfony
orchestre (authentification, persistance, sécurité, API) et **délègue l'analyse
proprement dite à un moteur Node** (ESLint), appelé en HTTP interne. Ajouter un
langage/framework revient à enrichir le moteur, sans toucher au backend.

### 4.2 Architecture n-tiers (déploiement)

```mermaid
flowchart TD
    subgraph Client["Tier client"]
        FR["Front React SPA<br/>(navigateur)"]
    end
    subgraph App["Tier application (Docker Compose)"]
        PHP["Conteneur PHP<br/>API Symfony"]
        NODE["Conteneur Node<br/>Moteur d'analyse (ESLint)"]
    end
    subgraph Data["Tier données"]
        PG[("PostgreSQL")]
    end
    EXT["API Anthropic<br/>(service tiers)"]

    FR -->|HTTPS / JSON| PHP
    PHP -->|HTTP interne| NODE
    PHP -->|Doctrine| PG
    PHP -->|HTTPS| EXT
```

- **Tier client** : le navigateur exécutant la SPA React.
- **Tier application** : deux conteneurs orchestrés par **Docker Compose** - l'API
  Symfony (PHP) et le moteur d'analyse (Node). Le moteur n'est pas exposé
  publiquement : il n'est joignable que par Symfony sur le réseau interne Docker.
- **Tier données** : PostgreSQL (conteneur dédié, volume persistant).
- **Service tiers** : l'API Anthropic, appelée avec la clé de l'utilisateur.

> Distinction couche logique / tier physique : les couches logiques (contrôleurs,
> services, données) peuvent tourner sur un même hôte ; il s'agit néanmoins d'une
> architecture n-tiers, séparée par conteneurs.

### 4.3 Séparation des responsabilités et bonnes pratiques

- **Single Responsibility** : chaque service a une responsabilité unique
  (`DetectionReconciler` = cycle de vie ; `AnalyticsRepository` = lecture agrégée ;
  `AiExplainer` = appel IA).
- **Contrôleurs fins** : aucune logique métier dans les contrôleurs.
- **Injection de dépendances** : services injectés via l'autowiring Symfony.
- **Secrets isolés** : clés/jetons hors du code (variables d'environnement), clé
  privée JWT hors dépôt.
- **Conventions** : PSR-12, typage strict PHP 8.
- **Design patterns** : *Adapter* (`AnalyzerClient` masque le moteur Node externe
  derrière une interface simple), *Strategy* (`AiExplainer` conçu pour accueillir
  plusieurs fournisseurs d'IA interchangeables), *Registry* (catalogue de skills),
  et *injection de dépendances* omniprésente (autowiring Symfony).

---

## 5. Composants externes et bibliothèques

| Composant | Rôle |
|-----------|------|
| **Doctrine ORM** | Mapping objet-relationnel, requêtes paramétrées (anti-injection) |
| **LexikJWTAuthenticationBundle** | Émission et vérification des jetons JWT |
| **NelmioCorsBundle** | Gestion des en-têtes CORS (front sur origine distincte) |
| **Symfony RateLimiter** | Limitation des tentatives de connexion (anti-brute-force) |
| **Symfony HttpClient** | Appels HTTP au moteur Node et à l'API Anthropic |
| **Moteur Node (ESLint)** | Service d'analyse statique découplé (les 8 skills) |
| **API Anthropic** | Analyse contextuelle IA à la demande (API tierce) |
| **Docker / Docker Compose** | Conteneurisation et orchestration des services |
| **PHPUnit** | Tests unitaires, fonctionnels et d'intégration |

---

*Document rédigé dans le cadre du Jalon 4. Il constitue le chapitre VII
(Conception de l'application) et VIII (Architecture multi-couches) du rapport
final. Les diagrammes sont fournis en Mermaid ; à l'export PDF, les remplacer par
des images rendues.*
