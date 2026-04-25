import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProcessScanner } from '../scanner';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

import { exec } from 'child_process';

describe('ProcessScanner', () => {
  let scanner: ProcessScanner;
  let onDiscover: ReturnType<typeof vi.fn>;
  let onLost: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onDiscover = vi.fn();
    onLost = vi.fn();
    scanner = new ProcessScanner(onDiscover, onLost);
  });

  afterEach(() => {
    scanner.stop();
  });

  it('creates instance', () => {
    expect(scanner).toBeDefined();
  });

  it('stop without start is safe', () => {
    expect(() => scanner.stop()).not.toThrow();
  });

  describe('start()', () => {
    it('should trigger initial scan', async () => {
      vi.mocked(exec).mockImplementation(
        (() => {
          let called = false;
          return (cmd: string, opts: object, cb?: Function) => {
            if (cb) {
              // Callback style
              if (!called) {
                called = true;
                setTimeout(() => cb(null, { stdout: '' }), 0);
              }
            }
          };
        }) as any
      );

      scanner.start(5000);
      // Initial scan is async, wait for it
      await new Promise(resolve => setTimeout(resolve, 50));
      // exec should have been called (for the ps command)
      expect(exec).toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('should clear the interval', () => {
      // Mock exec to avoid actual system calls
      vi.mocked(exec).mockImplementation((cmd: string, opts: object, cb?: Function) => {
        if (cb) setTimeout(() => cb(null, { stdout: '' }), 0);
        return {} as any;
      });

      scanner.start(50);
      scanner.stop();
      // If stop worked, calling stop again should not throw
      expect(() => scanner.stop()).not.toThrow();
    });
  });

  describe('onDiscover callback', () => {
    it('is called when new process found', async () => {
      vi.mocked(exec).mockImplementation((cmd: string, opts: object, cb?: Function) => {
        if (cb) setTimeout(() => cb(null, { stdout: '1234 1000 pts/0 claude-agent\n' }), 0);
        return {} as any;
      });

      scanner.start(999999);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(onDiscover).toHaveBeenCalledWith(
        expect.objectContaining({
          pid: 1234,
          ppid: 1000,
          tty: 'pts/0',
          command: 'claude-agent',
        })
      );
    });
  });

  describe('onLost callback', () => {
    it('is called when process lost between scans', async () => {
      let callCount = 0;
      vi.mocked(exec).mockImplementation((cmd: string, opts: object, cb?: Function) => {
        callCount++;
        if (cb) {
          if (callCount === 1) {
            // First scan: find a process
            setTimeout(() => cb(null, { stdout: '1234 1000 pts/0 claude-agent\n' }), 0);
          } else {
            // Second scan: no processes
            setTimeout(() => cb(null, { stdout: '' }), 0);
          }
        }
        return {} as any;
      });

      scanner.start(20);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(onLost).toHaveBeenCalledWith(1234);
    });
  });
});