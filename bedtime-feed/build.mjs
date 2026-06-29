#!/usr/bin/env node
// Orchestrator. Modes:
//   node bedtime-feed/build.mjs           fetch live sources -> curate -> dist/index.html
//   node bedtime-feed/build.mjs --demo    offline sample data (no network/key)
//   node bedtime-feed/build.mjs --tune    distill feedback.json -> suggested profile edits

import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { loadEnv } from './lib/env.mjs';
loadEnv(); // pull .env.local into process.env before anything reads keys

import { sources, profile } from './feed.config.mjs';
import { fetchFeed } from './lib/rss.mjs';
import { dedupe, curate, tuneFromFeedback } from './lib/curate.mjs';
import { render } from './lib/render.mjs';
import { sampleItems } from './lib/sample-items.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DEMO = process.argv.includes('--demo');
const TUNE = process.argv.includes('--tune');

async function mapLimit(arr, limit, fn) {
    const out = [];
    let i = 0;
    const workers = Array.from({ length: Math.min(limit, arr.length) }, async () => {
        while (i < arr.length) {
            const idx = i++;
            out[idx] = await fn(arr[idx]);
        }
    });
    await Promise.all(workers);
    return out;
}

// ---- --tune: turn feedback into proposed profile edits --------------------

async function runTune() {
    let feedback;
    try {
        feedback = JSON.parse(await readFile(join(here, 'feedback.json'), 'utf8'));
    } catch {
        console.error('\n  No feedback.json found. Open your briefing, vote 👍/👎, click "Export feedback",');
        console.error('  and save the download as bedtime-feed/feedback.json — then run --tune again.\n');
        process.exit(1);
    }
    console.log(`\n🎛  Distilling ${feedback.length} feedback votes into profile suggestions...\n`);
    const sugg = await tuneFromFeedback(profile, feedback);
    const show = (label, arr) => arr?.length && console.log(`  ${label}:\n${arr.map((x) => `    + ${typeof x === 'string' ? x : `"${x.from}" → "${x.to}"`}`).join('\n')}`);
    show('Add to likes', sugg.add_likes);
    show('Add to dislikes', sugg.add_dislikes);
    show('Remove', sugg.remove);
    show('Reword', sugg.reword);
    if (sugg.notes) console.log(`\n  Note: ${sugg.notes}`);
    console.log('\n  → Review these and edit feed.config.mjs yourself (you stay in control).\n');
}

// ---- per-source hit-rate report -------------------------------------------

function reportHitRate(scoredPool, finalLinks) {
    const stats = new Map();
    for (const it of scoredPool) {
        const s = stats.get(it.source) || { n: 0, sum: 0, cut: 0 };
        s.n++;
        s.sum += it.score ?? 0;
        if (finalLinks.has(it.link)) s.cut++;
        stats.set(it.source, s);
    }
    const rows = [...stats.entries()]
        .map(([src, s]) => ({ src, n: s.n, avg: s.sum / s.n, cut: s.cut }))
        .sort((a, b) => b.avg - a.avg);
    console.log('\n  Per-source hit-rate (which sources earn their place):');
    for (const r of rows) {
        console.log(`    ${r.avg.toFixed(1).padStart(4)} avg · ${String(r.cut).padStart(2)}/${String(r.n).padEnd(2)} made cut   ${r.src}`);
    }
}

// ---- main build -----------------------------------------------------------

async function runBuild() {
    let raw;
    if (DEMO) {
        console.log('\n🌙 Building bedtime briefing — DEMO mode (offline sample data)\n');
        raw = sampleItems;
    } else {
        console.log(`\n🌙 Building bedtime briefing — ${sources.length} sources\n`);
        const results = await mapLimit(sources, 5, async (src) => {
            const r = await fetchFeed(src);
            const tag = r.ok ? `✓ ${r.items.length}` : `✗ ${r.error}`;
            console.log(`  ${tag.padEnd(28)} ${src.name}${src.fragile && !r.ok ? ' (optional)' : ''}`);
            return r;
        });
        raw = results.flatMap((r) => r.items);
    }

    const deduped = dedupe(raw);
    console.log(`\n  Collected ${raw.length} items → ${deduped.length} after dedupe`);
    if (deduped.length === 0) {
        console.error('\n  No items fetched (network blocked?). Nothing to curate.\n');
        process.exit(1);
    }

    const pool = deduped.slice(0, 60); // cap candidates sent to the LLM
    console.log(`  Curating top ${pool.length} candidates...`);
    const { items, scoredPool, mode } = await curate(pool, profile);
    console.log(`  → ${items.length} made the cut (mode: ${mode})`);

    reportHitRate(scoredPool, new Set(items.map((it) => it.link)));

    const html = render({ items, mode, generatedAt: Date.now() });
    const outPath = join(here, 'dist', 'index.html');
    await writeFile(outPath, html, 'utf8');
    console.log(`\n  ✅ Wrote ${outPath}\n`);
}

(TUNE ? runTune() : runBuild()).catch((err) => {
    console.error('\nFailed:', err);
    process.exit(1);
});
