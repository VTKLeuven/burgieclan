# Development Guide

## Docker

### Prerequisites

- Docker Desktop / Docker Engine
- Make (optional)
  - Windows: Install via Chocolatey ([install guide](https://chocolatey.org/install)) using `choco install make`
  - Mac/Linux: Pre-installed by default

### Quick Start

> **Note**: If you haven't set up SSH for GitHub yet, follow [this guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent).

```powershell
# Clone repository (SSH)
git clone https://github.com/VTKLeuven/burgieclan.git
cd burgieclan

# Start all services
make up                 
# (or run "docker compose up -d --build" if you don't use make)

# Generate JWT keypair
make backend-shell
php bin/console lexik:jwt:generate-keypair
exit
# (or run "docker compose exec backend php bin/console lexik:jwt:generate-keypair" instead if you don't use make)

# Initialize database and admin user
make db
# If you don't use make run following commands:
# docker compose exec backend php bin/console doctrine:migrations:migrate --no-interaction
# docker compose exec backend php bin/console doctrine:fixtures:load --no-interaction
# docker compose exec backend symfony console app:add-user --admin
```

### Make Commands

| Command | Description |
|---------|-------------|
| `make up` | Start all containers |
| `make down` | Stop all containers |
| `make db` | Initialize database and create admin user |
| `make admin` | Create admin user |
| `make logs` | View container logs |
| `make backend-shell` | Access backend container |
| `make frontend-shell` | Access frontend container |

### Services

#### Backend (Symfony)
- URL: http://localhost:8000/admin
- API: http://localhost:8000/api

#### Frontend (Next.js)
- URL: http://localhost:3000
- Hot reload enabled

#### Database
- Host: localhost:3306
- Database: burgieclan_db
- User: burgieclan_db_user
- Password: burgieclan_db_pass

> **Security Note**: These are development credentials only. Never use these in production.

#### Common Issues
TBC