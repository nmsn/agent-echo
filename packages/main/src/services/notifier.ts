import { Notification, app } from 'electron';

export interface NotificationOptions {
  title: string;
  body: string;
  sound?: boolean;
  bounce?: boolean;
}

export class NotificationService {
  private soundEnabled: boolean = true;
  private bounceEnabled: boolean = true;

  configure(options: { sound?: boolean; bounce?: boolean }): void {
    if (options.sound !== undefined) this.soundEnabled = options.sound;
    if (options.bounce !== undefined) this.bounceEnabled = options.bounce;
  }

  notify(options: NotificationOptions): void {
    const { title, body, sound = true, bounce = true } = options;

    const notification = new Notification({
      title,
      body,
      silent: !sound,
    });

    notification.show();

    if (bounce && this.bounceEnabled) {
      this.bounceMenuBar();
    }
  }

  private bounceMenuBar(): void {
    if (process.platform === 'darwin') {
      app.dock?.bounce();
    }
  }
}