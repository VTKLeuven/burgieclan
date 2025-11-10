# Git Hooks

This directory contains git hooks for the burgieclan project.

## Available Hooks

### commit-msg

Enforces that all commit messages start with `BUR-XXX` where XXX is a ticket number (one or more digits).

**Valid examples:**

- ✓ `BUR-123 Add new feature`
- ✓ `BUR-1 Fix bug`
- ✓ `BUR-99999 Update documentation`

**Invalid examples:**

- ✗ `Add new feature` (missing BUR prefix)
- ✗ `BUR- Fix bug` (missing number)
- ✗ `BUR-ABC Update docs` (letters instead of numbers)

## Installation

Each developer needs to install the hooks locally in their repository:

```bash
# From the root of the repository
./.githooks/install-hooks.sh
```

Or manually:

```bash
# Make the hook executable
chmod +x .githooks/commit-msg

# Copy to git hooks directory
cp .githooks/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg
```

## Why Hooks Are Not Automatic

Git hooks are **not automatically shared** through the repository for security reasons. This prevents malicious code from being executed on developers' machines through cloned repositories.

Each developer must explicitly install the hooks by running the installation script after cloning the repository.

## Uninstalling

To remove the hooks:

```bash
rm .git/hooks/commit-msg
```
