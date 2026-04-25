#!/usr/bin/env node
/**
 * Agent Echo Hook Uninstaller
 *
 * 安全地移除 agent-echo 钩子从 ~/.claude/settings.json
 *
 * 用法:
 *   node uninstall.js
 *   npm run uninstall-hooks
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 配置
const SETTINGS_PATH = join(process.env.HOME || '/Users/nmsn', '.claude', 'settings.json');

// Agent Echo 监听的 hooks
const ENABLED_HOOKS = [
  'SessionStart',
  'UserPromptSubmit',
  'SessionEnd',
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'Stop',
  'SubagentStart',
  'SubagentStop',
];

// 标记字符串
const AGENT_ECHO_MARKER = 'agent-echo-hook';

/**
 * 读取设置文件
 */
function readSettings() {
  if (!existsSync(SETTINGS_PATH)) {
    return { hooks: {} };
  }
  try {
    const content = readFileSync(SETTINGS_PATH, 'utf-8');
    if (!content.trim()) {
      return { hooks: {} };
    }
    return JSON.parse(content);
  } catch (err) {
    console.error('[Uninstall] 读取 settings.json 失败:', err.message);
    return { hooks: {} };
  }
}

/**
 * 写入设置文件
 */
function writeSettings(settings) {
  const dir = dirname(SETTINGS_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

/**
 * 卸载钩子
 */
function uninstall() {
  console.log('[Uninstall] 开始卸载 agent-echo 钩子...');
  console.log('[Uninstall] 设置文件:', SETTINGS_PATH);

  if (!existsSync(SETTINGS_PATH)) {
    console.log('[Uninstall] settings.json 不存在，无需卸载');
    return;
  }

  const settings = readSettings();

  if (!settings.hooks) {
    console.log('[Uninstall] 没有 hooks 配置，无需卸载');
    return;
  }

  let modified = false;

  for (const event of ENABLED_HOOKS) {
    if (settings.hooks[event]) {
      const originalLength = settings.hooks[event].length;
      settings.hooks[event] = settings.hooks[event].filter((entry) => {
        if (!entry.hooks) return true;
        return !entry.hooks.some(
          (hook) => hook.command && hook.command.includes(AGENT_ECHO_MARKER)
        );
      });

      if (settings.hooks[event].length < originalLength) {
        console.log(`[Uninstall] 移除了 ${event} 钩子`);
        modified = true;
      }
    }
  }

  if (modified) {
    writeSettings(settings);
    console.log('[Uninstall] agent-echo 钩子卸载完成！');
    console.log('[Uninstall] 重新启动 Claude Code 使配置生效');
  } else {
    console.log('[Uninstall] 没有找到 agent-echo 钩子，无需卸载');
  }
}

uninstall();
