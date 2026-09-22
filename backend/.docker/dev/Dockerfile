FROM php:8.4-apache@sha256:d54a6bdfaaa4b516264617b2ac6a3692f23f29510278e02494154f8e260e9ce3

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

# The symfony CLI records the running server in a state file under $HOME, which lives in this
# container's writable layer and so survives a restart. Container PIDs restart from 1 on every
# boot, so a leftover file pointing at a low PID reliably matches some unrelated process on the
# next boot - often `server:start` itself - and the CLI then reports "the local web server is
# already running", prints its info block and exits 0, taking the container with it.
#
# `server:stop` cannot clear that: it runs early enough that the recorded PID is not yet in use,
# so it sees nothing to stop and leaves the file alone. Deleting the file is what makes a restart
# deterministic. Nothing can legitimately be running at this point - the shell is PID 1. Both
# state directories are covered because the CLI moved from ~/.symfony5 to ~/.config/symfony-cli.
CMD ["sh", "-c", "rm -f \"$HOME\"/.config/symfony-cli/var/*.pid \"$HOME\"/.symfony5/var/*.pid; symfony server:start --port=8000 --no-tls --allow-all-ip"]
