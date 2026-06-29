// Minimal, dependency-free RSS 2.0 + Atom parser.
//
// This is deliberately small (regex-based) so the prototype runs with bare
// `node` and zero installs. For production you'd swap in `rss-parser` (already
// a RSSHub dependency) — the shape returned here matches its `items` closely.

const decodeEntities = (s = '') =>
    s
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&');

const stripHtml = (s = '') =>
    decodeEntities(s)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const firstTag = (block, tag) => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
    return m ? decodeEntities(m[1]).trim() : '';
};

// Atom links look like <link rel="alternate" href="..."/>; prefer the alternate.
const atomLink = (block) => {
    const links = [...block.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
    const pick =
        links.find((l) => /rel=["']?alternate/i.test(l)) ||
        links.find((l) => !/rel=/i.test(l)) ||
        links[0] ||
        '';
    const href = pick.match(/href=["']([^"']+)["']/i);
    return href ? decodeEntities(href[1]).trim() : '';
};

export function parseFeed(xml) {
    const items = [];
    const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);

    if (isAtom) {
        for (const m of xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)) {
            const b = m[0];
            items.push({
                title: stripHtml(firstTag(b, 'title')),
                link: atomLink(b),
                snippet: stripHtml(firstTag(b, 'summary') || firstTag(b, 'content')).slice(0, 500),
                date: firstTag(b, 'published') || firstTag(b, 'updated') || '',
            });
        }
    } else {
        for (const m of xml.matchAll(/<item[\s\S]*?<\/item>/gi)) {
            const b = m[0];
            items.push({
                title: stripHtml(firstTag(b, 'title')),
                link: stripHtml(firstTag(b, 'link')),
                snippet: stripHtml(firstTag(b, 'content:encoded') || firstTag(b, 'description')).slice(0, 500),
                date: firstTag(b, 'pubDate') || firstTag(b, 'dc:date') || '',
            });
        }
    }

    return items.filter((it) => it.title && it.link);
}

// Fetch + parse a single feed with a timeout. Never throws — returns [] on failure
// so one dead source can't take down the whole briefing.
export async function fetchFeed(source, { timeoutMs = 12000 } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(source.url, {
            signal: ctrl.signal,
            headers: {
                // Reddit and some CDNs 403 a default agent.
                'user-agent': 'Mozilla/5.0 (compatible; BedtimeFeed/0.1; +https://github.com/DIYgod/RSSHub)',
                accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const xml = await res.text();
        const items = parseFeed(xml).map((it) => ({ ...it, source: source.name, platform: source.platform }));
        return { ok: true, items };
    } catch (err) {
        return { ok: false, items: [], error: String(err?.message || err) };
    } finally {
        clearTimeout(timer);
    }
}
