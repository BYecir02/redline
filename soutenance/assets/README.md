# Registre des preuves visuelles Redline

Date de consolidation : 23 août 2026.

## Captures réelles de l'application

| ID | Fichier | Usage dans le mémoire | État |
|---|---|---|---|
| F01 | `preuves-app/F01-connexion.png` | Authentification JWT | Reçue et insérée dans Notion |
| F02 | `preuves-app/F02-wizard-dossiers.png` | Sélection du dossier racine | Reçue et insérée dans Notion |
| F03 | `preuves-app/F03-wizard-stack.png` | Stack proposée et ajustable | Reçue et insérée dans Notion |
| F04 | `preuves-app/F04-wizard-sous-dossiers.png` | Périmètre des dossiers surveillés | Reçue et insérée dans Notion |
| F05 | `preuves-app/F05-wizard-cle-api.png` | Configuration IA facultative | Reçue et insérée dans Notion |
| F05b | `preuves-app/F05b-wizard-skills.png` | Sélection des skills | Reçue et insérée dans Notion |
| F06 | `preuves-app/F06-dashboard-reel.png` | Dashboard réel, alertes, statistiques et MTTR | Reçue et insérée dans Notion - DEMO-07 |
| F08 | `preuves-app/F08-prompt-correctif-reel.png` | Sélection de deux alertes critiques et génération du prompt correctif | Reçue et insérée dans Notion - DEMO-08 |
| F13 | `preuves-app/F13-ci-run-success.png` | Exécution GitHub Actions réussie du job backend PHPUnit | Reçue et insérée dans Notion |
| F13b | `preuves-app/F13b-ci-historique-runs.png` | Historique de plusieurs exécutions GitHub Actions réussies | Reçue et insérée dans Notion - J04 |

Les fichiers `Figma-zoning-capture-source.png` et
`Figma-maquettes-capture-source.png` conservent les captures globales remises par
l'auteur. Les exports propres et sans barre d'outils sont rangés dans `figma/`.

## Exports Figma propres

- `figma/zoning-planche-complete.png`
- `figma/zoning-dashboard-live.png`
- `figma/wireframe-dossiers-vide.png`
- `figma/wireframe-skills.png`
- `figma/01-dossiers-vide.png`
- `figma/02-dossiers-ajoute.png`
- `figma/03-stack.png`
- `figma/04-sous-dossiers.png`
- `figma/05-cle-api.png`
- `figma/06-skills.png`
- `figma/07-dashboard-live.png`
- `figma/08-dashboard-selection.png`
- `figma/09-prompt-correction.png`

Source : [fichier Figma Redline](https://www.figma.com/design/KCfhnC0Ek1IlE3ZMAcUiV2/Redline?node-id=9-2).

## Captures réelles encore utiles

1. Détail ouvert d'une alerte SQL Injection avec fichier, ligne et extrait.
2. Détection passant à `RESOLVED`, puis à `REOPENED` si elle est réintroduite.
3. Action d'ignorance puis de restauration d'un faux positif.
4. Pipeline élargie au frontend, à Vitest et au build Docker.

Convention de légende : `Figure Fxx - intitulé - environnement - date - commit`.
Les clés API, JWT, mots de passe et chemins personnels doivent être masqués.
