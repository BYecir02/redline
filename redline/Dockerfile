# Construction du frontend React/Vite.
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Dans Docker, le navigateur appelle Nginx sur la même origine. Nginx transmet
# ensuite /api au service Symfony, ce qui évite d'exposer un nom de conteneur au
# navigateur et supprime le besoin de CORS pour le parcours principal.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# Image d'exécution légère : Nginx sert les fichiers statiques produits par Vite.
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

