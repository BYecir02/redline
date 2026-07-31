# Moteur d'analyse Redline (Node) - service interne appelé par le backend Symfony.
FROM node:20-alpine

WORKDIR /app

# Dépendances (installées dans le conteneur, pour un environnement Linux cohérent)
COPY package.json package-lock.json ./
RUN npm ci

# Code source du moteur
COPY tsconfig.json ./
COPY src ./src

EXPOSE 4000

# tsx exécute le TypeScript directement (pas d'étape de build séparée)
CMD ["npx", "tsx", "src/engine-server.ts"]
