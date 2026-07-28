# Analyse de Sécurité (OWASP) - Projet Redline

> **Projet Fil Rouge - Bachelor 3 Développement**
> Jalon 5 - Analyse de sécurité et conformité (chapitre IX)
>
> **Auteur :** Badirou Mohamed Yecir
> **Formation :** Bachelor 3 Développement - IPSSI
> **Date :** [à compléter]
> **Version :** 1.1

---

## Sommaire

1. [Approche et périmètre](#1-approche-et-périmètre)
2. [Cartographie OWASP Top 10 (2021)](#2-cartographie-owasp-top-10-2021)
3. [Injection SQL](#3-injection-sql)
4. [XSS (Cross-Site Scripting)](#4-xss-cross-site-scripting)
5. [CSRF](#5-csrf)
6. [Authentification et mots de passe](#6-authentification-et-mots-de-passe)
7. [Contrôle d'accès et isolation](#7-contrôle-daccès-et-isolation)
8. [Gestion des secrets](#8-gestion-des-secrets)
9. [Données personnelles et RGPD](#9-données-personnelles-et-rgpd)
10. [Configuration : CORS et en-têtes HTTP](#10-configuration--cors-et-en-têtes-http)
11. [Synthèse et axes d'amélioration](#11-synthèse-et-axes-damélioration)

---

## 1. Approche et périmètre

La sécurité de Redline est traitée selon le référentiel **OWASP Top 10**. Chaque
mesure ci-dessous indique honnêtement son statut réel. L'analyse porte sur le
backend **Symfony** (API), le front **React** et le moteur d'analyse Node.

**Particularité du projet.** Redline est lui-même un outil de détection de failles
de sécurité. Plusieurs de ses règles (`sql-injection`, `hardcoded-secret`,
`xss-risk`, `cors-wildcard`) correspondent à des catégories OWASP : l'application
applique à son propre code les principes qu'elle vérifie chez les autres - un fil
conducteur de cette analyse.

---

## 2. Cartographie OWASP Top 10 (2021)

| # | Catégorie OWASP | Traitement dans Redline | Statut |
|---|-----------------|-------------------------|--------|
| A01 | Broken Access Control | Firewall Symfony (JWT) + `access_control` + données isolées par utilisateur | ✅ |
| A02 | Cryptographic Failures | Mots de passe hachés (bcrypt/argon2), JWT signé (RS256), HTTPS en production | ✅ |
| A03 | Injection | Doctrine ORM + DBAL à requêtes paramétrées (aucune concaténation SQL) | ✅ |
| A04 | Insecure Design | Moteur *stateless*, séparation en couches, garde-fou anti-brute-force | ✅ |
| A05 | Security Misconfiguration | CORS restreint (Nelmio) + en-têtes de sécurité HTTP | ✅ |
| A06 | Vulnerable Components | Dépendances verrouillées (lockfiles) ; audit CI à ajouter | 🟡 |
| A07 | Identification & Auth Failures | JWT + hachage + **rate limiter anti-brute-force** | ✅ |
| A08 | Data Integrity Failures | Signature RSA des JWT, dépendances verrouillées | ✅ |
| A09 | Logging & Monitoring Failures | Journalisation applicative à renforcer | 🟡 |
| A10 | Server-Side Request Forgery | Non applicable (pas de requêtes serveur pilotées par l'utilisateur) | - |

---

## 3. Injection SQL

**Risque.** Requêtes SQL construites par concaténation d'entrées utilisateur.

**Mesure.** Aucune requête n'est écrite par concaténation. L'accès aux données
passe par **Doctrine ORM** (requêtes paramétrées) ; les agrégations analytiques
utilisent **Doctrine DBAL** avec des **paramètres liés** (`:uid`, `:path`…),
jamais d'interpolation d'entrée utilisateur dans le SQL.

**Cohérence produit.** La règle `sql-injection` (critique) détecte ce motif.

**Statut : ✅ implémenté.**

---

## 4. XSS (Cross-Site Scripting)

**Risque.** Injection de HTML/JavaScript non filtré dans les pages.

**Mesure.** L'interface **React** échappe automatiquement toute valeur insérée dans
le JSX. Une vérification (`grep` sur `dangerouslySetInnerHTML` / `innerHTML`)
confirme qu'aucune injection HTML brute n'est utilisée : les seules occurrences se
trouvent dans les *données de démonstration* décrivant la faille détectée. L'API
Symfony ne renvoie que du **JSON** (pas de rendu HTML côté serveur).

**Cohérence produit.** La règle `xss-risk` signale l'usage de `innerHTML` /
`dangerouslySetInnerHTML`.

**Statut : ✅ implémenté.**

---

## 5. CSRF

**Risque.** Soumission frauduleuse d'une requête authentifiée via les cookies
envoyés automatiquement par le navigateur.

**Mesure.** L'authentification n'utilise **pas de cookie de session** : le jeton
JWT est transmis dans l'en-tête `Authorization: Bearer <token>`. Le navigateur ne
l'attache pas automatiquement aux requêtes inter-sites : la surface CSRF est
**structurellement neutralisée**.

**Contrepartie assumée.** Ce choix (jeton en `localStorage` + en-tête) échange
l'immunité CSRF contre une sensibilité au vol de jeton par XSS - vecteur lui-même
fermé (§4).

**Statut : ✅ maîtrisé (par conception).**

---

## 6. Authentification et mots de passe

**Mesure.** Les mots de passe ne sont **jamais stockés en clair** : ils sont hachés
via le *password hasher* de Symfony configuré en **`auto`** (bcrypt/argon2 selon la
plateforme, sel intégré).

L'authentification repose sur des **JWT signés en RS256** (algorithme asymétrique) :
émis avec une **clé privée**, vérifiés avec une **clé publique** (LexikJWT). Le
jeton ne transporte que l'identité de l'utilisateur et **expire**. La clé privée
n'est jamais versionnée (voir §8).

**Anti-brute-force.** La connexion est protégée par un **rate limiter** (5 échecs
par IP en 15 minutes → `429`), remis à zéro sur connexion réussie (une connexion
valide n'est jamais bloquée). *Vérifié par test manuel.*

**Statut : ✅ implémenté.**

---

## 7. Contrôle d'accès et isolation

**Mesure.** L'accès est régi par le **firewall Symfony** (stateless, authentifié
par JWT) et les règles `access_control` : `/api/auth` et `/api/skills` sont
publics, **tout le reste exige un jeton valide** (sinon `401`). Les données sont
**isolées par utilisateur** : chaque projet, détection et statistique est rattaché
à un `user_id`, et **toutes les requêtes de lecture sont scopées par le
propriétaire** (`WHERE user_id = :uid`). Un utilisateur ne peut jamais accéder aux
données d'un autre compte.

*Le contrôle d'accès (401 sans jeton, isolation) est couvert par des tests
automatisés.*

**Statut : ✅ implémenté.**

---

## 8. Gestion des secrets

**Mesure.** Les secrets sont gérés hors du code :
- la **clé privée JWT** (`config/jwt/*.pem`) est **exclue du dépôt** (`.gitignore`)
  et régénérée par environnement ;
- les surcharges locales sensibles vont dans **`.env.local`** (exclu du dépôt) ;
- les identifiants de base et l'URL du moteur sont injectés par **Docker Compose** ;
- la **clé API d'IA vient de l'utilisateur** à l'exécution, jamais stockée.

Le fichier `.env` versionné ne contient **aucun secret exploitable** (valeurs par
défaut de développement, passphrase JWT vide, clé privée absente du dépôt).

**Cohérence produit.** La règle `hardcoded-secret` (critique) détecte les
clés/mots de passe en clair dans le code.

**À faire pour la production.** Régénérer la paire de clés JWT et utiliser une base
de données managée avec des identifiants dédiés.

**Statut : ✅ implémenté.**

---

## 9. Données personnelles et RGPD

**Données manipulées.** Une **adresse e-mail** et un **mot de passe haché** par
compte, ainsi que des **extraits de code** (lignes fautives) dans l'historique.

**Mesures.**
- Mots de passe **hachés** (jamais lisibles).
- **Suppression en cascade** (`ON DELETE CASCADE`) : supprimer un compte purge
  automatiquement ses projets, détections et événements.
- Communications prévues en **HTTPS** en production.

**À compléter.**
- Exposer une action **self-service de suppression de compte** (le modèle le permet
  déjà techniquement).
- Rédiger une **politique de confidentialité** simplifiée dans l'application.

**Statut : 🟡 partiel** (fondations en place, self-service et mentions légales à
ajouter).

---

## 10. Configuration : CORS et en-têtes HTTP

**CORS.** Le front (origine distincte) accède à l'API grâce à **NelmioCorsBundle**,
configuré pour n'autoriser que les origines de développement (`localhost` sur tout
port) via une expression régulière, avec les méthodes et en-têtes nécessaires
(`Authorization`, `Content-Type`). En production, il suffit de restreindre
`CORS_ALLOW_ORIGIN` à l'origine réelle du front déployé. **Il ne s'agit donc pas
d'un `Access-Control-Allow-Origin: *`.**

**En-têtes de sécurité HTTP.** Un *event subscriber* (`SecurityHeadersSubscriber`)
ajoute à **toutes les réponses** :
- `X-Content-Type-Options: nosniff` (anti-sniffing MIME) ;
- `X-Frame-Options: DENY` (anti-clickjacking) ;
- `Referrer-Policy: no-referrer`.

*CORS (preflight) et en-têtes vérifiés par test manuel.*

**Cohérence produit.** La règle `cors-wildcard` détecte justement les
configurations `Access-Control-Allow-Origin: *` - que Redline évite chez lui.

**Statut : ✅ implémenté** (durcissement prod = restreindre l'origine).

---

## 11. Synthèse et axes d'amélioration

### Mesures en place

| Mesure | Statut |
|--------|--------|
| Hachage des mots de passe (bcrypt/argon2, hasher `auto`) | ✅ |
| Authentification JWT signée (RS256, clé privée hors dépôt) et expirante | ✅ |
| Protection contre l'injection SQL (Doctrine ORM + DBAL paramétré) | ✅ |
| Protection contre le XSS (échappement React, aucun sink HTML) | ✅ |
| Maîtrise du CSRF (jeton en en-tête, pas de cookie de session) | ✅ |
| Contrôle d'accès (firewall + `access_control`) et isolation par utilisateur | ✅ |
| **CORS restreint** (Nelmio) et **en-têtes de sécurité HTTP** | ✅ |
| **Anti-brute-force** sur la connexion (rate limiter) | ✅ |
| Secrets hors dépôt (clé privée JWT, `.env.local`) | ✅ |
| Suppression des données en cascade (base RGPD) | ✅ |

### Axes d'amélioration identifiés

| Amélioration | Priorité |
|--------------|----------|
| Suppression de compte self-service + politique de confidentialité | Moyenne |
| Passage explicite à Argon2 / coût de hachage supérieur | Moyenne |
| Audit automatisé des dépendances en CI | Moyenne |
| Journalisation et surveillance renforcées | Basse |

**Conclusion.** La sécurité est **implémentée et fonctionnelle** sur l'essentiel du
Top 10 OWASP : authentification robuste, contrôle d'accès, isolation des données,
protection injection/XSS/CSRF, CORS restreint, en-têtes de sécurité et
anti-brute-force. Les points restants relèvent surtout de la **conformité RGPD**
(self-service) et de l'**observabilité**. La démarche est d'autant plus cohérente
que l'outil applique à son propre code les règles qu'il détecte.

---

*Document rédigé dans le cadre du Jalon 5, aligné sur l'implémentation Symfony
réelle. Il constitue le chapitre IX (Sécurité) du rapport final.*
