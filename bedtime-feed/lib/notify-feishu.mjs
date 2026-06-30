// Optional Feishu (Lark) push: posts a compact text briefing to a custom-bot
// webhook. No-op unless FEISHU_WEBHOOK is set, so it's safe to leave wired in.
//
// The *project* sends this itself (from the nightly job) — it is not Hermes doing
// daily work. Supports Feishu's optional signature (set FEISHU_SECRET if your bot
// has "signature verification" enabled).

import crypto from 'node:crypto';

function sign(secret, timestamp) {
    // Feishu spec: HMAC-SHA256 with key = `${timestamp}\n${secret}`, empty message.
    const stringToSign = `${timestamp}\n${secret}`;
    return crypto.createHmac('sha256', stringToSign).update('').digest('base64');
}

function buildText({ items, url, generatedAt }) {
    const date = new Date(generatedAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    const minutes = Math.max(5, Math.round(items.length * 0.8));
    const lines = items.slice(0, 8).map((it, i) => `${i + 1}. [${it.score ?? '–'}] ${it.title} — ${it.topic || ''}`);
    return [
        `🌙 睡前简报 · ${date}`,
        `${items.length} 条精选 · ≈${minutes} 分钟`,
        ...(url ? [url] : []),
        '',
        ...lines,
        '',
        ...(url ? [`👉 完整简报: ${url}`] : []),
    ].join('\n');
}

export async function notifyFeishu({ items, url = '', generatedAt = Date.now() }) {
    const webhook = process.env.FEISHU_WEBHOOK;
    if (!webhook) return { skipped: true };
    if (!items?.length) return { skipped: true };

    const body = { msg_type: 'text', content: { text: buildText({ items, url, generatedAt }) } };

    const secret = process.env.FEISHU_SECRET;
    if (secret) {
        const ts = Math.floor(Date.now() / 1000).toString();
        body.timestamp = ts;
        body.sign = sign(secret, ts);
    }

    const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    // Feishu returns { code: 0, ... } on success.
    if (data.code && data.code !== 0) throw new Error(`Feishu code ${data.code}: ${data.msg || ''}`);
    return { ok: true };
}
