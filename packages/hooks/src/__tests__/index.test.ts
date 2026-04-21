import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BridgeClient } from '../socket.js';

vi.mock('ws');

describe('BridgeClient', () => {
  let client: BridgeClient;

  beforeEach(() => {
    client = new BridgeClient();
  });

  it('creates instance without error', () => {
    expect(client).toBeDefined();
  });
});

describe('HookEvent parsing', () => {
  it('parses valid JSON event', () => {
    const input = JSON.stringify({
      type: 'SessionStart',
      timestamp: Date.now(),
      sessionId: 'test-123',
      data: {},
    });

    const event = JSON.parse(input);
    expect(event.type).toBe('SessionStart');
  });
});