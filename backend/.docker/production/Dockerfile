# Production Symfony Dockerfile with Multi-Stage Build
# Uses Alpine Linux with nginx + php-fpm for optimal performance

# Build arguments
ARG API_ENV=prod
ARG FRONTEND_URL

# ==================== BUILDER STAGE ====================
FROM php:8.4-fpm-alpine3.22 AS builder

# Set environment variables
ENV COMPOSER_ALLOW_SUPERUSER=1

# Install build dependencies (removed in production stage)
RUN apk update && \
    apk add --no-cache \
    git \
    curl \
    wget \
    libpng-dev \
    libzip-dev \
    icu-dev \
    postgresql-dev \
    libpng \
    libzip \
    icu-libs \
    postgresql-libs \
    nodejs \
    npm && \
    rm -rf /var/cache/apk/*

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/bin --filename=composer

# Install PHP extensions and immediately remove build dependencies
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    zip \
    intl \
    opcache && \
    # Remove development packages immediately to reduce intermediate layer size
    apk del libpng-dev libzip-dev icu-dev postgresql-dev

# Set working directory
WORKDIR /app

# Copy composer files for dependency installation
COPY composer.json composer.lock symfony.lock ./

# Install production dependencies with optimizations
RUN COMPOSER_MEMORY_LIMIT=512M composer install \
    --no-dev \
    --optimize-autoloader \
    --classmap-authoritative \
    --no-scripts \
    --no-interaction

# Copy package files for npm installation
COPY package.json package-lock.json webpack.config.js ./

# Install npm dependencies and build assets
RUN npm ci --no-audit

# Copy assets directory and application code
COPY assets ./assets
COPY . /app

# Build frontend assets with Webpack Encore
RUN npm run build

# Remove node_modules and npm after build (no longer needed)
RUN rm -rf node_modules && \
    apk del nodejs npm

# Install Symfony bundle assets (API Platform, etc.) into public/bundles directory
RUN php bin/console assets:install public --symlink --relative --env=$API_ENV --no-debug

# Set proper permissions for application files
RUN chown -R www-data:www-data /app && \
    chmod -R 755 /app && \
    mkdir -p /app/var && \
    chown -R www-data:www-data /app/var && \
    chmod -R 755 /app/var

# ==================== PRODUCTION STAGE ====================
FROM php:8.4-fpm-alpine3.22

# Build argument for frontend URL
ARG FRONTEND_URL

# Set environment variables
ENV FRONTEND_URL=$FRONTEND_URL
ENV JWT_PUBLIC_KEY=/app/config/jwt/public.pem
ENV JWT_SECRET_KEY=/app/config/jwt/private.pem

# Install ONLY runtime dependencies
RUN apk update && \
    apk add --no-cache \
    nginx \
    curl \
    libpng \
    libzip \
    icu-libs \
    postgresql-libs && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy configuration files
COPY .docker/production/nginx.conf /etc/nginx/nginx.conf
COPY .docker/production/production.ini /usr/local/etc/php/conf.d/production.ini
COPY .docker/production/pool.conf /usr/local/etc/php-fpm.d/pool.conf
COPY .docker/production/startup.sh /usr/local/bin/startup.sh

# Make startup script executable
RUN chmod +x /usr/local/bin/startup.sh

# Copy built application from builder stage
COPY --from=builder /app /app

# Ensure proper permissions (may have been lost during copy)
RUN chown -R www-data:www-data /app && \
    chmod -R 755 /app && \
    mkdir -p /app/var && \
    chown -R www-data:www-data /app/var && \
    chmod -R 755 /app/var

# Expose port 8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/api || exit 1

# Run startup script
CMD ["/usr/local/bin/startup.sh"]
