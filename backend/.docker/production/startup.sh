#!/bin/sh

# Container startup script - configures and starts nginx + PHP-FPM

# Set default values if environment variables are not set
PORT=${PORT:-8080}
MAX_REQUESTS=${MAX_REQUESTS:-8}

# Replace placeholders in configuration files with actual values
# sed -i: edit files in-place
# s,OLD,NEW,g: substitute OLD with NEW globally
# This allows runtime configuration without rebuilding the image
sed -i "s,LISTEN_PORT,$PORT,g" /etc/nginx/nginx.conf
sed -i "s,MAX_REQUESTS,$MAX_REQUESTS,g" /usr/local/etc/php-fpm.d/pool.conf

# Start PHP-FPM in daemon mode (-D flag runs it in background)
# This processes PHP scripts sent from nginx via FastCGI
php-fpm -D

# Start nginx in foreground (no -D flag)
# This must run in foreground to keep the container alive
# If nginx exits, the container stops
nginx

