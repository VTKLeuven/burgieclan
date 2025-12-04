# Production Deployment Guide

This document provides a comprehensive technical overview of the production deployment architecture, CI/CD pipeline, and operational procedures for the burgieclan application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Docker Images](#docker-images)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Configuration Files](#configuration-files)
5. [Environment Variables](#environment-variables)
6. [Maintenance & Operations](#maintenance--operations)
7. [Security](#security)

---

## Architecture Overview

### Service Topology

The production deployment uses a 4-container architecture orchestrated by Docker Compose:

```
Internet → External Reverse Proxy (HTTPS)
              ↓
         nginx (port 8000)
         /              \
        /                \
  backend (8080)      frontend (3000)
       |
       |
    db (5432)
```

### Port Mappings

| Service   | Internal Port | External Port | Purpose                          |
|-----------|---------------|---------------|----------------------------------|
| nginx     | 80            | 8000          | Main entry point (HTTP only)     |
| backend   | 8080          | -             | Symfony API (internal only)      |
| frontend  | 3000          | -             | Next.js app (internal only)      |
| db        | 5432          | -             | PostgreSQL (internal only)       |

**Note**: Only nginx exposes an external port. The external reverse proxy (e.g., Caddy) should handle HTTPS termination and forward to port 8000.

### Request Flow

1. **Client Request** → External reverse proxy (HTTPS)
2. **Reverse Proxy** → nginx container (port 8000, HTTP)
3. **nginx** routes based on path:
   - `/admin`, `/api`, `/uploads`, `/files`, `/build`, `/bundles` → **backend** (Symfony)
   - `/api/frontend` → **frontend** (Next.js Server Actions)
   - All other routes → **frontend** (Next.js pages)
4. **backend** connects to **db** for data persistence

### Health Checks

- **db**: `pg_isready` every 10s (5 retries, 30s start period)
- **backend**: HTTP check to `/api/healthcheck` every 30s (3 retries, 40s start period)
- **frontend**: Depends on backend health

### Logging

All services use JSON file logging with automatic rotation:
- **Max size per file**: 50MB
- **Max files retained**: 5 (250MB total per service)
- **Compression**: Enabled for rotated logs

---

## Docker Images

Images are hosted on GitHub Container Registry (GHCR) at `ghcr.io/vtkleuven/burgieclan/`.

### Backend Image

**Base**: `php:8.4-fpm-alpine3.22`

**Architecture**: Single container running both nginx and PHP-FPM
- nginx listens on port 8080 and forwards PHP requests to PHP-FPM on 127.0.0.1:9000
- PHP-FPM processes Symfony application

**Build Process** ([backend/.docker/production/Dockerfile](backend/.docker/production/Dockerfile)):
1. Install system dependencies (nginx, curl, git, PostgreSQL client)
2. Install PHP extensions (pdo_pgsql, zip, intl, opcache)
3. Install Composer dependencies (production only, optimized autoloader)
4. Install npm dependencies and build Webpack assets
5. Remove node_modules to reduce image size
6. Install Symfony bundle assets
7. Set proper file permissions (www-data user)

**Key Features**:
- OPcache enabled with JIT compilation for performance
- Static PHP-FPM process manager (configurable worker count)
- Health check via `/api/healthcheck` endpoint
- Startup script handles cache warming and directory permissions

**Image Size**: ~300MB (Alpine-based)

### Frontend Image

**Base**: `node:20-alpine`

**Architecture**: Multi-stage build producing Next.js standalone server

**Build Process** ([frontend/.docker/production/Dockerfile](frontend/.docker/production/Dockerfile)):

1. **Stage 1 (deps)**: Install dependencies
   - Copy package files
   - Run `npm ci` for exact dependency versions

2. **Stage 2 (builder)**: Build application
   - Copy dependencies from stage 1
   - Copy source code
   - Build Next.js application with `npm run build`
   - Sentry source maps uploaded during build (if SENTRY_AUTH_TOKEN provided)

3. **Stage 3 (runner)**: Production runtime
   - Copy built artifacts from builder
   - Install only `sharp` for image optimization
   - Run as non-root user (nextjs:nodejs)
   - Serve via Next.js standalone server

**Key Features**:
- Standalone output mode (includes only necessary dependencies)
- Non-root user execution for security
- Sharp for optimized image processing
- Build-time environment variable injection

**Image Size**: ~150MB (standalone build)

---

## CI/CD Pipeline

### GitHub Actions Workflows

The deployment pipeline consists of 4 workflows in `.github/workflows/`:

#### 1. build-backend.yaml

**Trigger**: Called by deploy.yaml

**Purpose**: Build and push backend Docker image to GHCR

**Process**:
1. Checkout code
2. Set up Docker Buildx (for advanced build features)
3. Log in to GHCR using GitHub token
4. Extract image metadata (tags, labels)
5. Build and push image with build cache
6. Tag with branch name and commit SHA

**Build Arguments**:
- `APP_ENV=prod`
- `FRONTEND_URL` (from workflow input)

**Cache Strategy**: Registry cache to speed up subsequent builds

#### 2. build-frontend.yaml

**Trigger**: Called by deploy.yaml

**Purpose**: Build and push frontend Docker image to GHCR

**Process**: Similar to backend build

**Build Arguments**:
- `SENTRY_AUTH_TOKEN` (for source map upload)
- `NEXT_PUBLIC_FRONTEND_URL`
- `NEXT_PUBLIC_BACKEND_URL`

**Note**: Next.js environment variables must be set at build time, not runtime

#### 3. deploy_production.yml

**Trigger**: When a GitHub release is published

**Purpose**: Initiate production deployment

**Process**:
1. Calls deploy.yaml workflow
2. Sets environment to `production`
3. Sets URL to `https://burgieclan.vtk.be`

**Concurrency**: Only one production deployment at a time (no cancellation)

#### 4. deploy.yaml

**Trigger**: Called by deploy_production.yml (or other environment-specific workflows)

**Purpose**: Orchestrate complete build and deployment

**Process**:
1. **Build Phase** (parallel):
   - Call build-backend.yaml
   - Call build-frontend.yaml

2. **Deploy Phase** (after builds complete):
   - Set up SSH access to production server
   - Connect via SSH and execute deployment script:
     - Set `IMAGE_TAG` environment variable based on environment (`prod` or `dev`)
     - Download latest docker-compose.prod.yml and nginx.conf
     - Log in to GHCR
     - Pull latest images (using the appropriate tag)
     - Stop old containers
     - Start new containers with `--force-recreate`
     - Wait for health checks (30s timeout)
     - Verify all services are healthy
     - Run database migrations
     - Generate JWT keys (skip if exists)
     - Clean up old images

**Required Secrets**:
- `SSH_USER`: Server SSH username
- `SSH_HOST`: Server hostname/IP
- `SSH_PRIVATE_KEY`: SSH private key for authentication
- `GITHUB_TOKEN`: Automatically provided by GitHub

**Required Variables** (set in GitHub repository settings):
- `DEPLOY_DIR`: Deployment directory on server (e.g., `/opt/burgieclan`)
- `DATA_DIR`: Data directory path
- `JWT_DIR`: JWT keys directory path

### Image Tagging Strategy

Images are tagged based on the deployment environment:

**Production Environment** (when release is published):
- `ghcr.io/vtkleuven/burgieclan/backend:latest`
- `ghcr.io/vtkleuven/burgieclan/backend:prod`
- `ghcr.io/vtkleuven/burgieclan/frontend:latest`
- `ghcr.io/vtkleuven/burgieclan/frontend:prod`

**Development Environment** (when pushed to `main` branch):
- `ghcr.io/vtkleuven/burgieclan/backend:dev`
- `ghcr.io/vtkleuven/burgieclan/frontend:dev`

**Additional Tags** (all environments):
- **Branch name**: `ghcr.io/vtkleuven/burgieclan/backend:main`
- **Commit SHA**: `ghcr.io/vtkleuven/burgieclan/backend:main-abc1234`

The docker-compose.prod.yml uses the `IMAGE_TAG` environment variable to pull the correct image tag:
- Set to `prod` for production deployments
- Set to `dev` for development deployments
- Defaults to `dev` if not specified

---

## Configuration Files

### docker-compose.prod.yml

**Location**: `.docker/docker-compose.prod.yml`

**Purpose**: Defines the production service stack

**Key Configuration**:

- **Image Tags**: Uses `${IMAGE_TAG:-dev}` for dynamic tag selection
  - Set `IMAGE_TAG=prod` for production deployments
  - Set `IMAGE_TAG=dev` for development deployments
  - Defaults to `dev` if not specified
- **Restart Policy**: `unless-stopped` (auto-restart on crash, but not if manually stopped)
- **Volume Mounts**:
  - Backend: data directory, JWT directory, var directory (named volume)
  - Database: PostgreSQL data directory
- **Service Dependencies**:
  - backend depends on db (with health check)
  - frontend depends on backend (with health check)
  - nginx depends on backend and frontend
- **Environment Variables**: All sensitive values from `.env` file with validation (`?` operator)

**Reference**: See [.docker/docker-compose.prod.yml](.docker/docker-compose.prod.yml)

### Nginx (Reverse Proxy)

**Location**: `.docker/nginx.conf`

**Purpose**: Route requests between backend and frontend

**Key Features**:
- Routes `/api/frontend` to frontend (must come before backend routes)
- Routes admin, API, uploads, files, build, bundles to backend
- Routes all other paths to frontend
- Trusts `X-Forwarded-*` headers from external proxy
- Maps forwarded headers with sensible defaults (https, port 443)
- Client max body size: 500MB (for large file uploads)

**Reference**: See [.docker/nginx.conf](.docker/nginx.conf)

### Backend Configuration

#### Dockerfile
**Location**: `backend/.docker/production/Dockerfile`

Multi-stage approach building everything needed for production:
- PHP 8.4 with FPM on Alpine Linux
- nginx bundled in same container
- Composer dependencies (production only)
- Webpack assets compiled
- Symfony bundle assets installed

#### startup.sh
**Location**: `backend/.docker/production/startup.sh`

Container entrypoint script that:
1. Replaces configuration placeholders with environment variables
2. Creates var and data directories with proper permissions
3. Sets ownership to www-data user
4. Clears and warms up Symfony cache
5. Starts PHP-FPM in daemon mode
6. Starts nginx in foreground (keeps container alive)

**Reference**: See [backend/.docker/production/startup.sh](backend/.docker/production/startup.sh)

#### nginx.conf (Backend)
**Location**: `backend/.docker/production/nginx.conf`

Internal nginx configuration for the backend container:
- Listens on port 8080
- Serves from `/app/public` (Symfony public directory)
- Routes all requests through `index.php` (Symfony front controller)
- FastCGI configuration for PHP-FPM on 127.0.0.1:9000
- HTTP/2 support
- 500MB upload limit

#### pool.conf
**Location**: `backend/.docker/production/pool.conf`

PHP-FPM worker configuration:
- **Process Manager**: Static (fixed number of workers)
- **Worker Count**: Set via `MAX_REQUESTS` environment variable (default: 8)
- **Calculation**: `(Total RAM - System RAM) / 256MB per process`
  - Example: 2GB RAM → ~8 workers
  - Example: 4GB RAM → ~16 workers

#### production.ini
**Location**: `backend/.docker/production/production.ini`

PHP optimization settings:
- **OPcache**: Enabled with 128MB memory
- **JIT**: Enabled (mode 1255, 64MB buffer)
- **Realpath Cache**: 4MB cache, 10min TTL
- **Memory Limit**: 256MB per request
- **Timestamp Validation**: Disabled (requires cache clear on deploy)
- **Security**: PHP version hidden in headers

**Reference**: See [backend/.docker/production/production.ini](backend/.docker/production/production.ini)

### Frontend Configuration

#### Dockerfile
**Location**: `frontend/.docker/production/Dockerfile`

3-stage build optimizing for size and security:

**Stage 1 (deps)**: Install all dependencies from package-lock.json

**Stage 2 (builder)**: Build Next.js application
- Accepts build-time environment variables
- Builds with Sentry integration
- Outputs standalone server

**Stage 3 (runner)**: Minimal production runtime
- Only includes built artifacts and sharp
- Runs as non-root user (nextjs)
- Starts Node.js server on port 3000

**Reference**: See [frontend/.docker/production/Dockerfile](frontend/.docker/production/Dockerfile)

---

## Environment Variables

### Required Variables

These variables **must** be set in the `.env` file. The application will fail to start if they are missing.

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_SECRET` | Symfony secret key for encryption | Random 32-character string |
| `POSTGRES_PASSWORD` | Database password | Strong password |
| `POSTGRES_DATA_DIR` | PostgreSQL data directory path | `/opt/burgieclan/postgres` |
| `DATA_DIR` | Application data directory | `/opt/burgieclan/data` |
| `JWT_DIR` | JWT keys directory | `/opt/burgieclan/jwt` |
| `LITUS_API_KEY` | Litus OAuth API key | From Litus configuration |
| `LITUS_SECRET` | Litus OAuth secret | From Litus configuration |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `IMAGE_TAG` | Docker image tag to use | `dev` |
| `APP_ENV` | Symfony environment | `prod` |
| `MAX_REQUESTS` | PHP-FPM worker count | `8` |
| `JWT_PASSPHRASE` | JWT passphrase | Empty |
| `SENTRY_DSN` | Sentry error tracking URL | Empty (disabled) |
| `CORS_ALLOW_ORIGIN` | CORS origin pattern | Localhost only |
| `NEXT_PUBLIC_MAX_FILE_SIZE_MB` | Max upload size (MB) | `200` |
| `NEXT_PUBLIC_ALLOWED_MIME_TYPES` | Allowed file types | Common document/image types |

### Frontend Build-Time Variables

These are set during Docker build (in GitHub Actions), **not** at runtime:

| Variable | Description | Set By |
|----------|-------------|--------|
| `NEXT_PUBLIC_FRONTEND_URL` | Frontend URL | GitHub Actions workflow |
| `NEXT_PUBLIC_BACKEND_URL` | Backend API URL | GitHub Actions workflow |
| `SENTRY_AUTH_TOKEN` | Sentry source map upload token | GitHub secret |

### GitHub Secrets & Variables

Configure these in GitHub repository settings:

**Secrets** (Settings → Secrets and variables → Actions → Secrets):
- `SSH_USER`
- `SSH_HOST`
- `SSH_PRIVATE_KEY`
- `SENTRY_AUTH_TOKEN`

**Variables** (Settings → Secrets and variables → Actions → Variables):
- `DEPLOY_DIR`
- `DATA_DIR`
- `JWT_DIR`

**Environment-Specific**: Configure separately for each environment (production, staging, etc.)

---

## Maintenance & Operations

### Viewing Logs

**All services**:
```bash
docker compose -f docker-compose.prod.yml logs
```

**Specific service**:
```bash
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
docker compose -f docker-compose.prod.yml logs nginx
docker compose -f docker-compose.prod.yml logs db
```

**Real-time logs** (follow mode):
```bash
docker compose -f docker-compose.prod.yml logs -f
```

**Last N lines**:
```bash
docker compose -f docker-compose.prod.yml logs --tail=100 backend
```

**Logs with timestamps**:
```bash
docker compose -f docker-compose.prod.yml logs -t
```

### Log Rotation

Logs automatically rotate when they reach 50MB:
- **Location**: `/var/lib/docker/containers/<container-id>/`
- **Format**: `<container-id>-json.log` (current), `<container-id>-json.log.1.gz` (rotated)
- **Retention**: 5 files per service (250MB total)
- **Compression**: Gzip compression for rotated logs

**View rotated logs**:
```bash
# Find container ID
docker ps | grep burgieclan

# View compressed log
zcat /var/lib/docker/containers/<container-id>/<container-id>-json.log.1.gz
```

### Database Migrations

**Run migrations**:
```bash
docker compose -f docker-compose.prod.yml exec backend php bin/console doctrine:migrations:migrate --no-interaction
```

**Check migration status**:
```bash
docker compose -f docker-compose.prod.yml exec backend php bin/console doctrine:migrations:status
```

**Generate new migration** (on development):
```bash
docker compose exec backend php bin/console doctrine:migrations:diff
```

### Health Checks

**Check service status**:
```bash
docker compose -f docker-compose.prod.yml ps
```

**Check specific service health**:
```bash
docker inspect --format='{{.State.Health.Status}}' burgieclan-backend
docker inspect --format='{{.State.Health.Status}}' burgieclan-db
```

**View health check logs**:
```bash
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' burgieclan-backend
```

### Scaling Considerations

#### Backend Scaling

The backend uses a **static PHP-FPM process manager** with a fixed number of workers set via `MAX_REQUESTS`.

**Calculate optimal worker count**:
```
Workers = (Available RAM - System RAM) / 256MB per worker
```

Examples:
- 2GB RAM: 8 workers
- 4GB RAM: 16 workers
- 8GB RAM: 32 workers

**Update worker count**:
1. Edit `.env` file: `MAX_REQUESTS=16`
2. Restart backend: `docker compose -f docker-compose.prod.yml restart backend`

**Monitor memory usage**:
```bash
docker stats burgieclan-backend
```

#### Database Scaling

For high-traffic scenarios, consider:
- Read replicas for read-heavy workloads
- Connection pooling (PgBouncer)
- Vertical scaling (more CPU/RAM)

### Backup Recommendations

#### Database Backups

**Manual backup**:
```bash
docker compose -f docker-compose.prod.yml exec db pg_dump -U burgieclan_db_user burgieclan_db > backup-$(date +%Y%m%d-%H%M%S).sql
```

**Restore backup**:
```bash
docker compose -f docker-compose.prod.yml exec -T db psql -U burgieclan_db_user burgieclan_db < backup-20240101-120000.sql
```

**Automated backups** (cron):
```bash
0 2 * * * cd /opt/burgieclan && docker compose -f docker-compose.prod.yml exec -T db pg_dump -U burgieclan_db_user burgieclan_db | gzip > /backups/burgieclan-$(date +\%Y\%m\%d).sql.gz
```

#### Data Directory Backups

```bash
# Stop backend to ensure consistency
docker compose -f docker-compose.prod.yml stop backend

# Backup data directory
tar -czf data-backup-$(date +%Y%m%d).tar.gz /opt/burgieclan/data

# Restart backend
docker compose -f docker-compose.prod.yml start backend
```

#### JWT Keys Backup

**Critical**: Back up JWT keys immediately after generation

```bash
tar -czf jwt-keys-backup.tar.gz /opt/burgieclan/jwt
```

Store in secure location (encrypted storage, password manager, etc.)

If the JWT keys are lost, you can create new keys (see command above). The consequence of this is that all users will be logged out.

### Updating the Application

Updates are deployed automatically via GitHub Actions when a release is published. To manually update:

**Production Update** (using `prod` tag):
```bash
# Set image tag for production
export IMAGE_TAG=prod

# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Recreate containers
docker compose -f docker-compose.prod.yml up -d --force-recreate

# Run migrations
docker compose -f docker-compose.prod.yml exec backend php bin/console doctrine:migrations:migrate --no-interaction
```

**Development Update** (using `dev` tag):
```bash
# Set image tag for development
export IMAGE_TAG=dev

# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Recreate containers
docker compose -f docker-compose.prod.yml up -d --force-recreate

# Run migrations
docker compose -f docker-compose.prod.yml exec backend php bin/console doctrine:migrations:migrate --no-interaction
```

### Troubleshooting Common Issues

#### Backend won't start

1. Check logs: `docker compose -f docker-compose.prod.yml logs backend`
2. Verify environment variables in `.env`
3. Check database connectivity: `docker compose -f docker-compose.prod.yml exec backend nc -zv db 5432`
4. Verify data directory permissions: `ls -la /opt/burgieclan/data`

#### Frontend won't start

1. Check logs: `docker compose -f docker-compose.prod.yml logs frontend`
2. Verify backend is healthy: `docker compose -f docker-compose.prod.yml ps`
3. Check backend API: `curl http://localhost:8000/api/healthcheck`

#### Database connection errors

1. Check database health: `docker compose -f docker-compose.prod.yml ps db`
2. Verify password in `.env` matches database
3. Check PostgreSQL logs: `docker compose -f docker-compose.prod.yml logs db`

#### High memory usage

1. Monitor container stats: `docker stats`
2. Reduce PHP-FPM workers: Lower `MAX_REQUESTS` in `.env`
3. Check for memory leaks in logs
4. Consider vertical scaling (more RAM)

---

## Security

### Container Security

#### Non-Root Users

Both backend and frontend containers run as non-root users for security:

- **Backend**: Runs as `www-data`
- **Frontend**: Runs as `nextjs`

This prevents privilege escalation attacks and limits damage from container compromises.

#### Internal-Only Services

Only nginx exposes an external port (8000). Backend, frontend, and database are only accessible within the Docker network:

- **backend**: Internal port 8080 (not exposed)
- **frontend**: Internal port 3000 (not exposed)
- **db**: Internal port 5432 (not exposed)

This reduces attack surface and prevents direct access to services.

### Network Security

#### External Reverse Proxy

The application expects an external reverse proxy (Caddy, Traefik, nginx) to:
- Handle HTTPS/TLS termination
- Forward requests to port 8000
- Set `X-Forwarded-Proto`, `X-Forwarded-Port`, `X-Forwarded-Host` headers

The internal nginx trusts these headers and defaults to HTTPS/443 if not set.

**Example Caddy configuration**:
```
burgieclan.vtk.be {
    reverse_proxy localhost:8000
}
```

**Example nginx configuration**:
```nginx
server {
    listen 443 ssl http2;
    server_name burgieclan.vtk.be;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

### Application Security

#### JWT Keys

JWT keys are generated on first deployment and stored in the mounted JWT directory.

**Generate keys**:
```bash
docker compose -f docker-compose.prod.yml exec backend php bin/console lexik:jwt:generate-keypair
```

**Important**:
- Keys are generated automatically during deployment
- Back up keys immediately after generation
- Keys are required for API authentication
- If keys are lost, all users must re-authenticate

#### Secrets Management

**Never commit secrets to Git**. Use:
- `.env` file on server (not in repository)
- GitHub Secrets for CI/CD variables
- Environment-specific configurations

**Verify secrets are not in repository**:
```bash
git grep -i "password\|secret\|key" .env
```

Should return no results.

#### CORS Configuration

Configure `CORS_ALLOW_ORIGIN` in `.env` to restrict API access:

```bash
# Production: specific domain
CORS_ALLOW_ORIGIN=^https://burgieclan\.vtk\.be$

# Development: localhost
CORS_ALLOW_ORIGIN=^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$

# Multiple domains
CORS_ALLOW_ORIGIN=^https://(burgieclan\.vtk\.be|staging\.burgieclan\.vtk\.be)$
```

#### File Uploads

File uploads are restricted by:
- **Size**: 200MB default (configurable via `NEXT_PUBLIC_MAX_FILE_SIZE_MB`) (max 500MB, hard limit in backend configuration)
- **MIME types**: Configured via `NEXT_PUBLIC_ALLOWED_MIME_TYPES`
- **Storage**: Isolated in mounted data directory

**Allowed types by default**:
- Documents: PDF, Word, PowerPoint, Excel, LibreOffice
- Images: JPEG, PNG, SVG, GIF
- Archives: ZIP
- Text: CSV, plain text, Markdown, MATLAB, Python
- Video: MP4

### Monitoring & Error Tracking

#### Sentry Integration

Optional Sentry integration for error tracking:

1. Set `SENTRY_DSN` in `.env` (both backend and frontend)
2. Set `SENTRY_AUTH_TOKEN` in GitHub Secrets (for source maps)
3. Errors are automatically reported to Sentry
4. Source maps are uploaded during build for readable stack traces

**View errors**: Check your Sentry dashboard at https://sentry.io

#### Security Updates

- **Base images**: Regularly updated (Alpine Linux, Node.js, PostgreSQL)
- **Dependencies**: Keep Composer and npm packages updated
- **PHP version**: Currently PHP 8.4 (latest stable)
- **Database**: PostgreSQL 18 (latest stable)

**Update dependencies**:
```bash
# Backend (Composer)
composer update

# Frontend (npm)
npm update

# Check for security vulnerabilities
composer audit
npm audit
```

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Symfony Documentation](https://symfony.com/doc/current/index.html)
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Last Updated**: November 2025

