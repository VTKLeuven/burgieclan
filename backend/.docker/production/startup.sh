#!/bin/sh

# Container startup script - configures and starts nginx + PHP-FPM

# Set default values if environment variables are not set
MAX_REQUESTS=${MAX_REQUESTS:-8}
APP_ENV=${APP_ENV:-prod}

# Replace placeholders in configuration files with actual values
# sed -i: edit files in-place
# s,OLD,NEW,g: substitute OLD with NEW globally
# This allows runtime configuration without rebuilding the image
sed -i "s,MAX_REQUESTS,$MAX_REQUESTS,g" /usr/local/etc/php-fpm.d/pool.conf

# Ensure var directory exists and has proper permissions
# This is critical for Symfony to write cache and logs
mkdir -p /app/var/cache /app/var/log

# Set ownership to www-data (the user PHP-FPM runs as)
chown -R www-data:www-data /app/var

# Set permissions: owner can read/write/execute, group can read/execute
# This ensures PHP-FPM can write to cache and logs
chmod -R 755 /app/var

# Clear and warm up cache as www-data user
# This ensures all cache files are owned by www-data from the start
su -s /bin/sh www-data -c "php bin/console cache:clear --env=$APP_ENV --no-debug"
su -s /bin/sh www-data -c "php bin/console cache:warmup --env=$APP_ENV --no-debug"

# Start PHP-FPM in daemon mode (-D flag runs it in background)
# This processes PHP scripts sent from nginx via FastCGI
php-fpm -D

# Start nginx in foreground (no -D flag)
# This must run in foreground to keep the container alive
# If nginx exits, the container stops
nginx

