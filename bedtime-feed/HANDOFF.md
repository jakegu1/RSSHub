# Handoff brief — for Hermes (or any cloud runner)

You are taking over **running and hosting** this tool. It is already built. Do
**not** rebuild it from scratch — clone the branch and run the committed code.
Read `bedtime-feed/README.md` first for the full design.

## What this is

A nightly "bedtime briefing": fetch many RSS/Atom sources → dedupe → an LLM
editor scores/summarizes/clusters them against the reader's taste profile and
filters out adrenaline → renders one static HTML page.

## Where the code is

- Repo: `jakegu1/RSSHub`
- Branch: `claude/personalized-feed-curation-gncmpg`
- Directory: `bedtime-feed/`

## Runtime

- Node 18+ (uses native `fetch`). **Zero install** — no `npm install` needed.
- Entry point:
  - `node bedtime-feed/build.mjs` → writes `bedtime-feed/dist/index.html`
  - `node bedtime-feed/build.mjs --demo` → offline sample data (smoke test, no key/network)
  - `node bedtime-feed/build.mjs --tune` → reads `bedtime-feed/feedback.json`, prints suggested taste-profile edits

## Secrets (read from your own secret store — never commit)

| Env var | Value |
|---|---|
| `DEEPSEEK_API_KEY` | the reader's DeepSeek key |
| `LLM_BASE_URL` (optional) | defaults to `https://api.deepseek.com` |
| `LLM_MODEL` (optional) | defaults to `deepseek-chat` |
| `RSSHUB_BASE` (optional) | your RSSHub instance for Bilibili/Xiaohongshu feeds |

The repo's `.env.local` is gitignored and not present in a fresh clone — inject
these via your environment.

## Tasks for you

1. **Nightly build.** Cron `node bedtime-feed/build.mjs` once each evening
   (reader's local time, ~30 min before bed — confirm timezone). Sources that
   fail are skipped automatically; a build with ≥1 source is fine.
2. **Deliver the result.** Pick one:
   - Serve `bedtime-feed/dist/index.html` at a stable URL the reader opens before bed, **or**
   - Push it: Telegram / email the briefing (render a text version from the same
     curated items, or just send the link).
3. **Close the feedback loop (the upgrade only you can do).**
   - Host a tiny endpoint the page can POST 👍/👎 to, persist as `feedback.json`.
   - Weekly, run `--tune` and send the reader the suggested profile edits to
     approve. Apply approved edits to `feed.config.mjs` and commit.
4. **Tuning is human-in-the-loop.** Never auto-rewrite `feed.config.mjs`’s
   `profile` without the reader approving the `--tune` suggestions.

## Editing knobs

- `feed.config.mjs` → `profile` (taste, in plain language) and `sources` (start broad).
- Each build prints a **per-source hit-rate report** — use it to decide which
  sources to cut. Don't prune sources blindly; cut only consistent noise.

## Do not

- Re-architect or re-derive the pipeline; the design is deliberate (see README).
- Commit any API key, or write secrets into `feed.config.mjs` / the HTML output.
- Auto-narrow the profile from raw thumbs without reader approval.
