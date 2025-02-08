# backend/Dockerfile
FROM php:8.1-apache AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    libzip-dev \
    libicu-dev \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install \
    pdo_mysql \
    zip \
    intl \
    xml

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy composer files first
COPY composer.json composer.lock ./

# Base directory setup
RUN mkdir -p var/cache var/log var/sessions && \
    chown -R www-data:www-data var && \
    chmod -R 775 var

FROM base AS dev

# Install Symfony CLI
RUN curl -1sLf 'https://dl.cloudsmith.io/public/symfony/stable/setup.deb.sh' | bash && \
    apt-get update && apt-get install -y symfony-cli && \
    rm -rf /var/lib/apt/lists/*

# Copy GrumPHP config
COPY grumphp.yml ./

# Install dependencies
RUN composer install --no-scripts

# Copy the rest of the application
COPY . .

# Initialize GrumPHP
RUN vendor/bin/grumphp git:init

CMD ["sh", "-c", "symfony server:stop || true && symfony server:start --port=8000 --no-tls --allow-all-ip"]

FROM base AS test

# Install dependencies with dev packages
RUN composer install --no-scripts

# Copy the rest of the application
COPY . .

CMD ["php", "bin/phpunit"]

FROM base AS prod

# Install dependencies without dev packages
RUN composer install --no-dev --optimize-autoloader --no-scripts

# Copy the rest of the application
COPY . .

CMD ["apache2-foreground"]