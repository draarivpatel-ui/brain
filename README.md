# Brain

Memory for your coding agents. Brain reads your Claude Code history on your own computer, so you can browse and search every past session. Separate from the Flisk CLI site.

```bash
node bin/brain.mjs list 10            # latest sessions
node bin/brain.mjs search token fix   # find an old fix
node bin/brain.mjs serve              # viewer at http://localhost:4711 (this computer only)
```

Works with Node or Bun. Reads `~/.claude/projects`, never changes it, hides keys and tokens.

- `lib/` reader, redaction, index, server
- `app/` the viewer
- `skill/brain/SKILL.md` Claude Code skill
- `landing/` landing page

Not built yet: sharing a session, teams, other agents (Codex, Cursor).
