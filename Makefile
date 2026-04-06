.PHONY: up down test prod clean build rebuild db admin reset-password phpstan phpunit phpcs phpcbf

# Development (default)
up:
	docker compose up -d --build

# Stop everything
down:
	docker compose down

# Stop and remove volumes
clean:
	docker compose down -v

# Build all images
build:
	docker compose build

# Rebuild and restart
rebuild: down build up

# Show running containers
ps:
	docker compose ps

# Show logs
logs:
	docker compose logs -f

# Backend shell
backend-shell:
	docker compose exec backend sh

# Frontend shell
frontend-shell:
	docker compose exec frontend sh

# Database setup
db:
	docker compose exec backend php bin/console doctrine:migrations:migrate --no-interaction
	docker compose exec backend php bin/console doctrine:fixtures:load --no-interaction
	docker compose exec backend php bin/console lexik:jwt:generate-keypair --skip-if-exists

# Create admin user
admin:
	docker compose exec backend symfony console app:add-user --admin

# Reset password
reset-password:
	docker compose exec backend symfony console app:reset-password

# Run PHPStan
phpstan:
	docker compose exec backend vendor/bin/phpstan analyze --memory-limit=512M

# Run PHPUnit tests
phpunit:
	docker compose exec backend vendor/bin/phpunit tests

# Run PHP CodeSniffer
phpcs:
	docker compose exec backend vendor/bin/phpcs

# Run PHP CodeSniffer fix
phpcbf:
	docker compose exec backend vendor/bin/phpcbf