.PHONY: up down test prod clean build rebuild

# Development (default)
up:
	docker compose up -d --build

# Testing
test:
	docker compose --profile test up -d backend-test frontend-test

# Production
prod:
	docker compose --profile prod up -d backend-prod frontend-prod

# Stop everything
down:
	docker compose down

# Stop and remove volumes
clean:
	docker compose down -v
	docker volume prune -f

# Build all images
build:
	docker compose build
	docker compose --profile test build
	docker compose --profile prod build

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