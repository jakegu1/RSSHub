// The "editor-in-chief" layer: score, summarize, cluster, and evening-filter.
//
// Uses an OpenAI-compatible chat endpoint (DeepSeek by default). One batched call
// ranks/summarizes the whole candidate pool against Jake's taste profile — this is
// what separates a real briefing from "yet another RSS reader". With no API key it
// degrades to a transparent keyword heuristic so the pipeline still produces a page.

// Read lazily (NOT at module top): ESM hoists `import`s above build.mjs's
// loadEnv() call, so reading env at import time would miss .env.local.
const getLLM = () => ({
    baseUrl: (process.env.LLM_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, ''),
    model: process.env.LLM_MODEL || 'deepseek-chat',
    key: process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || '',
});

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

// ---- Shared OpenAI-compatible call ----------------------------------------

async function chat(system, user, { json = true, temperature = 0.3, maxTokens = 8000 } = {}) {
    const LLM = getLLM();
    const res = await fetch(`${LLM.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${LLM.key}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            model: LLM.model,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
            ],
            temperature,
            max_tokens: maxTokens,
            stream: false,
            ...(json ? { response_format: { type: 'json_object' } } : {}),
        }),
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
}

function extractJson(text) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('no JSON in model output');
    return JSON.parse(text.slice(start, end + 1));
}

// ---- Curation prompt ------------------------------------------------------

function systemPrompt(profile) {
    return `You are the editor-in-chief of a single reader's personal "bedtime briefing".
Your job is taste and judgement, not summarizing everything you're handed. Respond in JSON.

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
alarming, enraging, anxiety-spiking, or pure breaking-news adrenaline — save it for the
morning. Calm, enriching, "huh, interesting" items are eveningSafe=true.

Write summaries in the same language as the item's title (Chinese title -> Chinese summary).

For each item return:
- i: the item's index (integer, unchanged)
- score: 0-10 integer
- reason: ONE short sentence on why it matters to THIS reader (not a generic summary)
- summary: 2-3 sentences capturing the substance so they can decide without clicking
- topic: a short cluster label (e.g. "AI", "Crypto", "Markets", "Eng", "Science", "Product")
- eveningSafe: boolean

Respond with ONLY a JSON object: {"items":[{...}, ...]}.`;
}

function userPrompt(items) {
    const payload = items.map((it, i) => ({
        i,
        source: it.source,
        title: it.title,
        snippet: (it.snippet || '').slice(0, 350),
    }));
    return `Here are ${items.length} candidate items. Score and summarize each. Return JSON.\n\n${JSON.stringify(payload)}`;
}

// ---- Heuristic fallback (no API key) --------------------------------------

function heuristicScore(profile, items) {
    const likeWords = profile.likes.join(' ').toLowerCase().match(/[a-z]{4,}/g) || [];
    const dislikeWords = ['moon', 'pump', 'shocking', 'outrage', 'you wont believe', 'breaking', '震惊', '崩盘'];
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
            reason: 'Heuristic match on your interests (set DEEPSEEK_API_KEY for real curation).',
            summary: (it.snippet || it.title).slice(0, 240),
            topic: topicFor(hay),
            eveningSafe: !evil,
        };
    });
}

// ---- Public API -----------------------------------------------------------

export async function curate(items, profile) {
    const LLM = getLLM();
    let scored;
    let mode;

    if (LLM.key) {
        try {
            const text = await chat(systemPrompt(profile), userPrompt(items));
            scored = extractJson(text).items;
            mode = `llm (${LLM.model})`;
        } catch (err) {
            console.warn(`  ⚠ LLM curation failed (${err.message}); using heuristic fallback.`);
            scored = heuristicScore(profile, items);
            mode = 'heuristic (llm-failed)';
        }
    } else {
        scored = heuristicScore(profile, items);
        mode = 'heuristic (no api key)';
    }

    const byIndex = new Map(scored.map((s) => [s.i, s]));
    // Whole scored pool — used for the per-source hit-rate report.
    const scoredPool = items.map((it, i) => ({ ...it, ...(byIndex.get(i) || { score: 0, eveningSafe: true }) }));

    let finalists = scoredPool.slice();
    if (profile.eveningMode) finalists = finalists.filter((it) => it.eveningSafe !== false);
    finalists.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return { items: finalists.slice(0, profile.maxItems), scoredPool, mode };
}

// ---- Feedback distillation (the smart narrowing loop) ---------------------
// Turns accumulated 👍/👎 into *proposed edits* to the taste profile, which you
// approve and paste into feed.config.mjs. High-bandwidth, interpretable, human-in-loop.

export async function tuneFromFeedback(profile, feedback) {
    if (!getLLM().key) throw new Error('No API key — set DEEPSEEK_API_KEY to use --tune.');
    const up = feedback.filter((f) => f.vote === 'up');
    const down = feedback.filter((f) => f.vote === 'down');

    const system = `You refine a reader's "taste profile" for a personalised feed, based on their thumbs feedback.
Propose concrete DELTAS to the profile's likes/dislikes — additions, removals, or rewordings — that would have
ranked the upvoted items higher and the downvoted items lower. Be specific and conservative: suggest a handful of
sharp edits, not a rewrite. Respond in JSON.`;

    const user = `CURRENT PROFILE
likes:
${profile.likes.map((l) => `- ${l}`).join('\n')}
dislikes:
${profile.dislikes.map((l) => `- ${l}`).join('\n')}

UPVOTED (more like this):
${up.map((f) => `- [${f.topic || '?'}] ${f.title}`).join('\n') || '(none)'}

DOWNVOTED (less like this):
${down.map((f) => `- [${f.topic || '?'}] ${f.title}`).join('\n') || '(none)'}

Return JSON:
{"add_likes":[...], "add_dislikes":[...], "remove":[...], "reword":[{"from":"...","to":"..."}], "notes":"one-line summary"}`;

    const text = await chat(system, user, { temperature: 0.4, maxTokens: 1500 });
    return extractJson(text);
}
