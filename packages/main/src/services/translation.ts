import { EventEmitter } from 'events';
import { splitCodeAndText, classifyContent, type Segment } from '@agentecho/shared';

export interface TranslationConfig {
  apiKey: string;
  apiBase: string;
  modelName: string;
}

const DEFAULT_CONFIG: TranslationConfig = {
  apiKey: '',
  apiBase: 'https://api.minimaxi.com/anthropic',
  modelName: 'MiniMax-M2.7',
};

const SYSTEM_PROMPTS = {
  translate: `你是一个翻译助手。将用户提供的英文内容翻译成简洁的中文。对于代码、命令名、文件名和目录名，保留原文并在后面加括号注释中文含义，如 Downloads (下载文件夹)、node_modules (依赖包目录)、LICENSE (许可证文件)。只输出翻译结果，不要额外解释。如果内容已经是中文，直接原样返回。如果是无意义的输出（如纯符号、空行），回复"—"。`,

  explain: `你是一个终端教学助手，面向完全不懂编程的小白用户。用户会提供他们输入的命令和终端输出。请：1）先用一句话解释这个命令是做什么的（如"ls 命令用于列出当前文件夹的内容"）2）再用通俗易懂的中文解释输出内容的含义。对于英文文件名和目录名，保留原文并在后面加括号注释中文含义，如 Downloads (下载文件夹)、node_modules (依赖包目录)、package.json (项目配置文件)。命令名保留原文。简洁明了，不要啰嗦。`,

  compose: `你是一个翻译助手。将用户输入的中文翻译成自然流畅的英文，适合粘贴到终端中与 AI 助手对话。翻译要像开发者的自然语言请求。只输出英文翻译，不要加解释。如果输入已经是英文，直接原样返回。`,
};

export interface TranslateResult {
  messageId: string;
  translated: string;
  error?: string;
  usage?: { inputTokens: number; outputTokens: number; systemPromptTokens: number };
}

interface TranslationResponse {
  text: string;
  usage: { inputTokens: number; outputTokens: number; systemPromptTokens: number };
}

export class TranslationService extends EventEmitter {
  private config: TranslationConfig = { ...DEFAULT_CONFIG };
  private translating = false;
  private systemPromptTokensCache: Partial<Record<'translate' | 'explain' | 'compose', number>> = {};
  private translateQueue: Array<{
    messageId: string;
    text: string;
    contentType: 'translate' | 'explain' | 'compose';
    command?: string;
    resolve: (value: TranslateResult) => void;
    reject: (err: Error) => void;
  }> = [];

  configure(config: Partial<TranslationConfig>): void {
    this.config = { ...this.config, ...config };
    // Reset cache when config changes
    this.systemPromptTokensCache = {};
  }

  async initSystemPromptTokens(): Promise<void> {
    if (!this.config.apiKey) return;

    const contentTypes = ['translate', 'explain', 'compose'] as const;
    for (const contentType of contentTypes) {
      try {
        const systemPrompt = SYSTEM_PROMPTS[contentType];
        const response = await this.callRawAPI(systemPrompt + '\n\n .');
        if (response.usage) {
          this.systemPromptTokensCache[contentType] = response.usage.inputTokens;
        }
      } catch (err) {
        console.error(`[TranslationService] Failed to init system prompt tokens for ${contentType}:`, err);
      }
    }
  }

  private async callRawAPI(content: string): Promise<{ usage: { inputTokens: number; outputTokens: number } }> {
    const { apiKey, apiBase, modelName } = this.config;

    const response = await fetch(`${apiBase}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        stream: false,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const usage = data.usage;
    return {
      usage: {
        inputTokens: usage?.input_tokens || 0,
        outputTokens: usage?.output_tokens || 0,
      },
    };
  }

  getConfig(): TranslationConfig {
    return { ...this.config };
  }

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  async translate(
    messageId: string,
    text: string,
    contentType: 'translate' | 'explain' | 'compose' = 'translate',
    command?: string
  ): Promise<TranslateResult> {
    return new Promise((resolve, reject) => {
      this.translateQueue.push({ messageId, text, contentType, command, resolve, reject });
      if (!this.translating) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.translateQueue.length === 0) {
      this.translating = false;
      return;
    }

    this.translating = true;
    const task = this.translateQueue.shift()!;

    try {
      const result = await this.translateSegment(task);
      task.resolve(result);
      this.emit('translate:result', { messageId: task.messageId, translated: result.translated, usage: result.usage });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      task.reject(new Error(error));
      this.emit('translate:error', { messageId: task.messageId, error });
    }

    // Process next in queue
    this.processQueue();
  }

  private async translateSegment(task: {
    messageId: string;
    text: string;
    contentType: 'translate' | 'explain' | 'compose';
    command?: string;
  }): Promise<TranslateResult> {
    const { messageId, text, contentType, command } = task;

    // Split into code/text segments
    const segments = splitCodeAndText(text);
    if (segments.length === 0) {
      return { messageId, translated: '', usage: { inputTokens: 0, outputTokens: 0, systemPromptTokens: 0 } };
    }

    const results: string[] = [];
    let totalInput = 0;
    let totalOutput = 0;

    for (const seg of segments) {
      if (seg.type === 'code') {
        results.push('📝 代码内容，跳过翻译');
        continue;
      }

      // Text segment — translate it
      const response = await this.callTranslationAPI(seg.text, contentType, command);
      results.push(response.text);
      totalInput += response.usage.inputTokens;
      totalOutput += response.usage.outputTokens;
    }

    const systemPromptTokens = this.systemPromptTokensCache[contentType] || 0;

    return {
      messageId,
      translated: results.join('\n'),
      usage: { inputTokens: totalInput, outputTokens: totalOutput, systemPromptTokens },
    };
  }

  private async callTranslationAPI(
    text: string,
    contentType: 'translate' | 'explain' | 'compose',
    command?: string
  ): Promise<TranslationResponse> {
    const { apiKey, apiBase, modelName } = this.config;

    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const systemPrompt = SYSTEM_PROMPTS[contentType];
    const userContent = contentType === 'explain' && command
      ? `命令: ${command}\n输出:\n${text}`
      : text;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    const response = await fetch(`${apiBase}/v1/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        stream: false,
        messages: [
          { role: 'user', content: systemPrompt + '\n\n' + userContent },
        ],
      }),
    });

    if (!response.ok) {
      const errorMessages: Record<number, string> = {
        401: '认证失败：API Key 错误或过期',
        403: '没有权限访问该 API',
        404: '找不到该模型，请检查模型名称',
        429: '请求太频繁，API 限流了',
        500: 'API 服务器内部错误',
        502: 'API 服务暂时不可用',
        503: 'API 服务暂时不可用',
      };
      const errorBody = await response.text();
      throw new Error(errorMessages[response.status] || `API 错误 (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    // Check for API-level errors in base_resp
    if (data.base_resp && data.base_resp.status_code !== 0) {
      throw new Error(`API 错误: ${data.base_resp.status_msg || '未知错误'}`);
    }

    // Extract text from Anthropic response format: content is an array of blocks
    const content = data.content;
    if (!content || !Array.isArray(content)) {
      throw new Error('API 返回格式异常：缺少 content');
    }

    const textBlocks = content
      .filter((block: { type: string }) => block.type === 'text')
      .map((block: { text: string }) => block.text)
      .join('');

    // Extract token usage
    const usage = data.usage;
    const inputTokens = usage?.input_tokens || 0;
    const outputTokens = usage?.output_tokens || 0;

    const systemPromptTokens = this.systemPromptTokensCache[contentType] || 0;

    return {
      text: textBlocks.trim() || '—',
      usage: { inputTokens, outputTokens, systemPromptTokens },
    };
  }
}
