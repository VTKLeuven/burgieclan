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
    libicu-dev

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install \
    pdo_mysql \
    zip \
    intl \
    xml

# Install Symfony CLI
RUN curl -1sLf 'https://dl.cloudsmith.io/public/symfony/stable/setup.deb.sh' | bash && \
    apt-get install symfony-cli

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy composer files first
COPY composer.json composer.lock ./

# Install dependencies
RUN composer install --no-scripts

# Copy existing application directory
COPY . .

# Create var directory with proper permissions
RUN mkdir -p var/cache var/log var/sessions && \
    chown -R www-data:www-data var && \
    chmod -R 775 var

EXPOSE 8000

CMD ["symfony", "server:start", "--port=8000", "--no-tls"]