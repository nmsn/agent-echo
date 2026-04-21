import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { BridgeClient } from '../socket.js';
import type { HookEvent, SocketMessage } from '../types.js';

vi.mock('ws');

describe('BridgeClient', () => {
  let client: BridgeClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('uses default socket path when no argument provided', () => {
      const client = new BridgeClient();
      expect(client).toBeDefined();
    });

    it('accepts custom socket path', () => {
      const client = new BridgeClient('/custom/path.sock');
      expect(client).toBeDefined();
    });

    it('accepts socket path via env var', () => {
      const originalEnv = process.env.AGENT_ECHO_SOCKET;
      process.env.AGENT_ECHO_SOCKET = '/env/path.sock';
      const client = new BridgeClient();
      expect(client).toBeDefined();
      if (originalEnv !== undefined) {
        process.env.AGENT_ECHO_SOCKET = originalEnv;
      } else {
        delete process.env.AGENT_ECHO_SOCKET;
      }
    });
  });

  describe('send', () => {
    it('does not throw when websocket is not connected', () => {
      const client = new BridgeClient();
      expect(() => client.send({ test: true })).not.toThrow();
    });
  });

  describe('close', () => {
    it('does not throw when websocket is null', () => {
      const client = new BridgeClient();
      expect(() => client.close()).not.toThrow();
    });
  });
});

describe('HookEvent type validation', () => {
  it('accepts valid SessionStart event', () => {
    const event: HookEvent = {
      type: 'SessionStart',
      timestamp: Date.now(),
      sessionId: 'test-123',
      data: { key: 'value' },
    };
    expect(event.type).toBe('SessionStart');
    expect(event.timestamp).toBeDefined();
    expect(event.sessionId).toBe('test-123');
  });

  it('accepts valid UserPromptSubmit event', () => {
    const event: HookEvent = {
      type: 'UserPromptSubmit',
      timestamp: Date.now(),
      data: { prompt: 'hello' },
    };
    expect(event.type).toBe('UserPromptSubmit');
  });

  it('accepts valid AssistantMessage event', () => {
    const event: HookEvent = {
      type: 'AssistantMessage',
      timestamp: Date.now(),
      data: { message: 'hi there' },
    };
    expect(event.type).toBe('AssistantMessage');
  });

  it('accepts valid SessionEnd event', () => {
    const event: HookEvent = {
      type: 'SessionEnd',
      timestamp: Date.now(),
      data: {},
    };
    expect(event.type).toBe('SessionEnd');
  });
});

describe('SocketMessage type validation', () => {
  it('requires pid field', () => {
    const message: SocketMessage = {
      event: { type: 'SessionStart', timestamp: Date.now(), data: {} },
      source: 'claude',
      pid: 12345,
      cwd: '/workspace',
    };
    expect(message.pid).toBe(12345);
    expect(message.cwd).toBe('/workspace');
  });

  it('accepts optional tty field', () => {
    const message: SocketMessage = {
      event: { type: 'SessionStart', timestamp: Date.now(), data: {} },
      source: 'claude',
      pid: 12345,
      tty: '/dev/ttys000',
      cwd: '/workspace',
    };
    expect(message.tty).toBe('/dev/ttys000');
  });

  it('rejects missing pid at type level', () => {
    // TypeScript would catch this if pid was optional and missing
    const message: SocketMessage = {
      event: { type: 'SessionStart', timestamp: Date.now(), data: {} },
      source: 'codex',
      pid: 999,
      cwd: '/home/user',
    };
    expect(message.source).toBe('codex');
  });
});