# Burgieclan

## Getting Started

### Install Git Hooks

After cloning the repository, install the git hooks to ensure code quality and commit message standards:

```bash
./.githooks/install-hooks.sh
```

This will install two hooks:
- **pre-commit**: Runs PHP CodeSniffer on staged PHP files to enforce code style standards
- **commit-msg**: Enforces that all commit messages start with `BUR-XXX` (where XXX is a ticket number)

See [.githooks/README.md](.githooks/README.md) for more details.

### Local Development

This project uses Docker and Dev Containers for local development.

#### First Time Setup

1. **Create your environment file**:
   ```bash
   cp .env.dist .env
   ```
   Replace the `LITUS_API_KEY` with a valid key to enable login with Litus Oauth2.

2. **Start the development environment**:
   ```bash
   make up
   ```

3. **Set up the database**:
   ```bash
   make db
   ```

4. **Connect to the development container**:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Select "Dev Containers: Reopen in Container"
   - Choose either "Burgieclan Backend" or "Burgieclan Frontend"

That's it! You can now work on the frontend or backend code within the containerized environment.
 - Frontend: http://localhost:3000
 - Backend: http://localhost:8000

#### Stopping the Environment

To stop all services:
```bash
make down
```

#### Subsequent Runs

For future development sessions, simply run:
```bash
make up
```

Then reopen in your chosen development container (Backend or Frontend).

#### Additional Makefile Commands

The `Makefile` contains many useful commands designed to be run from the host machine. If you are running commands directly inside the container, run the underlying command itself (e.g., `php bin/console` instead of `docker compose exec backend php bin/console`).

- `make ps`: Show running containers
- `make logs`: Show logs from all services
- `make backend-shell`: Open a shell in the backend container
- `make frontend-shell`: Open a shell in the frontend container
- `make admin`: Create an admin user
- `make reset-password`: Reset a user's password
- `make phpstan`: Run PHP static analysis
- `make phpunit`: Run PHP unit tests
- `make phpcs`: Run PHP code style checks
- `make phpcbf`: Auto-fix PHP code style issues

## Development Workflow

This project follows a Git-flow inspired workflow with automated deployments to development and production environments.

### Feature Development & Bug Fixes

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b BUR-XXX-feature-name
   ```
   Use the ticket number (BUR-XXX) as a prefix for branch names.

2. **Develop your changes** locally using the development environment setup above.

3. **Commit your changes** with descriptive messages starting with the ticket number:
   ```bash
   git commit -m "BUR-XXX: Add new feature"
   ```
   The git hooks will enforce this format automatically.

4. **Push your branch** and **create a Pull Request** to the `main` branch:
   ```bash
   git push origin BUR-XXX-feature-name
   ```

5. **Code Review**: Ensure your PR gets reviewed and approved.

### Automated Deployments

#### Development Environment

- **Trigger**: When code is **merged to the `main` branch**
- **Target**: `https://dev.burgieclan.vtk.be`
- **Purpose**: Test changes in a production-like environment before release

Every merge to `main` automatically triggers a deployment to the development environment via GitHub Actions. This allows you to:
- Test your changes in a production-grade setup
- Share working features with stakeholders
- Catch integration issues early

#### Production Environment

- **Trigger**: When a **GitHub release is published**
- **Target**: `https://burgieclan.vtk.be`
- **Purpose**: Deploy stable, tested code to production

To deploy to production:

1. **Create a new release** on GitHub:
   - Go to the [Releases](https://github.com/vtkleuven/burgieclan/releases) page
   - Click "Create a new release"
   - Choose a tag version (e.g., `v1.2.3`)
   - Write release notes describing the changes (or better, generate them automatically)
   - Click "Publish release"

2. **Automated deployment** will:
   - Build production Docker images
   - Deploy to production servers
   - Run database migrations
   - Update the live application

### Environment URLs

- **Development**: https://dev.burgieclan.vtk.be
- **Production**: https://burgieclan.vtk.be

## Production Setup

The application is automatically deployed via GitHub Actions with no manual intervention required.

### Environment URLs

- **Development**: https://dev.burgieclan.vtk.be (auto-deploys on `main` branch merges)
- **Production**: https://burgieclan.vtk.be (auto-deploys on GitHub releases)

### Deployment Details

For comprehensive production deployment information including:
- Server requirements and configuration
- CI/CD pipeline documentation
- Environment variables setup
- Manual deployment procedures
- Maintenance and operations
- Security guidelines

See [PRODUCTION.md](PRODUCTION.md).

## License

This project is licensed under the terms specified in [LICENSE](LICENSE).

## Links

- [GitHub Repository](https://github.com/vtkleuven/burgieclan)
- [Production Documentation](PRODUCTION.md)
- [Git Hooks Documentation](.githooks/README.md)
