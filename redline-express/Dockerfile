# Moteur d'analyse Redline (Node) - service interne appelé par le backend Symfony.
FROM node:20-alpine

WORKDIR /app

# Dépendances et schéma Prisma, requis avant la génération du client.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate

# Configuration, code source et vérification du build TypeScript complet.
COPY tsconfig.json tsconfig.build.json vitest.config.ts ./
COPY src ./src
RUN npm run build

EXPOSE 4000

# tsx exécute le TypeScript directement (pas d'étape de build séparée)
CMD ["npx", "tsx", "src/engine-server.ts"]
