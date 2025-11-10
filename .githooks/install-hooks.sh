#!/bin/bash
#
# Installation script for git hooks
# Run this script to install the hooks for your local repository
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_DIR="$(git rev-parse --git-dir 2>/dev/null)"

if [ -z "$GIT_DIR" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

echo "📦 Installing git hooks..."
echo ""

# Create hooks directory if it doesn't exist
mkdir -p "$GIT_DIR/hooks"

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
    TARGET="$GIT_DIR/hooks/$HOOK_NAME"
    
    # Make the source hook executable
    chmod +x "$hook"
    
    # Copy the hook
    cp "$hook" "$TARGET"
    chmod +x "$TARGET"
    
    echo "✓ Installed $HOOK_NAME"
done

echo ""
echo "✅ Git hooks installed successfully!"
echo ""
echo "To uninstall, run: rm $GIT_DIR/hooks/commit-msg"

