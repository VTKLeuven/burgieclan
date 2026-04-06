.PHONY: up down test prod clean build rebuild db admin reset-password phpstan phpunit phpcs phpcbf \
	sync-documents-to-s3-dry-run sync-documents-to-s3

# Optional: pick up S3_* from .docker/.env for sync targets (copy from .docker/.env.dist first)
-include .docker/.env
export S3_BUCKET S3_ENDPOINT S3_REGION S3_ACCESS_KEY S3_SECRET_KEY

# Local folder that mirrors object keys stored in the database (document.file_name)
DOCUMENTS_DIR ?= backend/data/documents

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

# --- One-time migration: local files -> Hetzner Object Storage ---
# Requires AWS CLI v2. Fill S3_* in .docker/.env or export them in your shell.
# If sync fails with SSL/host errors, ensure S3_ENDPOINT matches your bucket location
# (e.g. https://nbg1.your-objectstorage.com) and credentials are from Hetzner "Manage credentials".

sync-documents-to-s3-dry-run: ## List objects that would be uploaded (no changes)
	@test -n "$(S3_BUCKET)" || (echo "Set S3_BUCKET and other S3_* variables (see .docker/.env.dist)" >&2; exit 1)
	@test -n "$(S3_ENDPOINT)" || (echo "Set S3_ENDPOINT" >&2; exit 1)
	@test -n "$(S3_ACCESS_KEY)" || (echo "Set S3_ACCESS_KEY" >&2; exit 1)
	@test -n "$(S3_SECRET_KEY)" || (echo "Set S3_SECRET_KEY" >&2; exit 1)
	@test -d "$(DOCUMENTS_DIR)" || (echo "Missing directory $(DOCUMENTS_DIR)" >&2; exit 1)
	AWS_ACCESS_KEY_ID="$(S3_ACCESS_KEY)" AWS_SECRET_ACCESS_KEY="$(S3_SECRET_KEY)" \
		AWS_DEFAULT_REGION="$(S3_REGION)" \
		aws s3 sync "$(DOCUMENTS_DIR)" "s3://$(S3_BUCKET)/" \
			--endpoint-url "$(S3_ENDPOINT)" \
			--dryrun

sync-documents-to-s3: ## Upload files from $(DOCUMENTS_DIR) to the bucket (flat keys = filenames)
	@test -n "$(S3_BUCKET)" || (echo "Set S3_BUCKET and other S3_* variables (see .docker/.env.dist)" >&2; exit 1)
	@test -n "$(S3_ENDPOINT)" || (echo "Set S3_ENDPOINT" >&2; exit 1)
	@test -n "$(S3_ACCESS_KEY)" || (echo "Set S3_ACCESS_KEY" >&2; exit 1)
	@test -n "$(S3_SECRET_KEY)" || (echo "Set S3_SECRET_KEY" >&2; exit 1)
	@test -d "$(DOCUMENTS_DIR)" || (echo "Missing directory $(DOCUMENTS_DIR)" >&2; exit 1)
	AWS_ACCESS_KEY_ID="$(S3_ACCESS_KEY)" AWS_SECRET_ACCESS_KEY="$(S3_SECRET_KEY)" \
		AWS_DEFAULT_REGION="$(S3_REGION)" \
		aws s3 sync "$(DOCUMENTS_DIR)" "s3://$(S3_BUCKET)/" \
			--endpoint-url "$(S3_ENDPOINT)" \
			--only-show-errors