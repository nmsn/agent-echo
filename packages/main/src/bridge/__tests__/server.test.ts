import { describe, it, expect, beforeEach } from 'vitest';
import { BridgeServer } from '../server';
import type { SocketMessage } from '../types';

describe('BridgeServer', () => {
  let server: BridgeServer;

  beforeEach(() => {
    server = new BridgeServer();
  });

  it('creates instance', () => {
    expect(server).toBeDefined();
  });

  it('getSessions returns empty array initially', () => {
    expect(server.getSessions()).toEqual([]);
  });

  it('isRunning returns false initially', () => {
    expect(server.isRunning()).toBe(false);
  });
});