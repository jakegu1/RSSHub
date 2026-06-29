// Offline sample data so `node build.mjs --demo` renders a full page without
// network access or an API key. Lets you preview the layout and the curation
// shape before pointing it at live feeds.

export const sampleItems = [
    {
        title: 'A from-scratch walkthrough of how transformer attention actually works',
        link: 'https://example.com/attention-from-scratch',
        snippet:
            'Builds multi-head self-attention step by step in ~200 lines, with diagrams of the QKV projections and why scaling by sqrt(d_k) matters.',
        source: 'Hacker News (best)',
        platform: 'news',
        date: new Date().toUTCString(),
    },
    {
        title: 'New open-weights model matches GPT-4-class reasoning at 1/10th the cost',
        link: 'https://example.com/open-weights-release',
        snippet:
            'Lab releases a 70B model with strong agentic-tool-use benchmarks and a permissive license; includes a detailed training-data and eval writeup.',
        source: 'r/LocalLLaMA',
        platform: 'reddit',
        date: new Date().toUTCString(),
    },
    {
        title: 'Post-mortem: how a single retry storm took down our payments pipeline',
        link: 'https://example.com/retry-storm-postmortem',
        snippet:
            'Honest engineering writeup on cascading retries, the queue backpressure they were missing, and the exponential-backoff-with-jitter fix.',
        source: 'Hacker News (front page)',
        platform: 'news',
        date: new Date().toUTCString(),
    },
    {
        title: 'The quiet shift in how stablecoins are being regulated (and why it matters for infra)',
        link: 'https://example.com/stablecoin-regulation',
        snippet:
            'Substantive analysis of new reserve-attestation rules and what they mean for on-chain settlement rails — protocol design, not price talk.',
        source: 'r/CryptoCurrency',
        platform: 'reddit',
        date: new Date().toUTCString(),
    },
    {
        title: 'Why the bond market is pricing in something the Fed hasn’t said yet',
        link: 'https://example.com/bond-market-signal',
        snippet:
            'Walks through the yield-curve move and what it implies about rate expectations, with the data sources to check it yourself.',
        source: 'Markets digest',
        platform: 'news',
        date: new Date().toUTCString(),
    },
    {
        title: 'A surprisingly deep video essay on agent memory architectures',
        link: 'https://example.com/agent-memory-video',
        snippet:
            'Compares scratchpad files, vector stores, and structured memory for long-running agents, with concrete tradeoffs and failure modes.',
        source: 'YouTube · Two Minute Papers',
        platform: 'youtube',
        date: new Date().toUTCString(),
    },
    {
        title: 'BREAKING: major exchange halts withdrawals amid panic — markets tumble',
        link: 'https://example.com/exchange-panic',
        snippet:
            'Fast-moving, alarming, and unverified — the kind of adrenaline story that should wait for the morning, not bedtime.',
        source: 'r/CryptoCurrency',
        platform: 'reddit',
        date: new Date().toUTCString(),
    },
    {
        title: 'Top 10 SHOCKING AI tools that will replace your job (you won’t believe #7)',
        link: 'https://example.com/clickbait-listicle',
        snippet: 'Low-signal listicle, affiliate links, no substance.',
        source: 'Content farm',
        platform: 'news',
        date: new Date().toUTCString(),
    },
];
