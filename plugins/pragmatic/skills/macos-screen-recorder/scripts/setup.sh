#!/bin/bash
set -euo pipefail

CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
CONFIG_DIR="$CONFIG_HOME/macos-qa-capture"
CONFIG_FILE="$CONFIG_DIR/config.json"
DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
REQUEST_DIR="$DATA_HOME/macos-qa-capture/requests"
RESPONSE_DIR="$DATA_HOME/macos-qa-capture/responses"
ARTIFACT_DIR="$HOME/qa-artifacts/macos"

mkdir -p "$CONFIG_DIR" "$REQUEST_DIR" "$RESPONSE_DIR" "$ARTIFACT_DIR"
chmod 700 "$CONFIG_DIR" "$REQUEST_DIR" "$RESPONSE_DIR" "$ARTIFACT_DIR" 2>/dev/null || true

if [ -e "$CONFIG_FILE" ]; then
  echo "config already exists — not overwriting: $CONFIG_FILE"
else
  python3 - "$CONFIG_FILE" "$REQUEST_DIR" "$RESPONSE_DIR" "$ARTIFACT_DIR" <<'PY'
import json, sys
path, request_dir, response_dir, artifact_dir = sys.argv[1:]
config = {
    "version": 1,
    "app": {
        "name": "ExampleApp",
        "bundlePath": "/Applications/ExampleApp.app",
        "bundleId": "com.example.app",
    },
    "gui": {
        "requestDir": request_dir,
        "responseDir": response_dir,
        "timeoutSeconds": 180,
        "commands": {
            "install": "",
            "screenshot": "",
            "start": "",
            "stop": "",
        },
    },
    "install": {"spec": "", "maxAttempts": 1},
    "signing": {
        "expectedBundleId": "com.example.app",
        "expectedTeamId": "",
        "expectedAuthorityContains": "",
    },
    "staging": {
        "targetApp": "ExampleApp",
        "hideDesktopIcons": True,
        "hideWidgets": True,
        "enableDoNotDisturb": True,
        "focusEnableCommand": "",
        "focusRestoreCommand": "",
        "quitApps": [],
        "hideApps": [],
    },
    "artifacts": {
        "directory": artifact_dir,
        "contactSheetSamples": 12,
        "deleteRawAfterApprovedUpload": True,
    },
    "storage": {
        "uploadCommand": "",
        "linkCommand": "",
        "expiry": "167h",
        "destinationTemplate": "",
    },
    "privacy": {
        "forbiddenContent": [
            "notifications",
            "reminders",
            "device names",
            "account identifiers",
            "email addresses",
            "private dashboards",
            "credentials",
        ]
    },
}
with open(path, "w", encoding="utf-8") as f:
    json.dump(config, f, indent=2)
    f.write("\n")
PY
  chmod 600 "$CONFIG_FILE"
  echo "created local config: $CONFIG_FILE"
fi

cat <<EOF

Next steps:
1. Edit $CONFIG_FILE locally. Do not commit it.
2. Configure a per-user Aqua-session LaunchAgent request bridge.
3. Put storage credentials in Keychain, environment, or the storage tool's own config.
4. Run:
   scripts/macos-qa-capture.sh config
   scripts/macos-qa-capture.sh preflight

Reusable plugin files may update from the marketplace; this local config is not synced back or overwritten.
EOF
