FROM php:8.3-fpm-alpine
RUN apk add --no-cache git unzip libzip-dev libpng-dev libjpeg-turbo-dev libwebp-dev postgresql-dev \
 && docker-php-ext-configure gd --with-jpeg --with-webp \
 && docker-php-ext-install pdo_pgsql zip gd opcache pcntl
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY deploy/php.ini /usr/local/etc/php/conf.d/lumibook.ini
WORKDIR /var/www/html
