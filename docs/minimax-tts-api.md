# MiniMax TTS API (Domestic - minimaxi.com)

## Endpoint
```
POST https://api.minimaxi.com/v1/t2a_v2
```

## Authentication
```bash
Authorization: Bearer <token>
Content-Type: application/json
```

## Non-Streaming Request
```json
{
  "model": "speech-2.8-hd",
  "text": "今天是不是很开心呀(laughs)，当然了！",
  "stream": false,
  "voice_setting": {
    "voice_id": "male-qn-qingse",
    "speed": 1,
    "vol": 1,
    "pitch": 0,
    "emotion": "happy"
  },
  "audio_setting": {
    "sample_rate": 32000,
    "bitrate": 128000,
    "format": "mp3",
    "channel": 1
  },
  "pronunciation_dict": {
    "tone": [
      "处理/(chu3)(li3)",
      "危险/dangerous"
    ]
  },
  "subtitle_enable": false
}
```

## Non-Streaming Response (200)
```json
{
  "data": {
    "audio": "<hex编码的audio>",
    "status": 2
  },
  "extra_info": {
    "audio_length": 9900,
    "audio_sample_rate": 32000,
    "audio_size": 160323,
    "bitrate": 128000,
    "word_count": 52,
    "invisible_character_ratio": 0,
    "usage_characters": 26,
    "audio_format": "mp3",
    "audio_channel": 1
  },
  "trace_id": "01b8bf9bb7433cc75c18eee6cfa8fe21",
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

## Streaming Request
Same as non-streaming, but `"stream": true`

## Streaming Response (200)
```json
[
  {
    "data": {
      "audio": "hex编码的audio_chunk1",
      "status": 1
    },
    "trace_id": "01b8bf9bb7433cc75c18eee6cfa8fe21",
    "base_resp": {
      "status_code": 0,
      "status_msg": ""
    }
  },
  {
    "data": {
      "audio": "hex编码的audio_chunk2",
      "status": 1
    },
    "trace_id": "01b8bf9bb7433cc75c18eee6cfa8fe21",
    "base_resp": {
      "status_code": 0,
      "status_msg": ""
    }
  },
  {
    "data": {
      "audio": "hex编码的audio",
      "status": 2
    },
    "extra_info": {
      "audio_length": 6931,
      "audio_sample_rate": 32000,
      "audio_size": 111789,
      "bitrate": 128000,
      "word_count": 112,
      "invisible_character_ratio": 0,
      "usage_characters": 112,
      "audio_format": "mp3",
      "audio_channel": 1
    },
    "trace_id": "04ece790375f3ca2edbb44e8c4c200bf",
    "base_resp": {
      "status_code": 0,
      "status_msg": "success"
    }
  }
]
```

## Status Codes
- `status: 1` - Streaming chunk in progress
- `status: 2` - Final chunk / Non-streaming complete

---

# MiniMax Text Chat API (Anthropic Compatible)

## Endpoint
```
POST https://api.minimaxi.com/anthropic/v1/messages
```

## Authentication
```bash
Authorization: Bearer <token>
Content-Type: application/json
```

## Non-Streaming Request
```json
{
  "model": "MiniMax-M2.7",
  "messages": [
    {
      "role": "user",
      "content": "你好"
    }
  ]
}
```

## Response 200
```json
{
  "id": "06379dbe27b33d7c58d8410a8efe6394",
  "type": "message",
  "role": "assistant",
  "model": "MiniMax-M2.7",
  "content": [
    {
      "thinking": "用户用中文说\"你好\"，这是一个简单的问候。我应该用中文友好地回应。",
      "signature": "ce704495524bad054531fe187e18b4a8d874a52fbb3923ce18fceace5e768ec9",
      "type": "thinking"
    },
    {
      "text": "你好！有什么我可以帮助你的吗？",
      "type": "text"
    }
  ],
  "usage": {
    "input_tokens": 42,
    "output_tokens": 30
  },
  "stop_reason": "end_turn",
  "base_resp": {
    "status_code": 0,
    "status_msg": ""
  }
}
```

## Response Fields
- `content` - Array of content blocks, filtered by `type`:
  - `type: "thinking"` - AI reasoning (skip in display)
  - `type: "text"` - Generated text response
- `stop_reason` - Usually `"end_turn"` when complete
- `base_resp.status_code` - `0` for success, non-zero for errors