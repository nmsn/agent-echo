import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessScanner } from '../scanner.js';

describe('ProcessScanner', () => {
  let scanner: ProcessScanner;
  let onDiscover: ReturnType<typeof vi.fn>;
  let onLost: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onDiscover = vi.fn();
    onLost = vi.fn();
    scanner = new ProcessScanner(onDiscover, onLost);
  });

  it('creates instance', () => {
    expect(scanner).toBeDefined();
  });

  it('stop without start is safe', () => {
    expect(() => scanner.stop()).not.toThrow();
  });
});