# Production Symfony Dockerfile
# Uses Alpine Linux with nginx + php-fpm for optimal performance
FROM php:8.4-fpm-alpine3.22

# Build argument for Symfony environment
ARG API_ENV=prod

# Set environment variable for Composer
ENV COMPOSER_ALLOW_SUPERUSER=1

# Install system dependencies
RUN apk update && \
    apk add --no-cache \
    nginx \
    git \
    bash \
    curl \
    wget \
    libpng-dev \
    libzip-dev \
    icu-dev \
    postgresql-dev \
    nodejs \
    npm && \
    rm -rf /var/cache/apk/*

# Install Symfony CLI
RUN curl -1sLf 'https://dl.cloudsmith.io/public/symfony/stable/setup.alpine.sh' | sh && \
    apk add --no-cache --upgrade symfony-cli

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/bin --filename=composer

# Install required PHP extensions
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    zip \
    intl \
    opcache

# Set working directory
WORKDIR /app

# Copy configuration files
COPY .docker/production/nginx.conf /etc/nginx/nginx.conf
COPY .docker/production/production.ini /usr/local/etc/php/conf.d/production.ini
COPY .docker/production/pool.conf /usr/local/etc/php-fpm.d/pool.conf
COPY .docker/production/startup.sh /usr/local/bin/startup.sh

# Make startup script executable
RUN chmod +x /usr/local/bin/startup.sh

# Copy composer files for dependency installation
COPY composer.json composer.lock symfony.lock ./

# Install production dependencies with optimizations
RUN COMPOSER_MEMORY_LIMIT=512M composer install \
    --no-dev \
    --optimize-autoloader \
    --no-scripts \
    --no-interaction

# Copy package files for npm installation
COPY package.json package-lock.json webpack.config.js ./

# Install npm dependencies (including devDependencies needed for build)
RUN npm ci --no-audit

# Copy assets directory and application code
COPY assets ./assets
COPY . /app

# Build frontend assets with Webpack Encore
RUN npm run build

# Remove node_modules after build to reduce image size
# The built assets in /app/public/build/ are all we need at runtime
RUN rm -rf node_modules

# Install Symfony bundle assets (API Platform, etc.) into public/bundles directory
RUN php bin/console assets:install public --symlink --relative --env=$API_ENV --no-debug

# Set proper permissions
RUN chown -R www-data:www-data /app && \
    chmod -R 755 /app

# Expose port 8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api || exit 1

# Run startup script
CMD ["/usr/local/bin/startup.sh"]
