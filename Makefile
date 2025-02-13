.PHONY: up down test prod clean build rebuild db admin

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
	docker compose exec backend symfony console app:add-user --admin

# Create admin user
admin:
	docker compose exec backend symfony console app:add-user --admin