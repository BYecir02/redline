# Dossier professionnel - Badirou Mohamed Yecir

> Statut : version de travail documentée à partir du code local, de l'historique Git et des liens Figma transmis.
> Les champs marqués "à confirmer" doivent être validés avant la remise officielle.

## Informations administratives

| Champ | Valeur |
|---|---|
| Nom de naissance | Badirou |
| Nom d'usage | Badirou |
| Prénom | Mohamed Yecir |
| Adresse | À confirmer |
| Titre professionnel visé | Concepteur Développeur d'Applications |
| Modalité d'accès | Parcours de formation |
| Formation | Bachelor 3 Développement - IPSSI |

## Présentation du dossier

Ce dossier professionnel présente trois exemples de pratique réalisés autour de Bookimo, une plateforme destinée à faciliter la prise de rendez-vous, la gestion documentaire et la mise en relation avec des professionnels. Le travail analysé correspond à un stage d'environ deux mois mené en équipe à la fin de l'année 2025.

Les exemples sont structurés selon les trois activités-types du titre professionnel Concepteur Développeur d'Applications :

1. Développer une application sécurisée.
2. Concevoir et développer une application sécurisée organisée en couches.
3. Préparer le déploiement d'une application sécurisée.

Le contenu s'appuie sur des éléments vérifiables : dépôts Git, commits attribués à mon compte BYecir02, code React et TypeScript, backend Express, intégration Supabase, maquettes Figma et MCD.

## Sommaire

1. Activité-type 1 - Développer une application sécurisée
2. Activité-type 2 - Concevoir et développer une application sécurisée organisée en couches
3. Activité-type 3 - Préparer le déploiement d'une application sécurisée
4. Titres, diplômes et attestations
5. Déclaration sur l'honneur
6. Documents illustrant la pratique professionnelle
7. Annexes et matrice de preuves

---

## Activité-type 1 - Développer une application sécurisée

### Exemple numéro 1 - Développement d'interfaces responsive et de parcours utilisateurs pour Bookimo

### 1. Décrivez les tâches ou opérations que vous avez effectuées, et dans quelles conditions

Dans le cadre de mon stage au sein du projet Bookimo, j'ai participé au développement du frontend d'une plateforme web destinée aux professionnels de l'immobilier et aux artisans. L'objectif du produit était de faciliter la recherche d'un professionnel, la prise de rendez-vous et l'accès à des services adaptés aux utilisateurs particuliers comme aux partenaires professionnels.

J'ai travaillé à partir des besoins du projet et des maquettes Figma afin de transformer les parcours définis graphiquement en écrans React utilisables. Mon travail a notamment porté sur les éléments suivants :

- refonte du parcours de recherche pour le rendre responsive ;
- création d'un flux mobile dédié afin d'adapter l'expérience aux petits écrans ;
- ajout d'une section FAQ basée sur un composant accordéon ;
- amélioration des cartes présentant les métiers ciblés par la plateforme ;
- mise à jour de la zone principale de la landing page ;
- création d'une page de choix permettant à l'utilisateur de s'orienter comme professionnel, entreprise, particulier recherchant un prestataire ou utilisateur déjà inscrit ;
- création d'une première étape d'inscription professionnelle avec recherche et sélection d'un métier ;
- ajout d'un parcours alternatif lorsqu'une profession n'est pas présente dans la liste ;
- raccordement des nouvelles pages au routeur React.

Les interfaces ont été développées avec des composants réutilisables et des classes responsive. J'ai tenu compte des différents états des formulaires : saisie, suggestions, validation, absence de résultat, confirmation et retour à l'étape précédente. Les champs essentiels utilisent des contrôles HTML adaptés, par exemple un type email et des champs obligatoires. React limite par défaut l'injection directe de contenu HTML et les données saisies sont conservées dans l'état du composant avant leur envoi.

L'historique Git atteste plusieurs contributions personnelles. Le commit du 24 novembre 2025 intitulé "refonte recherche responsive et flux mobile dédié" ajoute ou modifie 176 lignes réparties entre le composant principal, la zone Hero et une page de recherche. Un autre commit du même jour ajoute une FAQ avec accordéon. Le 16 décembre 2025, un commit attribué à mon compte ajoute le parcours de choix du partenaire et plusieurs écrans professionnels.

### 2. Précisez les moyens utilisés

- React 18 et TypeScript pour la construction des composants ;
- Vite pour le serveur de développement et la compilation ;
- Tailwind CSS pour la mise en page responsive ;
- composants Radix UI et shadcn/ui pour les éléments interactifs ;
- React Router pour la navigation entre les pages ;
- React Query présent dans l'architecture du frontend ;
- Figma pour comprendre les écrans et les parcours ;
- Git et GitHub pour versionner, partager et fusionner les contributions ;
- navigateur et outils de développement pour contrôler le comportement responsive.

### 3. Avec qui avez-vous travaillé

J'ai travaillé au sein de l'équipe Bookimo, avec au moins un autre développeur visible dans l'historique Git, ainsi qu'avec les personnes chargées du produit et des maquettes. Le travail était réparti entre plusieurs dépôts et branches. Je développais mes écrans et mes composants, je versionnais mes modifications, puis les changements étaient intégrés au projet commun.

Le nom du tuteur, sa fonction exacte et la composition complète de l'équipe doivent être ajoutés à la version administrative finale.

### 4. Contexte

| Champ | Valeur |
|---|---|
| Entreprise, organisme ou association | Bookimo - dénomination juridique à confirmer |
| Chantier, atelier ou service | Équipe produit et développement web |
| Période d'exercice | Novembre 2025 à décembre 2025 - dates exactes à confirmer |
| Type d'expérience | Stage d'environ deux mois |

### 5. Informations complémentaires

Cette expérience m'a permis de progresser sur la transformation d'une maquette en interface fonctionnelle, la conception responsive, la navigation côté client et le travail collaboratif avec Git. Elle m'a également appris à distinguer une interface visuellement conforme d'un parcours réellement utilisable, notamment sur mobile et dans les cas où une profession n'est pas encore référencée.

---

## Activité-type 2 - Concevoir et développer une application sécurisée organisée en couches

### Exemple numéro 1 - Participation à l'intégration frontend/backend et à la modélisation des données de Bookimo

### 1. Décrivez les tâches ou opérations que vous avez effectuées, et dans quelles conditions

Après les premiers travaux d'interface, j'ai participé avec l'équipe à l'organisation du projet en deux parties distinctes : un frontend React et un backend Node.js avec Express. Le dépôt consolidé contient une arborescence Frontend et une arborescence Backend, ce qui permet de séparer la présentation, les appels réseau, la logique HTTP et les accès aux données.

Sur le frontend, les responsabilités sont réparties entre :

- les composants partagés, comme le Header, le Footer et les composants UI ;
- les pages métier, par exemple la recherche, l'authentification, le profil et l'inscription professionnelle ;
- le routeur principal qui associe chaque URL à un écran ;
- une bibliothèque d'accès à l'API ;
- les états locaux et les formulaires.

Sur le backend, l'archive du stage présente une organisation par modules :

- un serveur Express chargé des middlewares et du montage des routes ;
- un module d'authentification ;
- un module utilisateur ;
- un module adresse ;
- un middleware Passport-JWT ;
- des clients Supabase séparés selon le niveau d'accès ;
- des utilitaires de validation et de gestion des erreurs.

J'ai participé à l'intégration de ces deux couches et à la consolidation du backend dans le dépôt officiel. Le code permet d'observer un parcours d'authentification comprenant la création de compte, la connexion, la vérification de l'adresse email, le renvoi du message de vérification, la récupération du compte connecté, la demande de réinitialisation et le changement de mot de passe.

La sécurité du prototype repose sur plusieurs mécanismes :

- hachage des mots de passe avec bcrypt ;
- émission et vérification de jetons JWT ;
- lecture du jeton depuis un cookie ou un en-tête Authorization ;
- protection des routes privées avec Passport ;
- séparation entre la clé publique Supabase et la clé de service côté serveur ;
- contrôle CORS avec une origine frontend configurable et prise en charge des cookies ;
- validation de l'adresse email avant activation du compte ;
- utilisation de variables d'environnement pour les secrets du backend.

La persistance est assurée avec Supabase, basé sur PostgreSQL. Les services consultés utilisent notamment les entités users, customer et address. Le MCD réalisé dans Figma a servi de support à la réflexion sur les données et leurs relations. Les noms exacts de toutes les entités du MCD devront être vérifiés lorsque l'accès au fichier Figma sera disponible.

Cette partie du projet était collective. L'historique du dépôt backend d'origine attribue une grande partie des commits à un autre développeur. Je ne présente donc pas ce backend comme une réalisation individuelle : ma contribution porte sur le travail commun, l'intégration des parcours frontend/backend, l'utilisation de cette API et la consolidation du dépôt.

### 2. Précisez les moyens utilisés

- React, TypeScript et Fetch API pour le frontend ;
- Node.js, TypeScript et Express 5 pour l'API ;
- Supabase et PostgreSQL pour les données ;
- Passport et Passport-JWT pour l'authentification ;
- bcryptjs pour le hachage des mots de passe ;
- cookie-parser et CORS pour la session entre les deux applications ;
- Resend pour les emails de vérification et de réinitialisation ;
- Figma pour les maquettes et le MCD ;
- fichiers de configuration TypeScript ;
- GitHub pour la consolidation des sources.

### 3. Avec qui avez-vous travaillé

Le travail a été réalisé avec l'équipe Bookimo et un autre développeur intervenant sur le frontend et le backend. Les maquettes et le MCD ont servi de supports partagés entre la conception et le développement. La répartition exacte des responsabilités doit être décrite avec le nom du tuteur et les rôles de chaque membre avant la remise finale.

### 4. Contexte

| Champ | Valeur |
|---|---|
| Entreprise, organisme ou association | Bookimo - dénomination juridique à confirmer |
| Chantier, atelier ou service | Architecture et développement full-stack |
| Période d'exercice | Novembre 2025 à décembre 2025 - dates exactes à confirmer |
| Type d'expérience | Stage d'environ deux mois |

### 5. Informations complémentaires

Le dépôt conservé correspond à un prototype en cours d'évolution. Plusieurs écrans frontend appellent des routes relatives aux entreprises, aux rendez-vous ou aux documents qui ne sont pas présentes dans l'archive backend consultée. Cette limite doit être présentée honnêtement : la séparation en couches et le socle d'authentification sont démontrables, tandis que certains domaines métier n'étaient pas encore finalisés dans cette version.

L'expérience m'a appris à raisonner sur un flux complet : interaction dans l'interface, appel HTTP, contrôle de l'identité, traitement métier, accès à la base puis retour d'une réponse exploitable par le frontend.

---

## Activité-type 3 - Préparer le déploiement d'une application sécurisée

### Exemple numéro 1 - Versionnement, validation technique et préparation de la livraison de Bookimo

### 1. Décrivez les tâches ou opérations que vous avez effectuées, et dans quelles conditions

Pendant le stage, j'ai utilisé Git et GitHub pour conserver l'historique des évolutions et intégrer mes contributions dans plusieurs dépôts Bookimo. Les sources retrouvées couvrent une landing page, un frontend applicatif, un backend Express et un dépôt consolidé réunissant le frontend et le backend.

J'ai préparé les livrables techniques en :

- créant des commits ciblés pour la recherche responsive, la FAQ, les cartes métiers et le parcours de choix du partenaire ;
- fusionnant une branche de contribution dans le dépôt de la landing page ;
- organisant le dépôt consolidé avec des dossiers Frontend et Backend ;
- ajoutant le backend au dépôt officiel afin de disposer d'une vue complète de l'application ;
- vérifiant la présence des scripts de développement, de compilation et de démarrage ;
- utilisant le fichier test.http pour exécuter manuellement des scénarios API ;
- séparant la configuration sensible du code avec des variables d'environnement ;
- maintenant une documentation de lancement dans le README de la landing page ;
- travaillant sur une application dont la landing page disposait d'une cible de mise en ligne documentée sur le domaine Bookimo.

Le frontend dispose des commandes Vite dev, build et preview. Le backend dispose des commandes dev, build et start. Ces scripts constituent le socle d'une livraison reproductible : compilation TypeScript, génération des fichiers distribuables et lancement de la version compilée.

La landing page contient également une fonction Supabase chargée d'envoyer un email de bienvenue. Cette fonction isole le traitement serveur et récupère les secrets nécessaires depuis l'environnement Supabase.

L'audit du dépôt n'a pas mis en évidence de pipeline CI GitHub Actions, de conteneur Docker ou de suite de tests automatisés pour la version archivée du stage. Je ne les revendique donc pas dans ce DP. La validation observée repose principalement sur le build des applications, les essais dans le navigateur, les requêtes du fichier test.http et la revue des changements dans Git.

### 2. Précisez les moyens utilisés

- Git et GitHub pour le versionnement et les fusions ;
- dépôts Bookimo-FrontEnd, Bookimo-landingpage, Bookimo-BackEnd et dépôt consolidé ;
- scripts npm et Vite pour la compilation frontend ;
- TypeScript Compiler pour le backend ;
- fichier test.http pour les essais manuels de l'API ;
- variables d'environnement ;
- Supabase et fonction serverless ;
- documentation README ;
- hébergement web documenté par le projet.

### 3. Avec qui avez-vous travaillé

La préparation des sources a été menée avec l'équipe Bookimo. Les dépôts montrent des contributions de plusieurs auteurs, ainsi que des fusions entre branches. Mes propres commits sont identifiés par le compte BYecir02. Les décisions de mise en ligne et l'administration des services externes étaient partagées avec les responsables du projet.

### 4. Contexte

| Champ | Valeur |
|---|---|
| Entreprise, organisme ou association | Bookimo - dénomination juridique à confirmer |
| Chantier, atelier ou service | Intégration et préparation de la livraison |
| Période d'exercice | Novembre 2025 à décembre 2025 - dates exactes à confirmer |
| Type d'expérience | Stage d'environ deux mois |

### 5. Informations complémentaires

La principale difficulté était de travailler sur plusieurs dépôts représentant des états différents du produit. La consolidation du frontend et du backend a amélioré la lisibilité, mais l'ajout accidentel de dépendances installées dans l'historique du dépôt montre aussi l'importance d'un fichier .gitignore correct et d'une vérification avant commit.

Avec le recul, j'ajouterais une pipeline CI exécutant le lint, la compilation du frontend, la compilation du backend et une suite de tests automatisés. J'ajouterais également une configuration Docker et une documentation d'environnement plus précise. Cette analyse critique montre les apprentissages tirés de l'expérience.

---

## Titres, diplômes, CQP et attestations de formation

| Intitulé | Autorité ou organisme | Date |
|---|---|---|
| Bachelor 3 Développement | IPSSI | 2026 - sous réserve d'obtention |
| Diplôme précédent | À confirmer | À confirmer |
| Attestations complémentaires | À confirmer | À confirmer |

---

## Déclaration sur l'honneur

Je soussigné Badirou Mohamed Yecir, déclare sur l'honneur que les renseignements fournis dans ce dossier sont exacts et que je suis l'auteur ou le contributeur des réalisations présentées, dans les limites précisées pour chaque travail collectif.

Fait à : à confirmer

Le : à confirmer

Signature :

---

## Documents illustrant la pratique professionnelle

| Référence | Document | Utilité |
|---|---|---|
| P01 | Maquettes Figma Bookimo | Prouver le travail de conception et le passage de la maquette au frontend |
| P02 | MCD Bookimo sur Figma | Prouver le travail de modélisation des données |
| P03 | Capture de la recherche en affichage desktop et mobile | Prouver le responsive et le flux mobile |
| P04 | Capture de la FAQ | Prouver la création d'un composant interactif |
| P05 | Capture du choix de partenaire | Prouver la conception du parcours professionnel et particulier |
| P06 | Capture du formulaire de choix de profession | Prouver la gestion des états et des suggestions |
| P07 | Extrait Git des commits BYecir02 | Prouver les contributions personnelles |
| P08 | Arborescence Frontend et Backend | Prouver l'organisation en couches |
| P09 | Extrait des routes d'authentification | Prouver le socle de sécurité |
| P10 | Extrait du fichier test.http | Prouver les essais manuels de l'API |

---

## Annexes et matrice de preuves

### Sources de conception

- Maquettes Bookimo : https://www.figma.com/design/Kr8mB4u2hYHZNEkI1GSgFz/Bookimo?node-id=0-1
- MCD Bookimo : https://www.figma.com/design/0uyNnyQcqdbkO8Q2RrZfz9/MCD?node-id=0-1

### Dépôts Git

- Frontend Bookimo : https://github.com/Ryatsuo/Bookimo-FrontEnd
- Landing page : https://github.com/Bookimo-Team/Bookimo-landingpage
- Backend Bookimo : https://github.com/Ryatsuo/Bookimo-BackEnd
- Dépôt consolidé : https://github.com/Bookimo-Team/Bookimo-frontendOld

### Commits personnels significatifs

| Commit | Date | Contribution vérifiée |
|---|---|---|
| 5f7e9b5 | 24 novembre 2025 | Refonte de la recherche responsive et flux mobile dédié |
| 98eb46b | 24 novembre 2025 | Ajout de la FAQ avec accordéon |
| 010449f | 24 novembre 2025 | Mise à jour des cartes métiers de la landing page |
| 47810325 | 16 décembre 2025 | Ajout du choix de partenaire et des pages professionnelles |
| a4c17f26 | 16 décembre 2025 | Mise à jour du parcours partenaire et ajout de la recherche |
| b1100fed | 22 décembre 2025 | Réorganisation du dépôt en Frontend et Backend |
| a9d04340 | 22 décembre 2025 | Intégration réelle des sources backend au dépôt consolidé |

### Limites et points à confirmer avant remise

- adresse personnelle ;
- dénomination juridique exacte de l'entreprise ;
- dates exactes de début et de fin du stage ;
- nom et fonction du tuteur ;
- composition de l'équipe ;
- diplômes et attestations à déclarer ;
- ville et date de la déclaration sur l'honneur ;
- répartition précise des tâches backend entre les membres ;
- captures exportées depuis Figma ;
- liste exacte des entités du MCD ;
- choix éventuel de remplacer l'activité-type 3 Bookimo par une expérience Redline plus fortement documentée en tests, Docker et CI.

### Positionnement honnête des contributions

Le frontend comporte plusieurs contributions directement attribuées à mon compte Git. Le backend a été développé en équipe et son historique d'origine attribue une grande partie des commits à un autre développeur. Le DP distingue donc les réalisations personnelles, les travaux collectifs et les éléments simplement intégrés au dépôt final.
