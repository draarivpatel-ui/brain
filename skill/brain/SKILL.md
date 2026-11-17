---
name: brain
description: Search and open the user's past Claude Code sessions. Use when the user asks "how did I fix X last time", "what did we decide about Y", "find the session where we did Z", or wants to look back at earlier work.
---

# Brain

Brain reads the user's Claude Code history on this computer (`~/.claude/projects`). Nothing leaves the machine. Secrets such as API keys and tokens are hidden in what it prints.

## Find an earlier session

Run from the Brain folder (or use `brain` if it is on the PATH):

```bash
node bin/brain.mjs search <words>   # every word must appear in one message
node bin/brain.mjs list 10          # the 10 most recent sessions
node bin/brain.mjs serve            # browse and search in a browser at http://localhost:4711
```

Each search hit shows the session title, project, date, and a short snippet.

## How to answer

1. Turn the question into 2 to 4 distinctive words (an error text, a file name, a tool name). Avoid common words.
2. Run `search`. If there are no hits, try fewer or different words.
3. Tell the user which session and date the answer came from, and quote the relevant snippet. Do not invent details the snippet does not show.
4. For the full conversation, point the user to `brain serve` and the session link.
