FROM php:8.1-apache

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

# Install Symfony CLI
RUN curl -1sLf 'https://dl.cloudsmith.io/public/symfony/stable/setup.deb.sh' | bash && \
    apt-get update && apt-get install -y symfony-cli && \
    rm -rf /var/lib/apt/lists/*

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy composer files first
COPY composer.json composer.lock ./

# Copy GrumPHP configuration
COPY grumphp.yml ./

# Install dependencies
RUN composer install --no-scripts

# Initialize GrumPHP
RUN vendor/bin/grumphp git:init

# Set up directory permissions
RUN mkdir -p var/cache var/log var/sessions && \
    chown -R www-data:www-data var && \
    chmod -R 775 var

EXPOSE 8000

CMD ["sh", "-c", "symfony server:stop || true && symfony server:start --port=8000 --no-tls --allow-all-ip"]