# burgieclan

A web application built with Symfony (backend) and Next.js (frontend), designed for deployment in production using Docker.

## Production Setup

This guide will help you deploy the application on a new server.

### Prerequisites

- Docker (v20.10 or higher) and Docker Compose (v2.0 or higher)
- SSH access to the production server
- A domain name with DNS configured
- An external reverse proxy handling HTTPS (e.g., Caddy, Traefik, nginx, apache2)

### Automated Deployment (Recommended)

The application is automatically deployed via GitHub Actions. **No manual intervention is required** if the following are configured:

**GitHub Secrets** (Settings → Secrets and variables → Actions):
- `SSH_USER`: SSH username for the server
- `SSH_HOST`: Server hostname/IP address
- `SSH_PRIVATE_KEY`: SSH private key for authentication
- `SENTRY_AUTH_TOKEN`: (Optional) For Sentry source map uploads

**GitHub Variables** (Settings → Secrets and variables → Actions):
- `DEPLOY_DIR`: Deployment directory (e.g., `/opt/burgieclan`)
- `DATA_DIR`: Data directory path (e.g., `/opt/burgieclan/data`)
- `JWT_DIR`: JWT keys directory (e.g., `/opt/burgieclan/jwt`)

**Server Requirements**:
1. Docker and Docker Compose installed
2. Directories created (see Manual Deployment section below)
3. `.env` file configured (see Manual Deployment section below)

#### Production Deployment

**Trigger**: When a GitHub **release is published**

**Target**: `https://burgieclan.vtk.be`

The deployment pipeline will:
- Build production Docker images
- Push to GitHub Container Registry
- SSH to the production server
- Pull latest images
- Start/restart containers
- Run database migrations
- Generate JWT keys

#### Development Deployment

**Trigger**: When code is **pushed to the `test` branch**

**Target**: `https://dev.burgieclan.vtk.be`

The development environment uses the same production-grade Docker setup but deploys automatically on every push to the `test` branch. This allows testing changes in a production-like environment before creating a release.

**Note**: Both environments require separate server configurations with their own GitHub secrets/variables (configure per environment in GitHub repository settings).

See [PRODUCTION.md](PRODUCTION.md) for detailed CI/CD pipeline documentation.

### Manual Deployment (Alternative)

If you prefer manual deployment or GitHub Actions is not configured:

1. **Create required directories** on your production server:
   ```bash
   mkdir -p /opt/burgieclan/data
   mkdir -p /opt/burgieclan/jwt
   mkdir -p /opt/burgieclan/postgres
   ```

2. **Create a `.env` file** in your deployment directory (e.g., `/opt/burgieclan/.env`), see `.docker/.env.dist`:

   ```bash
   # Docker Images
   IMAGE_TAG=prod  # Use 'prod' for production, 'test' for development
   
   # Application
   APP_SECRET=your-generated-secret-here
   
   # Database
   POSTGRES_PASSWORD=your-strong-password-here
   POSTGRES_DATA_DIR=/opt/burgieclan/postgres
   
   # Directories
   DATA_DIR=/opt/burgieclan/data
   JWT_DIR=/opt/burgieclan/jwt
   
   # OAuth (Litus)
   LITUS_API_KEY=your-litus-api-key
   LITUS_SECRET=your-litus-secret
   
   # JWT
   JWT_PASSPHRASE=your-jwt-passphrase
   
   # Sentry error tracking
   SENTRY_DSN=your-sentry-dsn
   ```

3. **Download the production compose file**:
   ```bash
   cd /opt/burgieclan
   curl -o docker-compose.prod.yml https://raw.githubusercontent.com/vtkleuven/burgieclan/main/.docker/docker-compose.prod.yml
   curl -o nginx.conf https://raw.githubusercontent.com/vtkleuven/burgieclan/main/.docker/nginx.conf
   ```

4. **Log in to GitHub Container Registry**:
   ```bash
   echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
   ```

5. **Pull and start the application**:
   ```bash
   # For production deployment (use prod images)
   IMAGE_TAG=prod docker compose -f docker-compose.prod.yml pull
   IMAGE_TAG=prod docker compose -f docker-compose.prod.yml up -d
   
   # For development deployment (use test images)
   IMAGE_TAG=test docker compose -f docker-compose.prod.yml pull
   IMAGE_TAG=test docker compose -f docker-compose.prod.yml up -d
   ```

6. **Run database migrations**:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend php bin/console doctrine:migrations:migrate --no-interaction
   ```

7. **Generate JWT keys**:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend php bin/console lexik:jwt:generate-keypair
   ```

### Accessing the Application

The application will be available at `http://your-server:8000`. Configure your external reverse proxy to forward HTTPS traffic to this port.

### Basic Troubleshooting

**View logs**:
```bash
# All services
docker compose -f docker-compose.prod.yml logs

# Specific service
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend

# Follow logs in real-time
docker compose -f docker-compose.prod.yml logs -f
```

**Check service health**:
```bash
docker compose -f docker-compose.prod.yml ps
```

**Restart services**:
```bash
docker compose -f docker-compose.prod.yml restart
```

## Production Architecture

For detailed information about the production setup, including architecture, CI/CD pipeline, configuration files, and operational guidelines, see [PRODUCTION.md](PRODUCTION.md).

### Quick Overview

The production deployment consists of 4 Docker containers:

- **nginx**: Reverse proxy routing requests to backend/frontend (port 8000)
- **backend**: Symfony API with PHP-FPM + nginx (internal port 8080)
- **frontend**: Next.js application (internal port 3000)
- **db**: PostgreSQL 18 database (internal port 5432)

Images are automatically built and deployed via GitHub Actions when releases are published.