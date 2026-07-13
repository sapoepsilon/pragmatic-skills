# Local configuration

`macos-screen-recorder` intentionally ships without destinations, credentials, signing identities, bundle identifiers, application paths, or host-specific request protocols. Those values live in a local extension created by `scripts/setup.sh`.

## Configuration layers

The helper merges JSON objects recursively in this order:

1. `~/.config/macos-qa-capture/config.json` — machine defaults, mode `0600`
2. `<repo>/.macos-qa-capture.json` — optional shareable project commands and policy; no secrets
3. `<repo>/.macos-qa-capture.local.json` — optional private overrides; add to `.gitignore`

Arrays and scalar values replace earlier values. Objects merge recursively.

The plugin marketplace/cache syncs the reusable skill and scripts only. It does **not** upload or overwrite the files above. This is the intended client-sync boundary: portable process in the plugin, private infrastructure on the client.

## Example

The setup script writes a commented-free JSON template similar to:

```json
{
  "version": 1,
  "app": {
    "name": "ExampleApp",
    "bundlePath": "/Applications/ExampleApp.app",
    "bundleId": "com.example.app"
  },
  "gui": {
    "requestDir": "~/.local/share/macos-qa-capture/requests",
    "responseDir": "~/.local/share/macos-qa-capture/responses",
    "timeoutSeconds": 180,
    "commands": {
      "install": "printf '%s\\n' '{{installSpec}}' > '{{requestDir}}/install.request'",
      "screenshot": "printf '%s\\n' '{{output}}' > '{{requestDir}}/screenshot.request'",
      "start": "printf '%s\\n' '{{output}}' > '{{requestDir}}/video-start.request'",
      "stop": "printf '%s\\n' '{{output}}' > '{{requestDir}}/video-stop.request'"
    }
  },
  "install": {
    "spec": "",
    "maxAttempts": 1
  },
  "signing": {
    "expectedBundleId": "com.example.app",
    "expectedTeamId": "",
    "expectedAuthorityContains": ""
  },
  "staging": {
    "targetApp": "ExampleApp",
    "hideDesktopIcons": true,
    "hideWidgets": true,
    "enableDoNotDisturb": true,
    "focusEnableCommand": "",
    "focusRestoreCommand": "",
    "quitApps": [],
    "hideApps": []
  },
  "artifacts": {
    "directory": "~/qa-artifacts/macos",
    "contactSheetSamples": 12,
    "deleteRawAfterApprovedUpload": true
  },
  "storage": {
    "uploadCommand": "",
    "linkCommand": "",
    "expiry": "167h",
    "destinationTemplate": ""
  },
  "privacy": {
    "forbiddenContent": [
      "notifications",
      "reminders",
      "device names",
      "account identifiers",
      "email addresses",
      "private dashboards",
      "credentials"
    ]
  }
}
```

The bridge protocol is intentionally command-template based because existing QA LaunchAgents differ. The skill does not require one vendor-specific daemon. Templates support:

| Placeholder | Meaning |
| --- | --- |
| `{{requestDir}}` | Expanded GUI request directory |
| `{{responseDir}}` | Expanded GUI response directory |
| `{{output}}` | Requested artifact output path |
| `{{slug}}` | Sanitized capture slug |
| `{{installSpec}}` | Configured branch/build/install spec |
| `{{appName}}` | Target application process name |
| `{{bundlePath}}` | Installed `.app` path |
| `{{file}}` | Local reviewed artifact being uploaded |
| `{{destination}}` | Rendered storage destination |
| `{{expiry}}` | Requested link lifetime |

Templates execute locally through `/bin/bash -lc`. Quote placeholders in the template when paths can contain spaces. Do not place secrets directly in template strings; call a credential-aware local tool such as `rclone`, `aws`, `gcloud`, or a company uploader.

`focusEnableCommand` and `focusRestoreCommand` are also client-local commands. Configure them to enable a QA Focus/Do Not Disturb mode and restore the operator's prior Focus state. Because Focus automation varies by macOS version and user policy, the public plugin does not hardcode shortcut names or silently assume it changed notification state. If `enableDoNotDisturb` is true, preflight requires an enable command.

## Storage examples

### rclone-backed S3 or R2

Configure the remote with `rclone config` outside the repository. Then set locally:

```json
{
  "storage": {
    "destinationTemplate": "myremote:my-private-bucket/qa/{{date}}/{{basename}}",
    "uploadCommand": "rclone copyto '{{file}}' '{{destination}}'",
    "linkCommand": "rclone link '{{destination}}' --expire '{{expiry}}'",
    "expiry": "167h"
  }
}
```

`167h` is useful for services whose maximum presigned lifetime is seven days; it leaves a one-hour margin. Use a shorter duration if policy requires it.

### AWS CLI

```json
{
  "storage": {
    "destinationTemplate": "s3://my-private-bucket/qa/{{date}}/{{basename}}",
    "uploadCommand": "aws s3 cp '{{file}}' '{{destination}}'",
    "linkCommand": "aws s3 presign '{{destination}}' --expires-in 601200",
    "expiry": "167h"
  }
}
```

### Local only

Leave `uploadCommand` and `linkCommand` empty. The workflow still stages, records, and privacy-reviews evidence, then reports the approved local path without uploading.

## Project files

A project can commit only non-sensitive conventions:

```json
{
  "app": {
    "name": "ExampleApp",
    "bundlePath": "/Applications/ExampleApp.app",
    "bundleId": "com.example.app"
  },
  "install": {
    "spec": "qa"
  }
}
```

Keep machine paths, storage remotes, certificate expectations, device names, hostnames, private app identifiers, and destination buckets in the user config or ignored local file when they should not be public.

## Validation

Run:

```bash
scripts/macos-qa-capture.sh config
scripts/macos-qa-capture.sh preflight
```

`config` prints a redacted summary—not the command templates. `preflight` checks dependencies, writable directories, installed app/signature expectations, and whether upload is configured. It must not print tokens or credential files.
