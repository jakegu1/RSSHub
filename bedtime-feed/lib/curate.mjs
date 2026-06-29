// The "editor-in-chief" layer: score, summarize, cluster, and evening-filter.
//
// Strategy: one batched LLM call ranks/summarizes the whole candidate pool against
// Jake's taste profile. This is the part that separates a real briefing from "yet
// another RSS reader". If no ANTHROPIC_API_KEY is set, it degrades to a transparent
// keyword heuristic so the pipeline still produces a page end-to-end.

const MODEL = 'claude-opus-4-8';
const ANTHROPIC_VERSION = '2023-06-01';

// ---- Dedupe ---------------------------------------------------------------

const normTitle = (t) =>
    t
        .toLowerCase()
        .replace(/\[[^\]]*\]/g, ' ') // strip [tags]
        .replace(/[^a-z0-9一-鿿]+/g, ' ')
        .trim();

export function dedupe(items) {
    const seen = new Set();
    const out = [];
    for (const it of items) {
        let host = '';
        try {
            const u = new URL(it.link);
            host = u.host + u.pathname;
        } catch {
            host = it.link;
        }
        const keyT = normTitle(it.title);
        if (!keyT) continue;
        if (seen.has(keyT) || seen.has(host)) continue;
        seen.add(keyT);
        seen.add(host);
        out.push(it);
    }
    return out;
}

// ---- LLM curation ---------------------------------------------------------

function systemPrompt(profile) {
    return `You are the editor-in-chief of a single reader's personal "bedtime briefing".
Your job is taste and judgement, not summarizing everything you're handed.

THE READER
${profile.reader}

WHAT EARNS A HIGH SCORE
${profile.likes.map((l) => `- ${l}`).join('\n')}

WHAT TO PUSH DOWN OR DROP
${profile.dislikes.map((l) => `- ${l}`).join('\n')}

SCORING (0-10)
- 9-10: genuinely changes how the reader thinks or builds; must-read tonight.
- 7-8:  high-signal, clearly worth their time.
- 4-6:  fine but skippable.
- 0-3:  noise, clickbait, or off-target. Be willing to give low scores — most items are not great.

EVENING SAFETY
This is read in the last 15 minutes before sleep. Mark eveningSafe=false for anything
alarming, enraging, anxiety-spiking, or pure breaking-news adrenaline — it should be
saved for the morning, not read at bedtime. Calm, enriching, "huh, interesting" items
are eveningSafe=true.

For each item return:
- i: the item's index (integer, unchanged)
- score: 0-10 integer
- reason: ONE short sentence on why it matters to THIS reader (not a generic summary)
- summary: 2-3 sentences capturing the substance, so they can decide to dig in without clicking
- topic: a short cluster label (e.g. "AI", "Crypto", "Markets", "Eng", "Science")
- eveningSafe: boolean

Respond with ONLY a JSON object: {"items":[{...}, ...]}. No prose, no markdown fence.`;
}

function userPrompt(items) {
    const payload = items.map((it, i) => ({
        i,
        source: it.source,
        title: it.title,
        snippet: (it.snippet || '').slice(0, 350),
    }));
    return `Here are ${items.length} candidate items. Score and summarize each.\n\n${JSON.stringify(payload, null, 1)}`;
}

function extractJson(text) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('no JSON in model output');
    return JSON.parse(text.slice(start, end + 1));
}

async function callClaude(system, user) {
    // Prefer the official SDK if it happens to be installed; otherwise fall back
    // to a raw fetch so the prototype runs with zero installs.
    try {
        const mod = await import('@anthropic-ai/sdk');
        const client = new mod.default();
        const msg = await client.messages.create({
            model: MODEL,
            max_tokens: 8000,
            system,
            messages: [{ role: 'user', content: user }],
        });
        return msg.content.find((b) => b.type === 'text')?.text || '';
    } catch (sdkErr) {
        // SDK not present (expected in this zero-install prototype) → raw HTTP.
        if (!/Cannot find package|ERR_MODULE_NOT_FOUND/.test(String(sdkErr))) {
            // a real SDK error (e.g. auth) — surface it
            if (!/fetch/.test(String(sdkErr))) throw sdkErr;
        }
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': ANTHROPIC_VERSION,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: 8000,
                system,
                messages: [{ role: 'user', content: user }],
            }),
        });
        if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return (data.content || []).find((b) => b.type === 'text')?.text || '';
    }
}

// ---- Heuristic fallback (no API key) --------------------------------------

function heuristicScore(profile, items) {
    const likeWords = profile.likes.join(' ').toLowerCase().match(/[a-z]{4,}/g) || [];
    const dislikeWords = ['moon', 'pump', 'shocking', 'outrage', 'you wont believe', 'breaking'];
    const topicFor = (t) => {
        const s = t.toLowerCase();
        if (/\b(ai|llm|gpt|model|agent|neural|ml)\b/.test(s)) return 'AI';
        if (/\b(crypto|bitcoin|ethereum|token|defi)\b/.test(s)) return 'Crypto';
        if (/\b(market|stock|fed|economy|finance)\b/.test(s)) return 'Markets';
        if (/\b(science|physics|space|research)\b/.test(s)) return 'Science';
        return 'Eng';
    };
    return items.map((it, i) => {
        const hay = `${it.title} ${it.snippet}`.toLowerCase();
        let score = 3;
        for (const w of new Set(likeWords)) if (hay.includes(w)) score = Math.min(10, score + 0.6);
        const evil = dislikeWords.some((w) => hay.includes(w));
        if (evil) score -= 3;
        return {
            i,
            score: Math.max(0, Math.round(score)),
            reason: 'Heuristic match on your interests (set ANTHROPIC_API_KEY for real curation).',
            summary: (it.snippet || it.title).slice(0, 240),
            topic: topicFor(hay),
            eveningSafe: !evil,
        };
    });
}

// ---- Public API -----------------------------------------------------------

export async function curate(items, profile) {
    const hasKey = !!process.env.ANTHROPIC_API_KEY;
    let scored;
    let mode;

    if (hasKey) {
        try {
            const text = await callClaude(systemPrompt(profile), userPrompt(items));
            scored = extractJson(text).items;
            mode = 'llm';
        } catch (err) {
            console.warn(`  ⚠ LLM curation failed (${err.message}); using heuristic fallback.`);
            scored = heuristicScore(profile, items);
            mode = 'heuristic (llm-failed)';
        }
    } else {
        scored = heuristicScore(profile, items);
        mode = 'heuristic (no api key)';
    }

    // Merge scores back onto the items by index.
    const byIndex = new Map(scored.map((s) => [s.i, s]));
    let enriched = items.map((it, i) => ({ ...it, ...(byIndex.get(i) || {}) }));

    // Evening filter.
    if (profile.eveningMode) {
        enriched = enriched.filter((it) => it.eveningSafe !== false);
    }

    enriched.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return { items: enriched.slice(0, profile.maxItems), mode };
}
