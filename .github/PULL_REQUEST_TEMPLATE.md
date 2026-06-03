<!-- Title format: `add: <skill-name> — <one-line description>` or `fix: <skill-name> — …` -->

## What this PR does

<!-- One paragraph. If you're adding a skill, link to its README. -->

## Checklist

- [ ] Skill directory lives at `skills/<name>/` and `<name>` matches `manifest.yml`
- [ ] `manifest.yml` validates (`npm run validate`)
- [ ] `README.md` explains what the skill does and how to install it
- [ ] Each agent listed as `supported: true` has its entry file present
- [ ] I bumped `version` if I changed an existing skill
- [ ] If the skill touches network/filesystem/shell, I declared it in `permissions`

## Testing

<!-- How did you verify the skill works? Which agent(s)? -->
