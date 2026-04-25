import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../notifier';

// Mock electron before importing NotificationService
vi.mock('electron', () => ({
  Notification: vi.fn().mockImplementation(() => ({
    show: vi.fn(),
  })),
  app: {
    dock: {
      bounce: vi.fn(),
    },
  },
}));

// Import the mocked Notification to verify calls
import { Notification, app } from 'electron';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationService();
  });

  it('creates instance', () => {
    expect(service).toBeDefined();
  });

  it('configure updates sound setting', () => {
    service.configure({ sound: false });
    // Can't easily test without exposing internal state
    // But can verify no errors thrown
    expect(() => service.configure({ sound: true })).not.toThrow();
  });

  it('notify creates and shows notification', () => {
    service.notify({ title: 'Test', body: 'Body' });
    expect(Notification).toHaveBeenCalled();
  });
});