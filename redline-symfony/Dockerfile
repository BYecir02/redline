# Backend Symfony - environnement PHP 8.2 (développement)
FROM php:8.2-cli-alpine

# Dépendances système nécessaires aux extensions PHP
RUN apk add --no-cache \
        postgresql-dev \
        icu-dev \
        libzip-dev \
        git \
        unzip \
    && docker-php-ext-install \
        pdo \
        pdo_pgsql \
        intl \
        opcache \
        zip

# Composer (récupéré depuis l'image officielle)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

EXPOSE 8000

# Installe les dépendances puis lance le serveur PHP intégré
# (public/index.php = front controller Symfony, qui route toutes les requêtes)
CMD ["sh", "-c", "composer install --no-interaction --no-progress && php -S 0.0.0.0:8000 -t public public/index.php"]
