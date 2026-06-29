// Jake's Bedtime Briefing — configuration
//
// Two parts:
//   1. `profile` — who you are and what "high quality" means. The LLM editor uses
//      this verbatim. Edit it in plain language; changes take effect the next build.
//      This is your steering wheel — far higher-bandwidth than thumbs feedback.
//   2. `sources` — start BROAD. The LLM scores every item nightly, so breadth is
//      cheap: more sources = more potential gems, not more noise. Use the per-source
//      hit-rate report (printed each build) to decide what to actually cut.

const RSSHUB = process.env.RSSHUB_BASE || 'https://rsshub.app';

export const profile = {
    reader: 'Jake — builds software, thinks about AI/agents, follows tech, markets and crypto. Wants to learn and to build, not to doomscroll.',

    // Start broad across the topics you care about. Tighten the wording over time
    // (the `--tune` command turns your 👍/👎 into suggested edits here).
    likes: [
        'AI / LLMs / agents — research, model releases, serious engineering writeups (not hype threads)',
        'Deep technical or first-principles explanations over news-of-the-news',
        'Tech industry signal: real product launches, infra, developer tooling, hard postmortems',
        'Finance & markets with an analytical angle (mechanisms, data), not headline reactions',
        'Crypto when substantive — protocol design, infra, regulation — not price/pump talk',
        'Science & research that is genuinely new or counterintuitive',
        'Startups, product thinking, and how good things get built',
        'Sharp essays and frameworks that change how you think',
    ],

    dislikes: [
        'Clickbait, outrage, drama, influencer hot-takes with no substance',
        'Price-pump / "to the moon" crypto content',
        'Shallow listicles and the same news reposted by ten outlets',
        'Doom, rage-bait, and anxiety-spiking breaking news',
    ],

    // Bedtime mode: filter out adrenaline (eveningSafe=false) — saved for the morning.
    eveningMode: true,

    // ~15-20 items ≈ a 15-minute read.
    maxItems: 18,
};

// Broad starting set across platforms + topics. `fragile: true` = depends on a
// public RSSHub instance and may rate-limit; nice-to-have, never load-bearing.
export const sources = [
    // ---------- AI / ML ----------
    { name: 'r/MachineLearning', platform: 'reddit', url: 'https://www.reddit.com/r/MachineLearning/.rss' },
    { name: 'r/LocalLLaMA', platform: 'reddit', url: 'https://www.reddit.com/r/LocalLLaMA/.rss' },
    { name: 'r/singularity', platform: 'reddit', url: 'https://www.reddit.com/r/singularity/.rss' },
    { name: 'r/artificial', platform: 'reddit', url: 'https://www.reddit.com/r/artificial/.rss' },

    // ---------- Tech / engineering ----------
    { name: 'Hacker News (front page)', platform: 'news', url: 'https://hnrss.org/frontpage' },
    { name: 'Hacker News (best)', platform: 'news', url: 'https://hnrss.org/best' },
    { name: 'Ars Technica', platform: 'news', url: 'https://feeds.arstechnica.com/arstechnica/index' },
    { name: 'The Verge', platform: 'news', url: 'https://www.theverge.com/rss/index.xml' },
    { name: 'MIT Technology Review', platform: 'news', url: 'https://www.technologyreview.com/feed/' },

    // ---------- Finance / markets ----------
    { name: 'r/investing', platform: 'reddit', url: 'https://www.reddit.com/r/investing/.rss' },
    { name: 'r/economics (top)', platform: 'reddit', url: 'https://www.reddit.com/r/economics/top/.rss?t=day' },

    // ---------- Crypto ----------
    { name: 'r/CryptoCurrency (top)', platform: 'reddit', url: 'https://www.reddit.com/r/CryptoCurrency/top/.rss?t=day' },
    { name: 'r/ethereum', platform: 'reddit', url: 'https://www.reddit.com/r/ethereum/.rss' },

    // ---------- Science ----------
    { name: 'Quanta Magazine', platform: 'news', url: 'https://www.quantamagazine.org/feed/' },
    { name: 'r/science (top)', platform: 'reddit', url: 'https://www.reddit.com/r/science/top/.rss?t=day' },

    // ---------- Startups / product ----------
    { name: 'r/startups', platform: 'reddit', url: 'https://www.reddit.com/r/startups/.rss' },

    // ---------- YouTube (native channel feeds, no RSSHub) ----------
    // Add channels with: https://www.youtube.com/feeds/videos.xml?channel_id=<ID>
    // (find the channel_id in page source or via a "youtube channel id finder").
    { name: 'YouTube · Two Minute Papers', platform: 'youtube', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg' },

    // ---------- Bilibili (via RSSHub) ----------
    // Ranking as a starter; swap for UP主 you follow: `${RSSHUB}/bilibili/user/video/<uid>`
    { name: 'Bilibili · 排行榜', platform: 'bilibili', fragile: true, url: `${RSSHUB}/bilibili/ranking/0/3` },
    { name: 'Bilibili · 科技每周必看', platform: 'bilibili', fragile: true, url: `${RSSHUB}/bilibili/weeklyrank/1` },

    // ---------- Xiaohongshu (via RSSHub — most fragile; bonus only) ----------
    // { name: 'Xiaohongshu · user', platform: 'xiaohongshu', fragile: true, url: `${RSSHUB}/xiaohongshu/user/<id>/notes` },
];
