# Repository guide for agents

The published skill lives in `skills/paperfold/`. Its `SKILL.md` name, parent directory, Codex prompt, and README install command use the same slug.

## Install requests

1. Use the user's target agent and scope. When unspecified, use the current agent and current project. Follow the install command in [README.md](README.md) for a supported host, or use the host's native installer with the complete skill directory.
2. Confirm that the resolved install directory includes `SKILL.md`, `assets/turning-garden/index.html`, and `scripts/render.cjs`. Report the actual installed path and invocation name. If the destination already contains this skill, check the installed source before replacing it.
3. Install browser or video dependencies when the user asks to render a scene. A skill install needs the skill directory and whatever installer the host uses.

## Development

Run `node scripts/check-skill.cjs` from the repository root. For rendering changes also render a still and a short MP4 following [the production guide](skills/paperfold/references/production.md). Keep the offline demo's assets relative so copying the skill folder keeps it usable.
