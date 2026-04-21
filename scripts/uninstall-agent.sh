#!/bin/bash
set -e

CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
BACKUP_FILE="$SETTINGS_FILE.backup"

# Check if settings file exists
if [ ! -f "$SETTINGS_FILE" ]; then
  echo "No settings file found at $SETTINGS_FILE. Nothing to uninstall."
  exit 0
fi

# Remove hook configuration from settings
if command -v node &> /dev/null; then
  node -e "
const fs = require('fs');
const settings = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8'));
if (settings.hooks) {
  delete settings.hooks;
  fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(settings, null, 2));
  console.log('Removed hooks from settings.json');
} else {
  console.log('No hooks configuration found in settings.json');
}
"
elif command -v jq &> /dev/null; then
  jq 'del(.hooks)' "$SETTINGS_FILE" > "${SETTINGS_FILE}.tmp" && mv "${SETTINGS_FILE}.tmp" "$SETTINGS_FILE"
  echo "Removed hooks from settings.json"
else
  # Fallback: warn user
  echo "Warning: node and jq not found. Please manually remove the 'hooks' section from $SETTINGS_FILE"
  exit 1
fi

# Restore backup if it exists
if [ -f "$BACKUP_FILE" ]; then
  # Merge back the original settings (backup has the pre-hook config)
  if command -v node &> /dev/null; then
    node -e "
const fs = require('fs');
const backup = JSON.parse(fs.readFileSync('$BACKUP_FILE', 'utf8'));
const current = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8'));
// Restore hooks from backup if they existed
if (backup.hooks && !current.hooks) {
  current.hooks = backup.hooks;
  fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(current, null, 2));
  console.log('Restored original hook configuration from backup');
}
// Remove backup after successful restore
fs.unlinkSync('$BACKUP_FILE');
console.log('Removed backup file');
" 2>/dev/null || {
      # If the above fails, just remove backup
      rm -f "$BACKUP_FILE"
      echo "Removed backup file"
    }
  else
    rm -f "$BACKUP_FILE"
    echo "Removed backup file"
  fi
fi

echo "Agent Echo hooks uninstalled successfully."