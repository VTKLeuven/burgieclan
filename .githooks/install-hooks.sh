#!/bin/bash
#
# Installation script for git hooks
# Run this script to install the hooks for your local repository
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Hooks are shared by every worktree of a repository, so they live in the common git
# directory. --git-dir would point at .git/worktrees/<name> when run from a linked
# worktree, and git never looks for hooks there.
GIT_COMMON_DIR="$(git rev-parse --git-common-dir 2>/dev/null)"

if [ -z "$GIT_COMMON_DIR" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

HOOKS_DIR="$(cd "$GIT_COMMON_DIR" && pwd)/hooks"

echo "📦 Installing git hooks..."
echo ""

# core.hooksPath replaces the hooks directory outright, so hooks copied there would never run
HOOKS_PATH="$(git config --get core.hooksPath)"
if [ -n "$HOOKS_PATH" ]; then
    echo "⚠️  Warning: core.hooksPath is set to '$HOOKS_PATH', so git will not run hooks from $HOOKS_DIR"
    echo "   Unset it with 'git config --unset core.hooksPath' (check --global too) for these hooks to take effect"
    echo ""
fi

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Array to store installed hooks info
declare -a INSTALLED_HOOKS=()
declare -a HOOK_DESCRIPTIONS=()

# Function to extract description from hook file
get_hook_description() {
    local hook_file="$1"
    # Look for a line starting with "# Git" in the first 10 lines
    local desc=$(head -n 10 "$hook_file" | grep "^# Git.*hook" | head -n 1 | sed 's/^# Git //' | sed 's/^//')
    if [ -z "$desc" ]; then
        # Fallback: look for any descriptive comment
        desc=$(head -n 10 "$hook_file" | grep "^#" | grep -v "^#!/" | grep -v "^#$" | head -n 1 | sed 's/^# //')
    fi
    echo "$desc"
}

# Install each hook
for hook in "$SCRIPT_DIR"/*; do
    # Skip the install script itself and README
    if [ "$(basename "$hook")" = "install-hooks.sh" ] || [ "$(basename "$hook")" = "README.md" ]; then
        continue
    fi
    
    # Skip if not a file
    if [ ! -f "$hook" ]; then
        continue
    fi
    
    HOOK_NAME=$(basename "$hook")
    TARGET="$HOOKS_DIR/$HOOK_NAME"
    
    # Make the source hook executable
    chmod +x "$hook"
    
    # Copy the hook
    cp "$hook" "$TARGET"
    chmod +x "$TARGET"
    
    # Get description
    DESCRIPTION=$(get_hook_description "$hook")
    
    echo "✓ Installed $HOOK_NAME"
    
    # Store for summary
    INSTALLED_HOOKS+=("$HOOK_NAME")
    HOOK_DESCRIPTIONS+=("$DESCRIPTION")
done

echo ""
echo "✅ Git hooks installed successfully!"
echo ""

# Show installed hooks with descriptions
if [ ${#INSTALLED_HOOKS[@]} -gt 0 ]; then
    echo "Installed hooks:"
    for i in "${!INSTALLED_HOOKS[@]}"; do
        if [ -n "${HOOK_DESCRIPTIONS[$i]}" ]; then
            echo "  - ${INSTALLED_HOOKS[$i]}: ${HOOK_DESCRIPTIONS[$i]}"
        else
            echo "  - ${INSTALLED_HOOKS[$i]}"
        fi
    done
    echo ""
    
    # Build uninstall command
    UNINSTALL_CMD="rm"
    for hook in "${INSTALLED_HOOKS[@]}"; do
        UNINSTALL_CMD="$UNINSTALL_CMD $HOOKS_DIR/$hook"
    done
    echo "To uninstall, run: $UNINSTALL_CMD"
fi

