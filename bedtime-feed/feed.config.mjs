// Jake's Bedtime Briefing — configuration
//
// This is the only file you should normally need to edit. It has two parts:
//   1. `profile` — who you are and what "high quality" means to you. The LLM
//      curator uses this verbatim as its editorial brief, so write it the way
//      you'd brief a human editor, not a keyword list.
//   2. `sources` — where raw items come from. Anything that emits RSS/Atom works.
//      Platform-specific feeds (Bilibili, Xiaohongshu, …) go through an RSSHub
//      instance; set RSSHUB_BASE to your own instance for reliability.

const RSSHUB = process.env.RSSHUB_BASE || 'https://rsshub.app';

export const profile = {
    // The reader. Used to ground "is this helpful to *this* person".
    reader: 'Jake — builds software, thinks about AI/agents, follows tech, markets and crypto.',

    // What earns a high score. Be specific about the *kind* of thing, not topics alone.
    likes: [
        'AI / LLMs / agents — research, model releases, real engineering writeups (not hype threads)',
        'Deep technical or first-principles explanations over news-of-the-news',
        'Tech industry signal: serious product launches, infra, developer tooling',
        'Finance & markets with an analytical angle; crypto when it is substantive (protocol/infra/regulation), not price noise',
        'Ideas that change how you think or build — frameworks, post-mortems, sharp essays',
    ],

    // What should be pushed down or dropped, even if on-topic.
    dislikes: [
        'Clickbait, outrage, pure drama, influencer takes with no substance',
        'Price-pump / "to the moon" crypto content',
        'Shallow listicles and reposts of the same news ten outlets already ran',
    ],

    // Bedtime mode: the evening briefing should *calm and enrich*, not spike your
    // cortisol. Items the curator marks eveningSafe:false (breaking/alarming/
    // rage-bait) are filtered out of the bedtime page and saved for a morning read.
    eveningMode: true,

    // How many items make the final cut. ~15-20 ≈ a 15-minute read.
    maxItems: 18,
};

// Each source: { name, url, platform }.
// `fragile: true` marks feeds that depend on a public RSSHub instance and may
// rate-limit or break — they are nice-to-have, never load-bearing.
export const sources = [
    // --- Reliable, no RSSHub needed ---
    { name: 'Hacker News (front page)', platform: 'news', url: 'https://hnrss.org/frontpage' },
    { name: 'r/MachineLearning', platform: 'reddit', url: 'https://www.reddit.com/r/MachineLearning/.rss' },
    { name: 'r/LocalLLaMA', platform: 'reddit', url: 'https://www.reddit.com/r/LocalLLaMA/.rss' },
    { name: 'r/singularity', platform: 'reddit', url: 'https://www.reddit.com/r/singularity/.rss' },
    { name: 'Ars Technica', platform: 'news', url: 'https://feeds.arstechnica.com/arstechnica/index' },
    { name: 'Hacker News (best)', platform: 'news', url: 'https://hnrss.org/best' },

    // --- YouTube via native channel feeds (no RSSHub needed) ---
    // channel_id of "Two Minute Papers" (AI research recaps) as a starter.
    {
        name: 'YouTube · Two Minute Papers',
        platform: 'youtube',
        url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg',
    },

    // --- Platform feeds via RSSHub (set RSSHUB_BASE to your own instance) ---
    // Bilibili "popular / 每周必看" ranking as an example; swap for UP主 you follow.
    { name: 'Bilibili · 排行榜', platform: 'bilibili', fragile: true, url: `${RSSHUB}/bilibili/ranking/0/3` },
    // Xiaohongshu is the most anti-scraping source — keep it as bonus, not core.
    // { name: 'Xiaohongshu · user', platform: 'xiaohongshu', fragile: true, url: `${RSSHUB}/xiaohongshu/user/<id>/notes` },
];
