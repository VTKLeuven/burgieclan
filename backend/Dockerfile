# Base stage with common dependencies
FROM php:8.1-apache as base

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

# Development stage
FROM base as dev

# Install Symfony CLI for development
RUN curl -1sLf 'https://dl.cloudsmith.io/public/symfony/stable/setup.deb.sh' | bash && \
    apt-get update && apt-get install -y symfony-cli && \
    rm -rf /var/lib/apt/lists/*

# Copy composer files
COPY composer.json composer.lock ./
COPY grumphp.yml ./

# Install all dependencies
RUN composer install --no-scripts

# Initialize GrumPHP
RUN vendor/bin/grumphp git:init

# Set up directory permissions
RUN mkdir -p var/cache var/log var/sessions && \
    chown -R www-data:www-data var && \
    chmod -R 775 var

CMD ["sh", "-c", "symfony server:stop || true && symfony server:start --port=8000 --no-tls --allow-all-ip"]

# Test stage
FROM base as test

COPY composer.json composer.lock ./

# Install dependencies including dev dependencies
RUN composer install

# Set up directory permissions
RUN mkdir -p var/cache var/log var/sessions && \
    chown -R www-data:www-data var && \
    chmod -R 775 var

CMD ["php", "bin/phpunit"]

# Production stage
FROM base as prod

# Copy composer files
COPY composer.json composer.lock ./

# Install dependencies without dev packages
RUN composer install --no-dev --optimize-autoloader

# Set up directory permissions
RUN mkdir -p var/cache var/log var/sessions && \
    chown -R www-data:www-data var && \
    chmod -R 775 var

CMD ["apache2-foreground"]