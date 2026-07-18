<!-- Title: `add: <skill-name> — <one-line description>` or `fix: <skill-name> — <one-line description>` -->

## What this PR does

<!-- Summarize the change. For a new skill, link to its plugin README. -->

## Checklist

- [ ] Plugin lives at `plugins/<name>/`
- [ ] Plugin directory, manifest name, and skill directory use the same name
- [ ] `.claude-plugin/plugin.json` validates with `npm run validate`
- [ ] Marketplace name, version, and description match the plugin manifest
- [ ] Plugin README documents installation, usage, and required permissions
- [ ] Network, filesystem, shell, credentials, and state changes have clear safety gates
- [ ] Codex prompt exists when the manifest declares Codex support
- [ ] Existing plugin changes include a version bump
- [ ] `npm run sync` and `npm run catalog` generated committed artifacts

## Testing

<!-- List exact validation commands and any agent-specific runtime checks. -->
