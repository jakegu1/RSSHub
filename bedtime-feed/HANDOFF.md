# How this project runs (and Hermes's role)

This is an **autonomous project**, not a daily chore for Hermes. It runs itself on
GitHub Actions and publishes to GitHub Pages. Nobody runs commands by hand.

```
GitHub Actions (nightly cron)
  → node bedtime-feed/build.mjs      (fetch → dedupe → DeepSeek curate → render)
  → deploy bedtime-feed/dist to GitHub Pages   (fixed URL, opened before bed)
  → POST a compact briefing to Feishu          (the project notifies you itself)
```

Workflow: `.github/workflows/bedtime-feed.yml`. Design: `bedtime-feed/README.md`.

## One-time setup (all from the GitHub mobile/web UI)

1. **Secrets** — Repo → Settings → Secrets and variables → Actions:
   - `DEEPSEEK_API_KEY` (required)
   - `FEISHU_WEBHOOK` (optional — custom-bot webhook URL for the push)
   - `FEISHU_SECRET` (optional — only if the bot has signature verification on)
2. **Pages** — Repo → Settings → Pages → Source: **GitHub Actions**.
3. **Activate the cron** — scheduled runs only fire from the **default branch**,
   so merge `claude/personalized-feed-curation-gncmpg` into main to turn on the
   nightly schedule. Before that, runs are manual (Actions → Run workflow, or API).
4. **Timezone** — edit the `cron:` line in the workflow to ~30 min before bedtime
   (it's in UTC; `30 14 * * *` = 22:30 UTC+8).

## Roles — who does what

| Role | Owner | Notes |
|---|---|---|
| **Write / change code** | Claude Code (me) | Hermes's base model is weaker at code — don't ask it to edit the pipeline. Want a new source, a prompt tweak, a feature? Tell Claude Code; it commits to the branch. |
| **Run the daily feed** | GitHub Actions | Fully autonomous once merged. The project sends its own Feishu message — Hermes is not in the daily path. |
| **Deliver** | GitHub Pages + Feishu | Pages = the page; Feishu = the nightly ping with the link. |
| **Oversee** | Hermes (optional) | The good fit for Hermes — see below. |

## What Hermes is genuinely good for here (no coding required)

- **Monitor & alert.** Poll the GitHub Actions API for this workflow; if a run
  fails (bad key, source outage), send *you* a Feishu message. Watching, not doing.
- **On-demand trigger.** Kick a fresh build via the API
  (`POST /repos/jakegu1/RSSHub/actions/workflows/bedtime-feed.yml/dispatches`,
  `ref` = the active branch) when you say "给我今天的简报" — useful before the
  branch is merged, or for an extra mid-day run.
- **Relay your edits to Claude Code.** When you tell Hermes "少点币价新闻", it can
  open an issue / message Claude Code to make the change, rather than editing code itself.

## Hard rules

- Do **not** rebuild or re-architect the pipeline — run the committed code.
- Do **not** commit any API key, or write secrets into `feed.config.mjs` or the HTML.
- Do **not** auto-rewrite the taste `profile` from raw 👍/👎 — `--tune` only
  *suggests* edits; a human approves them.
