#!/usr/bin/env node
/**
 * Agent Echo Hook Installer
 *
 * 安全地注册 agent-echo 钩子到 ~/.claude/settings.json
 *
 * 特性：
 * - 安全合并：只追加 agent-echo 钩子，不覆盖已有钩子
 * - 幂等：重复运行会 skip，不会重复添加
 * - 可逆：运行 uninstall.js 可以完整移除
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 配置
const HOOK_SCRIPT_PATH = join(__dirname, '..', '..', 'packages', 'hooks', 'dist', 'agent-echo-hook.js');
const SETTINGS_PATH = join(process.env.HOME || '/Users/nmsn', '.claude', 'settings.json');

// Agent Echo 需要监听的 hooks
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

// 标记字符串，用于检测是否已安装
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
    console.error('[Install] 读取 settings.json 失败:', err.message);
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
 * 检查是否已经安装了 agent-echo 钩子
 */
function isInstalled(settings) {
  if (!settings.hooks) return false;

  for (const event of ENABLED_HOOKS) {
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
}

/**
 * 检查某个 event 下是否已有 agent-echo 钩子
 */
function hasAgentEchoHook(entries) {
  if (!entries || !Array.isArray(entries)) return false;
  for (const entry of entries) {
    if (entry.hooks) {
      for (const hook of entry.hooks) {
        if (hook.command && hook.command.includes(AGENT_ECHO_MARKER)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * 安装钩子
 */
function install() {
  console.log('[Install] 开始安装 agent-echo 钩子...');
  console.log('[Install] 设置文件:', SETTINGS_PATH);

  // 确保 hooks 目录存在
  const dir = dirname(SETTINGS_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log('[Install] 创建了 .claude 目录');
  }

  const settings = readSettings();

  // 初始化 hooks 对象
  if (!settings.hooks) {
    settings.hooks = {};
  }

  // 检查是否已安装
  if (isInstalled(settings)) {
    console.log('[Install] agent-echo 钩子已安装，跳过（幂等）');
    return;
  }

  // 为每个事件添加钩子
  for (const event of ENABLED_HOOKS) {
    if (!settings.hooks[event]) {
      settings.hooks[event] = [];
    }

    // 检查是否已有 agent-echo 钩子
    if (!hasAgentEchoHook(settings.hooks[event])) {
      settings.hooks[event].push({
        hooks: [
          {
            type: 'command',
            command: `node "${HOOK_SCRIPT_PATH}"`,
            async: true,
          },
        ],
      });
      console.log(`[Install] 添加了 ${event} 钩子`);
    }
  }

  writeSettings(settings);
  console.log('[Install] agent-echo 钩子安装完成！');
  console.log('[Install] 重新启动 Claude Code 使配置生效，或运行 killall Claude Code');
}

/**
 * 卸载钩子
 */
function uninstall() {
  console.log('[Install] 开始卸载 agent-echo 钩子...');
  console.log('[Install] 设置文件:', SETTINGS_PATH);

  if (!existsSync(SETTINGS_PATH)) {
    console.log('[Install] settings.json 不存在，无需卸载');
    return;
  }

  const settings = readSettings();

  if (!settings.hooks) {
    console.log('[Install] 没有 hooks 配置，无需卸载');
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
        console.log(`[Install] 移除了 ${event} 钩子`);
        modified = true;
      }
    }
  }

  if (modified) {
    writeSettings(settings);
    console.log('[Install] agent-echo 钩子卸载完成！');
    console.log('[Install] 重新启动 Claude Code 使配置生效');
  } else {
    console.log('[Install] 没有找到 agent-echo 钩子，无需卸载');
  }
}

// 主入口
const command = process.argv[2] || 'install';

if (command === 'uninstall') {
  uninstall();
} else if (command === 'install') {
  install();
} else {
  console.error(`[Install] 未知命令: ${command}`);
  console.error('用法: node install.js [install|uninstall]');
  process.exit(1);
}
