FROM php:8.4-apache@sha256:04385e3b0f31eee82d711fcb1228cd61c3d4460db8230a54c169869966dc878c

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
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

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
COPY --from=composer:latest@sha256:5946476338742b200bb9ff88f8be56275ddae4b3949c72305cb0dbf10cfcb760 /usr/bin/composer /usr/bin/composer

WORKDIR /app/backend

# Copy composer files first
COPY backend/composer.json backend/composer.lock ./
COPY backend/phpstan.neon.dist ./phpstan.neon.dist

# Base directory setup
RUN mkdir -p var/cache var/log var/sessions && \
    chown -R www-data:www-data var && \
    chmod -R 775 var

# Install Symfony CLI
RUN curl -1sLf 'https://dl.cloudsmith.io/public/symfony/stable/setup.deb.sh' | bash && \
    apt-get update && apt-get install -y symfony-cli && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies
RUN composer install --no-scripts

CMD ["sh", "-c", "symfony server:stop || true && symfony server:start --port=8000 --no-tls --allow-all-ip"]