# 🌙 Bedtime Briefing

A personal, high-signal "last 15 minutes before sleep" feed. Pulls from many
RSS/Atom sources (Hacker News, Reddit, YouTube, Bilibili via RSSHub, news, …),
lets an LLM act as **editor-in-chief** — scoring, summarizing, clustering, and
filtering out adrenaline before bed — and renders one static HTML page.

The point isn't aggregation (RSSHub already solves that). It's **curation**: one
ranked, summarized briefing you finish, instead of an infinite scroll.

## The strategy: don't narrow sources, narrow taste

With an LLM scoring every item nightly, **source breadth is cheap** — more sources
just means more potential gems, because the editor filters per-item regardless. So:

- **Sources: start broad, stay broad.** Only cut a source the per-source hit-rate
  report (printed each build) shows is *consistently* noise.
- **Taste: steer in plain language.** Edit `profile` in `feed.config.mjs` — it's
  your highest-bandwidth control and takes effect the next build. Far faster than
  hoping thumbs-feedback slowly shifts a weight.
- **Feedback: telemetry, not a filter.** Your 👍/👎 accumulate, then `--tune`
  distills them into *suggested edits to your profile* that you approve. High
  bandwidth, interpretable, human-in-the-loop.

## Pipeline

```
many sources (RSS/Atom) → dedupe → LLM curate (score · summarize · cluster · evening-filter) → static HTML
                                                        ▲
                              feedback.json ── --tune ──┘  (suggests profile edits)
```

| File | Role |
|------|------|
| `feed.config.mjs` | **Edit this.** Your taste profile + source list. |
| `lib/rss.mjs` | Dependency-free RSS/Atom fetch + parse. |
| `lib/curate.mjs` | Editor-in-chief: batched DeepSeek call + heuristic fallback + `--tune`. |
| `lib/render.mjs` | Self-contained HTML page (👍/👎 + export feedback). |
| `lib/env.mjs` | Loads `.env.local` (your key) — gitignored. |
| `build.mjs` | Orchestrator. |

## Setup

Your key lives in `bedtime-feed/.env.local` (gitignored, already created):

```
LLM_PROVIDER=deepseek
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
DEEPSEEK_API_KEY=sk-...
```

DeepSeek is OpenAI-compatible, so `LLM_BASE_URL`/`LLM_MODEL` let you point at any
compatible endpoint later without code changes.

## Run

Zero install, just Node 18+ (uses native `fetch`):

```bash
node bedtime-feed/build.mjs          # fetch live feeds → curate with DeepSeek → dist/index.html
node bedtime-feed/build.mjs --demo   # offline preview with sample data (no network/key)
node bedtime-feed/build.mjs --tune   # turn feedback.json into suggested profile edits
open bedtime-feed/dist/index.html
```

The feedback loop: open the page → vote 👍/👎 → click **Export feedback** → save
as `bedtime-feed/feedback.json` → `node build.mjs --tune` → paste the suggestions
you like into `feed.config.mjs`.

> **Network note:** RSSHub's web sessions restrict outbound HTTP by network policy,
> so live fetching and the DeepSeek call may `403` *inside this repo's web session*.
> Both work from your own machine. `--demo` always works.

## Runs itself (GitHub Actions → Pages → Feishu)

This ships as an **autonomous project** — no manual command-running:

- `.github/workflows/bedtime-feed.yml` builds nightly on GitHub's runners (full
  internet), deploys `dist/` to **GitHub Pages**, and pushes a compact briefing to
  **Feishu** (the project notifies you itself).
- Setup + Hermes's overseer role: see `HANDOFF.md`.
- Extra delivery env vars: `FEISHU_WEBHOOK`, `FEISHU_SECRET` (optional),
  `SITE_URL` (the Action sets this to the Pages URL for the Feishu link).
- **RSSHub for platform feeds** (Bilibili / Xiaohongshu): point `RSSHUB_BASE` at
  your own instance for reliability.

## Next iterations

1. **Persist feedback automatically** (a tiny endpoint or commit-on-export) so `--tune` always has fresh data.
2. **A separate "morning" page** for the adrenaline items held back from bedtime.
3. **Smarter clustering** — merge the same story from ten outlets into one entry.
4. **Push delivery** — email or Telegram the briefing at a set time instead of pulling.
