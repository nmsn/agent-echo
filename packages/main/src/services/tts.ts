import { EventEmitter } from 'events';

export interface TTSConfig {
  apiKey: string;
  apiBase: string;
  model: string;
  voiceId: string;
}

export interface TTSResult {
  audioData: string;  // base64 data URL
  messageId: string;
  error?: string;
}

const DEFAULT_CONFIG: TTSConfig = {
  apiKey: '',
  apiBase: 'https://api.minimaxi.com',
  model: 'speech-2.8-hd',
  voiceId: 'male-qn-qingse',
};

export class TTSService extends EventEmitter {
  private config: TTSConfig = { ...DEFAULT_CONFIG };

  configure(config: Partial<TTSConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): TTSConfig {
    return { ...this.config };
  }

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  async speak(text: string, messageId: string): Promise<TTSResult> {
    const { apiKey, apiBase, model, voiceId } = this.config;

    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const response = await fetch(`${apiBase}/v1/t2a_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        text,
        stream: false,
        voice_setting: {
          voice_id: voiceId,
          speed: 1,
          vol: 1,
          pitch: 0,
          emotion: 'happy',
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1,
        },
        subtitle_enable: false,
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
      throw new Error(`TTS 错误: ${data.base_resp.status_msg || '未知错误'}`);
    }

    const hexAudio = data.data?.audio || '';
    if (!hexAudio) {
      throw new Error('TTS 返回空音频数据');
    }

    // MiniMax returns hex-encoded audio; convert to base64 for the data URL
    const base64Audio = Buffer.from(hexAudio, 'hex').toString('base64');

    return {
      audioData: `data:audio/mpeg;base64,${base64Audio}`,
      messageId,
    };
  }
}