#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
BACKUP_FILE="$SETTINGS_FILE.backup"
HOOKS_CLI="$SCRIPT_DIR/../packages/hooks/dist/index.js"

# Ensure the hooks CLI is executable
if [ -f "$HOOKS_CLI" ]; then
  chmod +x "$HOOKS_CLI"
fi

# Create Claude settings directory if it doesn't exist
mkdir -p "$CLAUDE_DIR"

# Backup existing settings if it exists and is not a backup
if [ -f "$SETTINGS_FILE" ] && [ ! -f "$BACKUP_FILE" ]; then
  cp "$SETTINGS_FILE" "$BACKUP_FILE"
  echo "Backed up existing settings to $BACKUP_FILE"
fi

# Define the hook configuration
HOOK_CONFIG='"invoke": "agent-echo-hooks"'
HOOK_EVENTS='"events": ["SessionStart", "UserPromptSubmit", "AssistantMessage", "SessionEnd"]'

# Check if settings.json exists
if [ -f "$SETTINGS_FILE" ]; then
  # Read existing settings and merge hooks
  # Use node to properly merge JSON if available, otherwise use jq or basic text manipulation
  if command -v node &> /dev/null; then
    node -e "
const fs = require('fs');
const settings = fs.existsSync('$SETTINGS_FILE') ? JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8')) : {};
settings.hooks = {
  invoke: 'agent-echo-hooks',
  events: ['SessionStart', 'UserPromptSubmit', 'AssistantMessage', 'SessionEnd']
};
fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(settings, null, 2));
console.log('Updated settings.json with hook configuration');
"
  elif command -v jq &> /dev/null; then
    if [ ! -s "$SETTINGS_FILE" ]; then
      echo '{}' > "$SETTINGS_FILE"
    fi
    jq '.hooks = {invoke: "agent-echo-hooks", events: ["SessionStart", "UserPromptSubmit", "AssistantMessage", "SessionEnd"]}' "$SETTINGS_FILE" > "${SETTINGS_FILE}.tmp" && mv "${SETTINGS_FILE}.tmp" "$SETTINGS_FILE"
    echo "Updated settings.json with hook configuration"
  else
    # Fallback: create new settings file (overwrites existing hooks)
    echo "Warning: node and jq not found. Creating new settings file with hooks only."
    cat > "$SETTINGS_FILE" << 'EOF'
{
  "hooks": {
    "invoke": "agent-echo-hooks",
    "events": ["SessionStart", "UserPromptSubmit", "AssistantMessage", "SessionEnd"]
  }
}
EOF
  fi
else
  # Create new settings file with hook configuration
  cat > "$SETTINGS_FILE" << EOF
{
  "hooks": {
    "invoke": "agent-echo-hooks",
    "events": ["SessionStart", "UserPromptSubmit", "AssistantMessage", "SessionEnd"]
  }
}
EOF
  echo "Created settings.json with hook configuration"
fi

echo "Agent Echo hooks configured successfully."
echo "The following events will trigger agent-echo-hooks:"
echo "  - SessionStart"
echo "  - UserPromptSubmit"
echo "  - AssistantMessage"
echo "  - SessionEnd"