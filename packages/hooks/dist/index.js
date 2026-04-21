#!/usr/bin/env node
import { readFileSync } from 'fs';
import { BridgeClient } from './socket.js';
const SOCKET_PATH = process.env.AGENT_ECHO_SOCKET || '/tmp/agent-echo.sock';
async function main() {
    const input = readFileSync(0, 'utf-8').trim();
    if (!input) {
        process.exit(0);
    }
    let event;
    try {
        event = JSON.parse(input);
    }
    catch {
        process.exit(0);
    }
    const message = {
        event,
        source: 'claude',
        pid: process.ppid,
        cwd: process.cwd(),
    };
    try {
        const client = new BridgeClient();
        await client.connect();
        client.send(message);
        client.close();
    }
    catch {
        // fail-open
    }
    process.exit(0);
}
main();
