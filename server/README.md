# TaoLight AI Gateway

This directory is the backend boundary for all real AI providers.

## Why it exists

The WeChat mini program must never contain provider API keys. The mini program only calls TaoLight endpoints; provider selection can change without touching UI code.

## Required endpoints

- `POST /v1/material/analyze`
- `POST /v1/story/cores`
- `POST /v1/poster/generate`
- `POST /v1/video/generate`
- `GET /v1/video/tasks/:taskId`

## Provider strategy

Use environment variables and provider adapters. Do not hard-code vendor logic into route handlers.

Suggested env keys:

```bash
STORY_PROVIDER=mock
POSTER_PROVIDER=mock
VIDEO_PROVIDER=mock
QWEN_API_KEY=
OPENAI_API_KEY=
DASHSCOPE_API_KEY=
KLING_API_KEY=
```

## MVP deployment rule

Until real provider keys are configured, endpoints may return mock-compatible payloads. Once configured, preserve the same response schema so the mini program requires no page rewrite.

## Story response

```json
{
  "stories": [
    {
      "title": "",
      "core": "",
      "emotion": "",
      "slogan": ""
    }
  ],
  "provider": "qwen"
}
```

## Poster response

```json
{
  "poster_url": "https://...",
  "story_core": {},
  "provider": "wanx"
}
```

## Video start response

```json
{
  "video_task_id": "...",
  "status": "queued",
  "video_url": "",
  "provider": "wanx",
  "platform_copy": {
    "douyin": "",
    "xiaohongshu": ""
  }
}
```

## Video task response

```json
{
  "status": "processing",
  "progress": 58,
  "video_url": ""
}
```

## Important content rule

The provider is not allowed to invent QR codes or logos in generative video. TaoLight brand lockup and the real recruitment QR code are composited after generation.
