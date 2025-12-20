FROM php:8.4-cli-alpine3.22

# Install system dependencies
RUN apk update && apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libxml2-dev \
    zip \
    unzip \
    libzip-dev \
    icu-dev \
    postgresql-dev \
    bash \
    && rm -rf /var/cache/apk/*

# Install PHP extensions
RUN docker-php-ext-install \
    pdo_pgsql \
    pgsql \
    zip \
    intl \
    xml

# Configure PHP
RUN echo "memory_limit=512M" > /usr/local/etc/php/conf.d/memory-limit.ini

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app/backend

# Copy composer files first
COPY backend/composer.json backend/composer.lock ./
COPY backend/phpstan.neon.dist ./phpstan.neon.dist

# Base directory setup
RUN mkdir -p var/cache var/log var/sessions && \
    chown -R www-data:www-data var && \
    chmod -R 775 var

# Install Symfony CLI
RUN curl -1sLf 'https://dl.cloudsmith.io/public/symfony/stable/setup.alpine.sh' | bash && \
    apk add --no-cache symfony-cli && \
    rm -rf /var/cache/apk/*

# Install dependencies
RUN composer install --no-scripts

CMD ["sh", "-c", "symfony server:stop || true && symfony server:start --port=8000 --no-tls --allow-all-ip"]