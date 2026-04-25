import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { app } from 'electron';
import { execSync } from 'child_process';

const AGENT_ECHO_MARKER = 'agent-echo-hook';
const SETTINGS_PATH = path.join(process.env.HOME || '/Users/nmsn', '.claude', 'settings.json');
const HOOK_EVENTS = [
  'SessionStart', 'UserPromptSubmit', 'SessionEnd',
  'PreToolUse', 'PostToolUse', 'PostToolUseFailure',
  'Stop', 'SubagentStart', 'SubagentStop'
];

function getScriptPath(scriptName: string): string {
  const projectRoot = path.join(app.getAppPath(), '..', '..');
  return path.join(projectRoot, 'scripts', 'hooks', scriptName);
}

export class HookConfigService {
  constructor() {}

  isConfigured(): boolean {
    try {
      if (!existsSync(SETTINGS_PATH)) {
        return false;
      }
      const content = readFileSync(SETTINGS_PATH, 'utf-8');
      if (!content.trim()) {
        return false;
      }
      const settings = JSON.parse(content);
      if (!settings.hooks) {
        return false;
      }
      // Check if any of our hooks contain the agent-echo marker
      for (const event of HOOK_EVENTS) {
        const entries = settings.hooks[event];
        if (entries && Array.isArray(entries)) {
          for (const entry of entries) {
            if (entry.hooks) {
              for (const hook of entry.hooks) {
                if (hook.command && hook.command.includes(AGENT_ECHO_MARKER)) {
                  return true;
                }
              }
            }
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * 调用 install.js 注册钩子
   */
  configure(): void {
    try {
      const installScript = getScriptPath('install.js');
      console.log('[HookConfig] Running install script:', installScript);

      execSync(`node "${installScript}"`, {
        encoding: 'utf-8',
        stdio: 'inherit',
      });

      // 重新加载 Claude Code 设置
      this.reloadClaudeCodeSettings();
    } catch (err) {
      console.error('[HookConfig] Failed to configure hooks:', err);
    }
  }

  /**
   * 调用 uninstall.js 移除钩子
   */
  unconfigure(): void {
    try {
      const uninstallScript = getScriptPath('uninstall.js');
      console.log('[HookConfig] Running uninstall script:', uninstallScript);

      execSync(`node "${uninstallScript}"`, {
        encoding: 'utf-8',
        stdio: 'inherit',
      });
    } catch (err) {
      console.error('[HookConfig] Failed to unconfigure hooks:', err);
    }
  }

  /**
   * 重新加载 Claude Code 设置
   */
  private reloadClaudeCodeSettings(): void {
    try {
      const pids = execSync(`pgrep -x claude | head -5`, {
        encoding: 'utf-8',
      }).trim();

      if (pids) {
        for (const pid of pids.split('\n')) {
          try {
            execSync(`kill -HUP ${pid}`, { encoding: 'utf-8' });
            console.log(`[HookConfig] Reloaded settings for claude (PID: ${pid})`);
          } catch {
            // Process may have already exited
          }
        }
      }
    } catch {
      // No claude processes running
    }
  }
}
