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

# Configuration OPcache. Le serveur `php -S` utilise le SAPI CLI, où OPcache est
# désactivé par défaut : enable_cli est donc indispensable. Sans ça, PHP re-parse
# tous les fichiers vendor à chaque requête (très lent sur un montage Windows).
#
# validate_timestamps=0 : OPcache ne *stat* plus les fichiers à chaque requête
# (le montage Windows rend ce stat coûteux). Contrepartie : une modification du
# code PHP n'est prise en compte qu'après un redémarrage du conteneur
# (`docker compose restart php`). Compromis assumé pour un dev fluide sous Windows.
RUN { \
      echo 'opcache.enable=1'; \
      echo 'opcache.enable_cli=1'; \
      echo 'opcache.memory_consumption=256'; \
      echo 'opcache.max_accelerated_files=20000'; \
      echo 'opcache.validate_timestamps=0'; \
    } > /usr/local/etc/php/conf.d/zz-opcache.ini

# Composer (récupéré depuis l'image officielle)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

EXPOSE 8000

# Installe les dépendances puis lance le serveur PHP intégré
# (public/index.php = front controller Symfony, qui route toutes les requêtes)
CMD ["sh", "-c", "composer install --no-interaction --no-progress && php -S 0.0.0.0:8000 -t public public/index.php"]
