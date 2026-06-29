# 🌙 Bedtime Briefing

A personal, high-signal "last 15 minutes before sleep" feed. Pulls from RSS/Atom
sources (Hacker News, Reddit, YouTube, Bilibili via RSSHub, news, …), lets an LLM
act as **editor-in-chief** — scoring, summarizing, clustering, and filtering out
adrenaline before bed — and renders a single static HTML page.

The point isn't aggregation (RSSHub already solves that). It's **curation**: one
ranked, summarized briefing you finish, instead of an infinite scroll.

## Pipeline

```
sources (RSS/Atom) → dedupe → LLM curate (score · summarize · cluster · evening-filter) → static HTML
```

| File | Role |
|------|------|
| `feed.config.mjs` | **Edit this.** Your taste profile + source list. |
| `lib/rss.mjs` | Dependency-free RSS/Atom fetch + parse. |
| `lib/curate.mjs` | The editor-in-chief: batched Claude call, with a heuristic fallback. |
| `lib/render.mjs` | Self-contained HTML page (👍/👎 feedback in localStorage). |
| `build.mjs` | Orchestrator → writes `dist/index.html`. |

## Run

Zero install, just Node 18+ (uses native `fetch`):

```bash
# Offline preview with sample data (no network, no key):
node bedtime-feed/build.mjs --demo

# Real run — fetch live feeds. Set a key for real LLM curation:
export ANTHROPIC_API_KEY=sk-ant-...
node bedtime-feed/build.mjs

# Open the result:
open bedtime-feed/dist/index.html
```

Without `ANTHROPIC_API_KEY` it falls back to a transparent keyword heuristic so the
page still builds. With a key it uses `claude-opus-4-8` to score and summarize
against your profile.

> **Note on this repo's web sessions:** outbound HTTP to the open internet is gated
> by the environment's network policy, so live fetching may 403 here. It works from
> your own machine, or from a session created with a broader network policy. The
> `--demo` mode always works.

## Make it a nightly habit

- **Schedule it.** A cron job (or GitHub Action) runs `build.mjs` every evening.
- **Publish `dist/index.html`** to Vercel/Netlify/GitHub Pages → a fresh page each night at a stable URL you open before bed.
- **RSSHub for platform feeds.** Bilibili / Xiaohongshu / etc. need an RSSHub
  instance — point `RSSHUB_BASE` at your own (this very repo) for reliability.

## Natural next iterations

1. **Feedback loop** — persist 👍/👎 and fold them back into the taste profile so it learns.
2. **Topic sections + a separate "morning" page** for the adrenaline items held back from bedtime.
3. **Better dedupe / clustering** — merge the same story from ten outlets into one entry.
4. **Push delivery** — email the briefing (or a Telegram message) at a set time instead of pulling.
