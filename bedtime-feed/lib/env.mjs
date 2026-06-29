// Tiny zero-dependency .env loader. Reads `bedtime-feed/.env.local` (gitignored)
// into process.env without overriding anything already set in the real environment.
// Keeps your API key out of the repo and out of the source files.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export function loadEnv() {
    for (const name of ['.env.local', '.env']) {
        try {
            const text = readFileSync(join(here, '..', name), 'utf8');
            for (const line of text.split('\n')) {
                const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
                if (!m) continue;
                const key = m[1];
                let val = m[2].trim().replace(/^["']|["']$/g, '');
                if (process.env[key] === undefined) process.env[key] = val;
            }
        } catch {
            // file absent — fine, rely on the real environment
        }
    }
}
