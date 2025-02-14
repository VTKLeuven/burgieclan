# Docker Development Guide

## Prerequisites

- Docker Desktop for Windows
- Git
- Make 
  - Windows: Install via Chocolatey ([install guide](https://chocolatey.org/install)) using `choco install make`
  - Mac/Linux: Pre-installed by default

## Quick Start

**Note**: If you haven't set up SSH for GitHub yet, follow [this guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent).

```powershell
# Clone repository (SSH)
git clone https://github.com/VTKLeuven/burgieclan.git
cd burgieclan

# Start all services
make up

# Generate JWT keypair
make backend-shell
php bin/console lexik:jwt:generate-keypair
exit

# Initialize database and admin user
make db
```

## Make Commands

| Command | Description |
|---------|-------------|
| `make up` | Start all containers |
| `make down` | Stop all containers |
| `make db` | Initialize database and create admin user |
| `make admin` | Create admin user |
| `make logs` | View container logs |
| `make backend-shell` | Access backend container |
| `make frontend-shell` | Access frontend container |

## Services

### Backend (Symfony)
- URL: http://localhost:8000/admin
- API: http://localhost:8000/api

### Frontend (Next.js)
- URL: http://localhost:3000
- Hot reload enabled

### Database
- Host: localhost:3306
- Database: burgieclan_db
- User: burgieclan_db_user
- Password: burgieclan_db_pass

**Security Note**: These are development credentials only. Never use these in production.

## Troubleshooting

### Port Conflicts
If you see errors about ports being in use:
```powershell
# Check running containers
docker ps

# Stop conflicting containers
docker stop <container-id>
```

### Common Issues
TBC