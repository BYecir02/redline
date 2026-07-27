# Cahier des Charges Fonctionnel - Projet Redline

> **Projet Fil Rouge - Bachelor 3 Développement**
> Jalon 1 - Cahier des charges fonctionnel
>
> **Auteur :** Badirou Mohamed Yecir
> **Formation :** Bachelor 3 Développement - IPSSI
> **Date :** [à compléter]
> **Version :** 1.0

---

## Sommaire

1. [Contexte métier](#1-contexte-métier)
2. [Objectifs du projet](#2-objectifs-du-projet)
3. [Utilisateurs cibles](#3-utilisateurs-cibles)
4. [Périmètre fonctionnel](#4-périmètre-fonctionnel)
5. [Exigences techniques](#5-exigences-techniques)
6. [Contraintes et enjeux](#6-contraintes-et-enjeux)
7. [Critères de succès](#7-critères-de-succès)

---

## 1. Contexte métier

### 1.1 Le domaine : le développement assisté par IA

La génération de code par intelligence artificielle (Cursor, GitHub
Copilot, Lovable, Replit…) est devenue une pratique courante, y compris chez des
développeurs juniors et des profils non-techniques (« vibe coders ») qui
produisent des applications entières en dialoguant avec une IA. Cette accélération
a un revers : **le code généré est produit plus vite qu'il n'est relu**, et son
auteur n'a souvent ni le temps, ni parfois les compétences, pour en évaluer la
sûreté.

### 1.2 Le problème à résoudre

Le code généré par IA contient régulièrement des défauts invisibles à l'œil non
averti : secrets d'API codés en dur, requêtes SQL vulnérables aux injections,
failles XSS, configurations CORS trop permissives, absence de gestion d'erreurs,
etc. Ces problèmes passent d'autant plus facilement que :

- l'auteur **fait confiance** au code généré et ne le relit pas en profondeur ;
- les outils d'analyse existants (ESLint, SonarQube…) produisent des messages
  **techniques et cryptiques**, peu exploitables par un débutant ;
- surtout, ces outils **s'arrêtent au diagnostic** : ils listent les problèmes
  mais ne referment jamais la boucle avec l'IA qui a écrit le code. La correction
  reste un aller-retour manuel, fastidieux et source d'erreurs.

Il existe donc un espace non couvert : non pas un énième détecteur, mais un
**garde-fou qui traduit les problèmes en langage compréhensible et prépare
automatiquement leur correction par l'IA**.

### 1.3 La solution : Redline

**Redline** est un outil de revue automatique du code généré par IA. Il surveille
en continu un projet, analyse le code contre des règles regroupées en « skills »
(sécurité, qualité, robustesse), explique chaque problème détecté, et génère un
**prompt correctif structuré** à renvoyer à l'IA. Le cycle se répète jusqu'à
validation du code, avec un garde-fou anti-boucle-infinie (nombre maximal de
tentatives avant revue manuelle).

L'architecture repose sur un **moteur d'analyse central découplé du framework** :
les règles sont organisées en couches enfichables (universelles → spécifiques au
langage → spécifiques au framework), de sorte qu'ajouter le support d'un langage
ou d'un framework ne touche jamais au cœur du système.

---

## 2. Objectifs du projet

### 2.1 Objectifs principaux

- **Détecter automatiquement** les problèmes de sécurité, de qualité et de
  robustesse dans le code généré par IA, via un moteur de règles extensible.
- **Rendre les problèmes compréhensibles** grâce à une explication contextuelle
  (déterministe + analyse IA à la demande), et non un simple code d'erreur.
- **Refermer la boucle avec l'IA** en générant un prompt correctif structuré,
  prêt à être renvoyé à l'assistant qui a produit le code.
- **Surveiller le code en temps réel** et présenter les alertes dans un tableau
  de bord clair, groupées par sévérité, avec suivi des tendances.

### 2.2 Objectifs secondaires

- Offrir une configuration guidée (wizard) accessible à un utilisateur peu
  technique.
- Conserver un historique des détections pour mesurer l'évolution de la qualité
  d'un projet dans le temps (tendances, temps de résolution, récurrences).
- Permettre la gestion des faux positifs pour affiner la pertinence des alertes.
- Démontrer un **découplage moteur ↔ framework** rendant le système ouvert à de
  nouveaux langages/frameworks sans refonte.

### 2.3 Objectifs quantitatifs (SMART)

| # | Objectif | Mesure de réussite |
|---|----------|--------------------|
| O1 | Couvrir les catégories Sécurité / Qualité / Robustesse | ≥ 8 règles opérationnelles et testées à la livraison |
| O2 | Fiabilité des détections | Résultats confrontés à des outils matures (ESLint, PHPStan, référentiel OWASP) |
| O3 | Réactivité de l'analyse | Analyse d'un fichier restituée en < 2 s |
| O4 | Boucle de correction | Chaîne détection → prompt correctif fonctionnelle de bout en bout |
| O5 | Qualité logicielle | Suite de tests automatisés au vert, couverture visée ≥ 70 % du cœur métier |
| O6 | Déployabilité | Application lançable via une seule commande `docker compose up` |

---

## 3. Utilisateurs cibles

- **Développeurs débutants** qui utilisent une IA pour apprendre ou produire, et
  ne savent pas encore évaluer la sûreté du code généré.
- **« Vibe coders » / profils non-techniques** qui construisent des applications
  en dialoguant avec une IA sans lire le code en détail.
- **Développeurs confirmés** souhaitant un garde-fou automatique sur le code
  produit par leurs agents IA (Cursor, Copilot…), et un moyen rapide de
  générer des prompts de correction.

Rôle unique dans l'application (v1) : un **utilisateur authentifié** qui possède
ses propres projets et son historique, isolés des autres comptes.

---

## 4. Périmètre fonctionnel

### 4.1 Exigences fonctionnelles

| # | Fonctionnalité | Description |
|---|----------------|-------------|
| **F1** | Authentification | Création de compte, connexion, session sécurisée (JWT). Chaque utilisateur possède ses projets et son historique, isolés. |
| **F2** | Configuration guidée (wizard) | Assistant multi-étapes : sélection des dossiers → confirmation de la stack → choix des sous-dossiers → clé API (optionnelle) → activation des skills. |
| **F3** | Connexion du code source | Sélection d'un ou plusieurs dossiers à surveiller (fenêtre native du navigateur, ou chemin local en exécution locale). Exclusion automatique de `node_modules`, `.git`, etc. |
| **F4** | Détection de la stack | Reconnaissance automatique du langage/framework à partir de la structure du projet, ajustable manuellement. |
| **F5** | Sélection des règles (skills) | Activation/désactivation des règles, présentées par catégorie et sévérité, filtrées selon la stack détectée. L'utilisateur voit ainsi le périmètre exact de ce qui est vérifié. |
| **F6** | Analyse par règles déterministes | Moteur d'analyse appliquant les skills sélectionnés au code (règles en couches : universelles, langage, framework) et produisant un rapport structuré de problèmes. |
| **F7** | Surveillance temps réel | Détection continue des modifications de fichiers et flux d'alertes en direct vers le tableau de bord. |
| **F8** | Tableau de bord | Alertes groupées par sévérité (critique / avertissement / info), dépliables (extrait de code, ligne, analyse), graphe de tendance des alertes, onglets Actives / Résolues, filtres. |
| **F9** | Analyse contextuelle par IA | Explication approfondie d'un problème à la demande, via une API d'IA externe (clé fournie par l'utilisateur). |
| **F10** | Génération de prompt correctif | Sélection d'une ou plusieurs alertes → production d'un prompt structuré à copier vers l'IA pour correction. |
| **F11** | Gestion des faux positifs | Marquage d'une détection comme ignorée (masquée et exclue des stats courantes) et restauration. |
| **F12** | Historique et analytique | Conservation des détections dans le temps : projets surveillés, tendances (apparitions/résolutions), temps moyen de résolution (MTTR), récurrences. |

### 4.2 Hors périmètre (v1)

- **Boucle de correction 100 % automatique** (l'IA appelée directement par le
  serveur, correction et re-vérification sans intervention humaine) : la brique
  existe mais reste une évolution future ; en v1, l'utilisateur applique le prompt
  correctif lui-même via son assistant IA.
- Support multi-langages étendu au-delà de JavaScript/TypeScript.
- Gestion multi-rôles (organisations, équipes, permissions fines).

---

## 5. Exigences techniques

> *Récapitulatif du socle technique imposé, adapté au projet. Les détails de
> réalisation relèvent des jalons de conception ultérieurs.*

### 5.1 Choix d'architecture

**API REST Symfony (back-end) + Single Page Application React (front-end séparé).**

Ce découplage est retenu plutôt qu'une application full-stack Symfony/Twig car
l'interface de Redline est un **tableau de bord temps réel** (flux d'alertes,
graphes de tendance, interactions riches) : une SPA React offre la réactivité
attendue, tandis qu'une API Symfony expose proprement le cœur métier.

Point d'architecture distinctif : le **moteur d'analyse** (basé sur l'écosystème
de linting JavaScript) est un **service découplé** que l'API Symfony orchestre.
Cette séparation illustre concrètement le principe directeur du projet - un cœur
d'analyse indépendant du framework - et constitue un argument fort de conception.

### 5.2 Composants techniques

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Back-end / API | **PHP 8+, Symfony (LTS)** | Socle imposé ; robuste, sécurisé nativement (CSRF, validation, Voters). |
| Front-end | **React 18, Vite, TypeScript, Tailwind** | SPA réactive adaptée à un dashboard temps réel ; typage fort pour la fiabilité. |
| Base de données | **PostgreSQL** | SGBD relationnel robuste ; adapté à l'historisation et aux requêtes analytiques (tendances). |
| ORM | **Doctrine** | Standard Symfony ; requêtes paramétrées (protection injection SQL). |
| Moteur d'analyse | **Service Node.js (linting)** | Cœur découplé, réutilisable indépendamment du framework. |
| API externe | **API d'IA (Anthropic)** | Analyse contextuelle des problèmes ; satisfait l'exigence d'intégration d'un service tiers. |
| Conteneurisation | **Docker / Docker Compose** | Environnement reproductible dev → prod. |

### 5.3 Contraintes techniques imposées à satisfaire

- **Conteneurisation** de l'ensemble via Docker Compose.
- **Contrôle de version Git** avec stratégie de branches (GitFlow) et
  pull requests.
- **Intégration continue (CI)** : exécution automatique des tests à chaque push.
- **Déploiement continu (CD)** ou, a minima, procédure de mise en production
  documentée.
- **Tests automatisés** : unitaires (PHPUnit côté Symfony, Vitest côté moteur/JS)
  et fonctionnels/d'intégration.
- **Sécurité OWASP Top 10** : injection SQL, XSS, CSRF, hachage des mots de passe
  (bcrypt/Argon2), limitation anti-brute-force, conformité RGPD.
- **Modélisation MERISE** de la base de données (MCD / MLD / MPD).

### 5.4 Contraintes de qualité

Code lisible, modulaire et maintenable ; respect des conventions **PSR** (PHP) ;
principes **DRY / KISS** et **séparation des responsabilités** (architecture
multi-couches MVC + n-tiers) ; documentation du code et du dépôt (README).

---

## 6. Contraintes et enjeux

### 6.1 Contraintes temporelles

Projet mené sur **6 mois**, découpé en 6 jalons mensuels (cahier des charges,
conception, modélisation, développement, tests, déploiement), avec une
**soutenance orale finale** devant jury (démonstration live d'environ 15 minutes).

### 6.2 Contraintes réglementaires - RGPD

L'application manipule des **données personnelles** (adresse e-mail, mot de passe)
et peut traiter des **extraits du code source** de l'utilisateur. À ce titre :

- les mots de passe sont **hachés** (jamais stockés en clair) ;
- l'utilisateur peut **supprimer son compte** et les données associées ;
- les **clés d'API** et secrets sont gérés via des variables d'environnement,
  jamais codés en dur ;
- les communications sont prévues en **HTTPS** en production ;
- une **politique de confidentialité** simplifiée est fournie dans l'application.

### 6.3 Risques majeurs identifiés

| Risque | Impact | Atténuation |
|--------|--------|-------------|
| Dépendance à une API d'IA externe (coût, disponibilité, évolution) | Fonction d'analyse contextuelle indisponible | Analyse déterministe fonctionnelle **sans** clé API ; l'IA reste un complément. |
| Support navigateur limité pour la surveillance côté client (File System Access API réservée à Chromium) | Surveillance de dossier indisponible sur Firefox/Safari | Message explicite invitant à utiliser un navigateur compatible ou l'exécution locale. |
| Couverture partielle des règles (périmètre restreint en v1) | Risque de fausse confiance | Transparence du périmètre : l'utilisateur voit la liste exacte des règles actives (F5). Architecture extensible. |
| Projet mené en solo | Charge de travail, effet tunnel | Découpage en jalons, priorisation d'un moteur + un skill solide avant extension. |

### 6.4 Hypothèses

- L'utilisateur dispose d'un navigateur moderne (Chromium) ou exécute l'outil en
  local pour la surveillance de fichiers.
- La fourniture d'une clé d'API d'IA par l'utilisateur est optionnelle ;
  l'application reste fonctionnelle sans.

---

## 7. Critères de succès

Le projet sera considéré comme réussi si, à la livraison finale :

- l'ensemble des fonctionnalités principales (F1 à F12) sont **implémentées et
  testées** ;
- le moteur détecte de façon fiable **au moins 8 catégories de problèmes**, avec
  des résultats cohérents face à des outils de référence ;
- la chaîne **détection → explication → prompt correctif** fonctionne de bout en
  bout ;
- toutes les **exigences techniques** sont respectées (Docker, CI/CD, tests,
  sécurité OWASP, API externe, MERISE) ;
- l'application est **déployable et exécutable sans friction** via Docker Compose,
  et la **documentation** est à jour et complète ;
- l'analyse d'un fichier est restituée en **moins de 2 secondes**.

---

*Document rédigé dans le cadre du Jalon 1. Il constitue le chapitre III du rapport
final et sert de référence fonctionnelle pour la suite du projet. Il pourra être
ajusté si le périmètre évolue en cours de réalisation.*
