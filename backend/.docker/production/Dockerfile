# ===============================================
# STAGE 1: CORE RUNTIME BASE (php_base)
# Contains minimal system packages and compiled PHP extensions needed for R-U-N-T-I-M-E
# ===============================================
FROM dhi/php:8.4-fpm-alpine3.22 AS php_base

# Install minimal runtime system dependencies
RUN apk update && \
    apk add --no-cache \
    curl \
    libpq \
    libzip \
    icu \
    icu-data-full && \
    rm -rf /var/cache/apk/*

# Install required PHP extensions and immediately clean up the *-dev packages
RUN apk add --no-cache --virtual .build-deps \
    postgresql-dev \
    libzip-dev \
    icu-dev \
    && docker-php-ext-install \
    pdo \
    pdo_pgsql \
    zip \
    intl \
    opcache \
    # Remove the build dependencies to keep the image lean
    && apk del .build-deps \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# VOLUME DECLARATIONS
# These folders are defined as volumes to ensure they use external persistence
# (as configured in docker-compose) rather than being part of the image layers.
# This is crucial for runtime data and external configuration mounts.
# Logs and Cache. Persisted via the 'backend_var' named volume in Compose.
VOLUME /app/var/
# Application data/uploads. Mounted from the host via ${DATA_DIR} in Compose.
VOLUME /app/data
# Sensitive JWT keys. Mounted from the host via ${JWT_DIR} in Compose.
VOLUME /app/config/jwt

# ===============================================
# STAGE 2: BUILDER (php_builder)
# Extends php_base and adds BUILD-TIME tools (git, nodejs, composer, *-dev)
# ===============================================
FROM php_base AS php_builder

ARG APP_ENV=prod

# Add all heavy build-time dependencies
RUN apk add --no-cache \
    git \
    nodejs \
    npm \
    # Required for building pdo_pgsql extension (even if already installed)
    postgresql-dev \
    libzip-dev \
    icu-dev && \
    rm -rf /var/cache/apk/*

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/bin --filename=composer

# Copy composer files for dependency installation
COPY composer.json composer.lock symfony.lock ./

# Install production dependencies with optimizations
RUN COMPOSER_MEMORY_LIMIT=512M composer install \
    --no-dev \
    --optimize-autoloader \
    --no-scripts \
    --no-interaction

# Copy all source files
COPY . .

# Install npm dependencies (including devDependencies needed for build)
RUN npm ci --no-audit && \
    # Build frontend assets
    npm run build && \
    # Remove node_modules to reduce image size
    # The built assets in /app/public/build/ are all we need at runtime
    rm -rf node_modules && \
    # Install Symfony bundle assets (API Platform, etc.) into public/bundles directory
    php bin/console assets:install public --symlink --relative --env=$APP_ENV --no-debug

# ===============================================
# STAGE 3: PRODUCTION IMAGE (php_prod)
# Extends php_base and adds the final web server (nginx) and artifacts from builder
# ===============================================
FROM php_base AS php_prod

# Build arguments
ARG FRONTEND_URL
ARG APP_ENV=prod
ARG COMMIT_HASH
ARG VERSION

ENV APP_ENV=$APP_ENV
ENV FRONTEND_URL=$FRONTEND_URL
ENV COMMIT_HASH=$COMMIT_HASH
ENV VERSION=$VERSION
ENV JWT_PUBLIC_KEY=/app/config/jwt/public.pem
ENV JWT_SECRET_KEY=/app/config/jwt/private.pem

# Install additional production dependencies (nginx, nodejs for asset building)
RUN apk add --no-cache \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Copy nginx configuration
COPY .docker/production/nginx.conf /etc/nginx/nginx.conf

# Copy PHP configuration
COPY .docker/production/production.ini /usr/local/etc/php/conf.d/production.ini
COPY .docker/production/pool.conf /usr/local/etc/php-fpm.d/pool.conf

# Copy startup script
COPY .docker/production/startup.sh /usr/local/bin/startup.sh
RUN chmod +x /usr/local/bin/startup.sh

# Copy build artifacts from the php_builder stage
COPY --from=php_builder /app/vendor/ /app/vendor/
COPY --from=php_builder /app/public/build/ /app/public/build/
COPY --from=php_builder /app/public/bundles/ /app/public/bundles/

# # Copy sources
COPY . .

# Set proper permissions
RUN mkdir -p /app/var /app/data && \
    chown -R www-data:www-data /app/var /app/data && \
    chmod -R 755 /app/var /app/data

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/api || exit 1

CMD ["/usr/local/bin/startup.sh"]
