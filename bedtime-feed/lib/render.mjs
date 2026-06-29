// Renders the curated items into a single self-contained static HTML page.
// No build step, no framework — inline CSS + a few lines of JS for 👍/👎 feedback
// (stored in localStorage for now; wiring it back into the taste profile is the
// natural next iteration).

const esc = (s = '') =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmtDate = (d) => {
    const t = Date.parse(d);
    if (Number.isNaN(t)) return '';
    return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const scoreClass = (s) => (s >= 9 ? 'hot' : s >= 7 ? 'good' : 'ok');

export function render({ items, mode, generatedAt }) {
    const topics = [...new Set(items.map((it) => it.topic || 'General'))];
    const minutes = Math.max(5, Math.round(items.length * 0.8));

    const cards = items
        .map((it, idx) => {
            const id = esc(it.link);
            return `
    <article class="card" data-link="${id}">
      <div class="rank">${idx + 1}</div>
      <div class="body">
        <div class="meta">
          <span class="score ${scoreClass(it.score ?? 0)}">${it.score ?? '–'}</span>
          <span class="chip">${esc(it.topic || 'General')}</span>
          <span class="src">${esc(it.source || '')}${it.date ? ' · ' + fmtDate(it.date) : ''}</span>
        </div>
        <h2><a href="${id}" target="_blank" rel="noopener">${esc(it.title)}</a></h2>
        ${it.reason ? `<p class="why">${esc(it.reason)}</p>` : ''}
        ${it.summary ? `<p class="summary">${esc(it.summary)}</p>` : ''}
        <div class="actions">
          <button class="fb up" data-v="up" aria-label="more like this">👍</button>
          <button class="fb down" data-v="down" aria-label="less like this">👎</button>
        </div>
      </div>
    </article>`;
        })
        .join('\n');

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Jake's Bedtime Briefing</title>
<style>
  :root { --bg:#0f1115; --card:#191c23; --fg:#e8e8ea; --dim:#9aa0ab; --line:#262a33;
          --hot:#ff6b5b; --good:#ffc14d; --ok:#5b8def; --accent:#7aa2ff; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--fg);
         font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif; }
  .wrap { max-width:720px; margin:0 auto; padding:32px 20px 80px; }
  header h1 { font-size:26px; margin:0 0 6px; letter-spacing:-.01em; }
  header .sub { color:var(--dim); font-size:14px; }
  header .topics { margin-top:14px; display:flex; flex-wrap:wrap; gap:6px; }
  header .topics .chip { background:var(--card); border:1px solid var(--line); }
  .chip { font-size:12px; color:var(--dim); padding:2px 8px; border-radius:999px; }
  .card { display:flex; gap:14px; padding:18px 0; border-top:1px solid var(--line); }
  .card:hover .rank { color:var(--accent); }
  .rank { color:var(--line); font-weight:700; font-size:20px; min-width:26px; text-align:right; padding-top:2px; }
  .body { flex:1; min-width:0; }
  .meta { display:flex; align-items:center; gap:8px; margin-bottom:4px; }
  .score { font-weight:700; font-size:13px; min-width:24px; text-align:center; border-radius:6px; padding:1px 6px; color:#0f1115; }
  .score.hot { background:var(--hot); } .score.good { background:var(--good); } .score.ok { background:var(--ok); color:#fff; }
  .src { color:var(--dim); font-size:12px; }
  h2 { font-size:17px; margin:2px 0 6px; line-height:1.35; }
  h2 a { color:var(--fg); text-decoration:none; }
  h2 a:hover { color:var(--accent); text-decoration:underline; }
  .why { color:var(--accent); font-size:13px; margin:0 0 6px; font-style:italic; }
  .summary { color:var(--dim); font-size:14px; margin:0 0 8px; }
  .actions { display:flex; gap:8px; }
  .fb { background:transparent; border:1px solid var(--line); color:var(--dim); border-radius:8px;
        padding:3px 10px; cursor:pointer; font-size:14px; transition:.15s; }
  .fb:hover { border-color:var(--accent); }
  .fb.on { background:var(--accent); border-color:var(--accent); color:#0f1115; }
  footer { margin-top:40px; color:var(--dim); font-size:12px; border-top:1px solid var(--line); padding-top:16px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>🌙 Jake's Bedtime Briefing</h1>
    <div class="sub">${esc(new Date(generatedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))}
      · ${items.length} picks · ≈${minutes} min · curation: ${esc(mode)}</div>
    <div class="topics">${topics.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>
  </header>

  <main>
${cards}
  </main>

  <footer>
    Generated ${esc(new Date(generatedAt).toLocaleString())}.
    👍/👎 are saved in your browser — feeding them back into the taste profile is the next iteration.
  </footer>
</div>

<script>
  const KEY = 'bedtime-feedback';
  const store = JSON.parse(localStorage.getItem(KEY) || '{}');
  for (const card of document.querySelectorAll('.card')) {
    const link = card.dataset.link;
    if (store[link]) card.querySelector('.fb.' + store[link])?.classList.add('on');
    card.querySelectorAll('.fb').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = btn.dataset.v;
        card.querySelectorAll('.fb').forEach((b) => b.classList.remove('on'));
        if (store[link] === v) { delete store[link]; }
        else { store[link] = v; btn.classList.add('on'); }
        localStorage.setItem(KEY, JSON.stringify(store));
      });
    });
  }
</script>
</body>
</html>`;
}
