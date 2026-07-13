# Signing and Aqua-session troubleshooting

## Why SSH capture fails

A process launched by SSH normally runs in a background login session, not the logged-in macOS Aqua GUI session. Screen Recording and Accessibility authorization are tied to the responsible GUI process/context. A successful SSH connection therefore does not imply that `screencapture`, AppleScript UI driving, or app launch will work correctly.

Use SSH only to write a request that a per-user LaunchAgent consumes inside the GUI session. The LaunchAgent performs:

- signed QA installation;
- screenshots;
- video start/stop/finalization;
- optionally UI-driving operations that need Accessibility.

The user must be logged in, the GUI session active, and Screen Recording granted to the actual capture helper once.

## LaunchAgent bridge requirements

The generic skill does not prescribe one request schema. A valid bridge must provide:

1. request and response/status directories owned by the GUI user;
2. atomic request creation (write temporary file, then rename when possible);
3. unique request IDs or output paths so stale responses cannot be mistaken for success;
4. bounded waits with an explicit failure response;
5. logs that omit secrets and passwords;
6. one recording at a time;
7. cleanup of stale PID/request files;
8. no capture while the screen is locked or no GUI user is logged in.

Configure command templates in the client-local extension to match the bridge.

## Signed QA installation

When TCC continuity matters, preserve the intended application identity:

- stable bundle identifier;
- intended signing team/authority;
- correctly signed nested frameworks, helpers, and XPC services;
- no ad-hoc replacement unless the project explicitly accepts losing permissions;
- strict post-install verification before launch.

Recommended checks:

```bash
codesign --verify --deep --strict --verbose=2 /Applications/ExampleApp.app
codesign -dv --verbose=4 /Applications/ExampleApp.app 2>&1
mdls -name kMDItemCFBundleIdentifier /Applications/ExampleApp.app
```

Configure expected bundle/team/authority values locally and let `verify-signature` compare them.

## Keychain failure classification

### `User interaction is not allowed`

The signing process cannot display or satisfy the required Keychain interaction in its current session. Do not retry in a loop. Move signing into the GUI LaunchAgent or perform a one-time local authorization according to the project's security policy.

### `errSecInternalComponent`

Often indicates inaccessible private-key material, a locked Keychain, ACL/user-presence constraints, or a signing process running from the wrong session. Inspect Keychain state and identity availability locally. Repeated `codesign` retries rarely fix it and may trigger repeated prompts.

### Identity appears, signing still prompts

Finding a certificate does not prove the private key is accessible. The certificate and private key must be paired, and the private-key access control must permit the intended signing path. Prefer one-time approval or a dedicated revocable QA identity/keychain over broad unattended access to a production signing key.

### Wrong bundle/team after install

Stop. Do not launch and hope permissions persist. Verify that the configured installer used the intended signing identity and did not change the bundle identifier or replace nested signatures inconsistently.

### Nested code verification failure

Run strict verification and inspect the failing nested path. Fix the build/signing pipeline. Do not apply a top-level signature over incorrectly signed nested code as a shortcut.

## Prompt-storm prevention

The install helper must default to one attempt. A second attempt is allowed only after the failure has been classified and a concrete state changed—for example, the user unlocked the Keychain or approved one local prompt.

Never:

- repeatedly invoke `codesign` while a prompt is open;
- send passwords through SSH, chat, files, or command arguments;
- choose “allow all applications” merely to make automation pass;
- weaken Keychain or signing policy without explicit owner approval;
- claim a build is signed because the certificate is installed.

When manual action is required, report:

1. the exact error category;
2. the minimal local action;
3. what access that action grants;
4. whether it is one-time or persistent;
5. how to revoke it.

Then stop until the user completes the action.
