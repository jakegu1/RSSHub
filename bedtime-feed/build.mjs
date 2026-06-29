#!/usr/bin/env node
// Orchestrator: fetch all sources → dedupe → curate (LLM) → render static page.
// Run with: node bedtime-feed/build.mjs   (zero install required)

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { sources, profile } from './feed.config.mjs';
import { fetchFeed } from './lib/rss.mjs';
import { dedupe, curate } from './lib/curate.mjs';
import { render } from './lib/render.mjs';
import { sampleItems } from './lib/sample-items.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DEMO = process.argv.includes('--demo');

// Small concurrency limiter so we don't hammer all feeds at once.
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

async function main() {
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

    // Cap the candidate pool sent to the LLM to keep the call cheap.
    const pool = deduped.slice(0, 50);
    console.log(`  Curating top ${pool.length} candidates...`);
    const { items, mode } = await curate(pool, profile);
    console.log(`  → ${items.length} made the cut (mode: ${mode})`);

    const html = render({ items, mode, generatedAt: Date.now() });
    const outPath = join(here, 'dist', 'index.html');
    await writeFile(outPath, html, 'utf8');
    console.log(`\n  ✅ Wrote ${outPath}\n`);
}

main().catch((err) => {
    console.error('\nBuild failed:', err);
    process.exit(1);
});
