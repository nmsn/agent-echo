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
  modelName: 'MiniMax-Text-01',
};

const SYSTEM_PROMPTS = {
  translate: `你是一个终端输出翻译助手。将用户提供的英文终端输出翻译成简洁的中文。对于英文文件名和目录名，保留原文并在后面加括号注释中文含义，如 Downloads (下载文件夹)、node_modules (依赖包目录)、LICENSE (许可证文件)。命令名保留原文。只输出翻译结果，不要额外解释。如果内容已经是中文，直接原样返回。如果是无意义的输出（如纯符号、空行），回复"—"。`,

  explain: `你是一个终端教学助手，面向完全不懂编程的小白用户。用户会提供他们输入的命令和终端输出。请：1）先用一句话解释这个命令是做什么的（如"ls 命令用于列出当前文件夹的内容"）2）再用通俗易懂的中文解释输出内容的含义。对于英文文件名和目录名，保留原文并在后面加括号注释中文含义，如 Downloads (下载文件夹)、node_modules (依赖包目录)、package.json (项目配置文件)。命令名保留原文。简洁明了，不要啰嗦。`,
};

export interface TranslateResult {
  messageId: string;
  translated: string;
  error?: string;
}

export class TranslationService extends EventEmitter {
  private config: TranslationConfig = { ...DEFAULT_CONFIG };
  private translating = false;
  private translateQueue: Array<{
    messageId: string;
    text: string;
    contentType: 'translate' | 'explain';
    command?: string;
    resolve: (value: string) => void;
    reject: (err: Error) => void;
  }> = [];

  configure(config: Partial<TranslationConfig>): void {
    this.config = { ...this.config, ...config };
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
    contentType: 'translate' | 'explain' = 'translate',
    command?: string
  ): Promise<string> {
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
      this.emit('translate:result', { messageId: task.messageId, translated: result });
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
    contentType: 'translate' | 'explain';
    command?: string;
  }): Promise<string> {
    const { text, contentType, command } = task;

    // Split into code/text segments
    const segments = splitCodeAndText(text);
    if (segments.length === 0) {
      return '';
    }

    const results: string[] = [];

    for (const seg of segments) {
      if (seg.type === 'code') {
        results.push('📝 代码内容，跳过翻译');
        continue;
      }

      // Text segment — translate it
      const translated = await this.callTranslationAPI(seg.text, contentType, command);
      results.push(translated);
    }

    return results.join('\n');
  }

  private async callTranslationAPI(
    text: string,
    contentType: 'translate' | 'explain',
    command?: string
  ): Promise<string> {
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
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };

    const response = await fetch(`${apiBase}/v1/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        stream: true,
        max_tokens: 2048,
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

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    // Anthropic SSE streaming format
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          // Anthropic streaming format: type = "content_block_delta"
          const delta = parsed.content?.[0]?.text || parsed.delta?.text;
          if (delta) {
            result += delta;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    return result.trim() || '—';
  }
}
