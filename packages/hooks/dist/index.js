#!/usr/bin/env node
import { readFileSync } from 'fs';
const HTTP_URL = 'http://localhost:18765';
async function main() {
    const input = readFileSync(0, 'utf-8').trim();
    if (!input) {
        process.exit(0);
    }
    let payload;
    try {
        payload = JSON.parse(input);
    }
    catch {
        process.exit(0);
    }
    const data = JSON.stringify({ event: payload });
    try {
        await fetch(HTTP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: data,
        });
    }
    catch {
        // fail-open
    }
    process.exit(0);
}
main();
