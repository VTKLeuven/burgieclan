# Git Hooks

This directory contains git hooks for the burgieclan project.

## Available Hooks

### pre-commit

Runs PHP CodeSniffer on all staged PHP files in the `backend/` directory before allowing a commit. This ensures code style standards are maintained before code is committed.

**What it does:**
- Automatically runs on staged `.php` files in the `backend/` directory
- Uses the configuration from `backend/phpcs.xml.dist`
- Blocks commits if code style violations are found
- Provides helpful error messages and fix instructions

**If violations are found:**
```bash
# Automatically fix most issues
cd backend && vendor/bin/phpcbf

# Or bypass the hook (not recommended)
git commit --no-verify
```

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

## Hook Workflow

Here's what happens when you try to commit:

```
1. You run: git commit -m "BUR-123 Add feature"
   ↓
2. pre-commit hook runs
   ↓ (checks all staged .php files)
   ├─ ✅ PASS: Code style is clean → Continue
   └─ ❌ FAIL: Code style violations → Commit blocked
   ↓
3. commit-msg hook runs
   ↓ (validates commit message format)
   ├─ ✅ PASS: Starts with BUR-XXX → Commit succeeds! 🎉
   └─ ❌ FAIL: Invalid format → Commit blocked
```

## Why Hooks Are Not Automatic

Git hooks are **not automatically shared** through the repository for security reasons. This prevents malicious code from being executed on developers' machines through cloned repositories.

Each developer must explicitly install the hooks by running the installation script after cloning the repository.

## Uninstalling

To remove the hooks:

```bash
rm .git/hooks/commit-msg
```
