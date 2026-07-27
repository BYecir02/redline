# Analyse de Sécurité (OWASP) - Projet Redline

> **Projet Fil Rouge - Bachelor 3 Développement**
> Jalon 5 - Analyse de sécurité et conformité (chapitre IX)
>
> **Auteur :** Badirou Mohamed Yecir
> **Formation :** Bachelor 3 Développement - IPSSI
> **Date :** [à compléter]
> **Version :** 1.0

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

La sécurité de Redline est traitée selon le référentiel **OWASP Top 10**, qui
recense les risques applicatifs les plus critiques. Chaque mesure ci-dessous
indique honnêtement son **statut réel** : implémentée, partielle, ou à implémenter.

**Particularité du projet.** Redline est lui-même un outil de détection de failles
de sécurité dans le code. Plusieurs de ses règles (`sql-injection`,
`hardcoded-secret`, `xss-risk`, `cors-wildcard`) correspondent directement à des
catégories OWASP. L'application s'applique donc à elle-même les principes qu'elle
vérifie chez les autres - une cohérence qui constitue un fil conducteur de cette
analyse.

---

## 2. Cartographie OWASP Top 10 (2021)

| # | Catégorie OWASP | Traitement dans Redline | Statut |
|---|-----------------|-------------------------|--------|
| A01 | Broken Access Control | Middleware d'authentification + isolation des données par utilisateur (Voters côté Symfony) | ✅ |
| A02 | Cryptographic Failures | Mots de passe hachés (bcrypt), JWT signé, HTTPS en production | ✅ |
| A03 | Injection | ORM à requêtes paramétrées (Prisma / Doctrine), échappement automatique des vues | ✅ |
| A04 | Insecure Design | Moteur *stateless*, séparation des couches, garde-fous (limite de tentatives) | ✅ |
| A05 | Security Misconfiguration | CORS à restreindre en production, en-têtes de sécurité à ajouter | 🟡 |
| A06 | Vulnerable Components | Gestion des dépendances + audit automatisé en CI | 🟡 |
| A07 | Identification & Auth Failures | JWT + bcrypt ; limitation anti-brute-force à ajouter | 🟡 |
| A08 | Data Integrity Failures | Signature des JWT, dépendances verrouillées (lockfile) | ✅ |
| A09 | Logging & Monitoring Failures | Journalisation applicative à renforcer | 🟡 |
| A10 | Server-Side Request Forgery | Non applicable (pas de requêtes serveur pilotées par l'utilisateur) | - |

---

## 3. Injection SQL

**Risque.** Construction de requêtes SQL par concaténation d'entrées utilisateur,
permettant l'exécution de code SQL malveillant.

**Mesure.** Aucune requête SQL n'est écrite par concaténation. L'accès aux données
passe exclusivement par un **ORM à requêtes paramétrées** : Prisma dans
l'implémentation actuelle, **Doctrine** dans la cible Symfony. Les entrées
utilisateur sont toujours transmises comme paramètres liés, jamais interpolées
dans une chaîne SQL.

**Cohérence produit.** Redline embarque une règle `sql-injection` (sévérité
critique) qui détecte précisément ce motif dans le code analysé.

**Statut : ✅ implémenté.**

---

## 4. XSS (Cross-Site Scripting)

**Risque.** Injection de HTML/JavaScript non filtré dans les pages, permettant
l'exécution de scripts arbitraires.

**Mesure.** L'interface est construite en **React**, qui **échappe automatiquement**
toute valeur insérée dans le JSX. Une vérification du code (`grep` sur
`dangerouslySetInnerHTML` / `innerHTML`) confirme qu'**aucune injection HTML brute
n'est utilisée dans l'application** : les seules occurrences de ces termes se
trouvent dans les *données de démonstration* décrivant la faille que Redline
détecte, et non dans du code exécuté. Côté cible Symfony, **Twig** échappe les
variables par défaut.

**Cohérence produit.** Redline embarque une règle `xss-risk` qui signale l'usage de
`innerHTML` / `dangerouslySetInnerHTML`.

**Statut : ✅ implémenté.**

---

## 5. CSRF

**Risque.** Soumission frauduleuse d'une requête authentifiée depuis un site tiers,
en exploitant les cookies envoyés automatiquement par le navigateur.

**Mesure.** L'authentification n'utilise **pas de cookie de session** : le jeton
JWT est transmis explicitement dans l'en-tête `Authorization: Bearer <token>`.
Comme le navigateur n'attache pas ce jeton automatiquement aux requêtes
inter-sites, la surface d'attaque CSRF est **structurellement neutralisée** pour
l'API.

**Contrepartie assumée.** Ce choix (jeton en `localStorage` + en-tête) échange
l'immunité CSRF contre une sensibilité au **vol de jeton par XSS**. Cette
contrepartie est acceptable car le vecteur XSS est lui-même fermé (§4). Côté cible
Symfony, tout formulaire à rendu serveur serait protégé par les **jetons CSRF
natifs de Symfony**.

**Statut : ✅ maîtrisé (par conception).**

---

## 6. Authentification et mots de passe

**Mesure.** Les mots de passe ne sont **jamais stockés en clair**. Ils sont hachés
avec **bcrypt** (algorithme robuste avec sel intégré), à un coût de **10 rounds**
(minimum recommandé par l'OWASP). Le mot de passe en clair ne quitte pas la couche
de hachage.

L'authentification repose sur des **JWT signés (HS256)** qui ne transportent que
l'identifiant de l'utilisateur (`sub`) - aucune donnée sensible - et **expirent**
(durée configurable, 7 jours par défaut). La confiance repose entièrement sur la
signature, protégée par un secret en variable d'environnement.

**Amélioration prévue.** Passer bcrypt à un coût supérieur (12+) avec un binding
natif, et envisager Argon2.

**Statut : ✅ implémenté.**

---

## 7. Contrôle d'accès et isolation

**Mesure.** Toutes les routes sensibles sont protégées par un **middleware
d'authentification** (`requireAuth`) qui rejette (401) toute requête sans jeton
valide. Les données sont **isolées par utilisateur** : chaque projet, détection et
statistique est rattaché à un `userId`, et les requêtes sont systématiquement
filtrées par le propriétaire. Un utilisateur ne peut donc jamais accéder aux
données d'un autre compte.

Côté cible Symfony, ce contrôle serait renforcé par des **Voters** (autorisation
fine par ressource).

**Statut : ✅ implémenté.**

---

## 8. Gestion des secrets

**Mesure.** Les secrets (secret de signature JWT, chaîne de connexion à la base,
clés d'API) sont gérés via des **variables d'environnement** (fichiers `.env`),
**jamais codés en dur** dans le code source. Le fichier `.env` est exclu du dépôt
Git (`.gitignore`) ; un `.env.example` documente les variables attendues sans
révéler de valeur.

**Cohérence produit.** Redline embarque une règle `hardcoded-secret` (sévérité
critique) détectant les clés/mots de passe en clair dans le code.

**À faire pour la production.** Régénérer le `JWT_SECRET` (le secret de
développement ne doit jamais servir en production).

**Statut : ✅ implémenté** (avec régénération à prévoir pour la prod).

---

## 9. Données personnelles et RGPD

**Données manipulées.** L'application stocke une **adresse e-mail** et un
**mot de passe haché** par compte, ainsi que des **extraits de code** (lignes
fautives) dans l'historique des détections.

**Mesures.**
- Les mots de passe sont **hachés** (jamais lisibles).
- Le modèle de données prévoit la **suppression en cascade** (`ON DELETE CASCADE`) :
  supprimer un compte purge automatiquement l'ensemble de ses projets, détections
  et événements.
- Les communications sont prévues en **HTTPS** en production.

**À compléter.**
- Exposer une action **self-service de suppression de compte** dans l'interface
  (le modèle la permet déjà techniquement).
- Rédiger une **politique de confidentialité** simplifiée accessible dans l'app.

**Statut : 🟡 partiel** (fondations en place, self-service et mentions légales à
ajouter).

---

## 10. Configuration : CORS et en-têtes HTTP

**État actuel (transparence).** En développement, l'API autorise toutes les
origines (`Access-Control-Allow-Origin: *`) pour faciliter le travail front/back
en local. **Ce réglage ne doit pas être conservé en production.**

**Mesure prévue.** Restreindre le CORS à l'origine du front déployé, et ajouter les
en-têtes de sécurité HTTP standards : `X-Frame-Options` (anti-clickjacking),
`X-Content-Type-Options`, `Content-Security-Policy`, `Strict-Transport-Security`.

**Cohérence produit.** Redline embarque une règle `cors-wildcard` qui détecte
exactement ce `Access-Control-Allow-Origin: *` - l'outil signale donc sa propre
configuration de développement, ce qui illustre concrètement son utilité.

**Statut : 🟡 à durcir pour la production.**

---

## 11. Synthèse et axes d'amélioration

### Mesures en place

| Mesure | Statut |
|--------|--------|
| Hachage des mots de passe (bcrypt, 10 rounds) | ✅ |
| Authentification par JWT signé et expirant | ✅ |
| Protection contre l'injection SQL (ORM paramétré) | ✅ |
| Protection contre le XSS (échappement automatique, aucun sink HTML) | ✅ |
| Maîtrise du CSRF (jeton en en-tête, pas de cookie de session) | ✅ |
| Contrôle d'accès et isolation des données par utilisateur | ✅ |
| Secrets en variables d'environnement | ✅ |
| Suppression des données en cascade (base RGPD) | ✅ |

### Axes d'amélioration identifiés

| Amélioration | Priorité |
|--------------|----------|
| Restreindre le CORS et ajouter les en-têtes de sécurité HTTP | Haute |
| Limitation anti-brute-force sur la connexion (Rate Limiter) | Haute |
| Suppression de compte self-service + politique de confidentialité | Moyenne |
| Passage de bcrypt à un coût 12+ / Argon2 | Moyenne |
| Audit automatisé des dépendances en CI | Moyenne |
| Journalisation et surveillance renforcées | Basse |

**Conclusion.** Les fondations de sécurité (authentification, hachage, isolation,
protection injection/XSS/CSRF) sont **en place et fonctionnelles**. Les points
restants relèvent du **durcissement pour la mise en production** (configuration,
anti-brute-force, RGPD self-service) et sont clairement identifiés. La démarche est
d'autant plus cohérente que l'outil applique à son propre code les règles de
sécurité qu'il détecte.

---

*Document rédigé dans le cadre du Jalon 5. Il constitue le chapitre IX (Sécurité)
du rapport final.*
