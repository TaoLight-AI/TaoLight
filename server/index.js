const http = require('http')
const provider = require('./provider')
const calibrated = require('./fixtures/chatgpt-calibrated.json')

const PORT = Number(process.env.PORT || 8787)
const CALIBRATION_MODE = String(process.env.CALIBRATION_MODE || 'true').toLowerCase() !== 'false'

const STORY_LIBRARY = calibrated.templates

function json(res, status, data) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  })
  res.end(JSON.stringify(data))
}

function body(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}) } catch (err) { reject(err) }
    })
  })
}

function calibratedStories(template) {
  return STORY_LIBRARY[template] || STORY_LIBRARY.goodday
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return json(res, 204, {})
    if (req.url === '/health') return json(res, 200, {
      ok: true,
      service: 'taolight-ai-gateway',
      mode: CALIBRATION_MODE ? 'chatgpt-calibration' : (provider.configured() ? 'provider+fallback' : 'mock-first'),
      calibrationVersion: calibrated.version
    })
    if (req.url === '/v1/provider/status') return json(res, 200, {
      configured: provider.configured(),
      calibrationMode: CALIBRATION_MODE,
      calibrationVersion: calibrated.version,
      storyModel: process.env.STORY_MODEL || 'qwen3.7-plus',
      imageModel: process.env.IMAGE_MODEL || 'wan2.7-image-pro',
      videoModel: process.env.VIDEO_MODEL || 'wan2.7-i2v-2026-04-25'
    })

    if (req.method === 'POST' && req.url === '/v1/material/analyze') {
      const input = await body(req).catch(() => ({}))
      return json(res, 200, {
        scene: input.imagePath || input.imageUrl ? 'peach_image' : 'unknown',
        notes: ['优先识别真实桃、桃树、桃园和人物关系', '故事优先，不把参数堆给桃农'],
        provider: CALIBRATION_MODE ? 'chatgpt-calibrated' : 'gateway'
      })
    }

    if (req.method === 'POST' && req.url === '/v1/story/cores') {
      const input = await body(req).catch(() => ({}))
      const template = input.template || 'goodday'

      if (CALIBRATION_MODE) {
        return json(res, 200, {
          taskId: `story-${Date.now()}`,
          stories: calibratedStories(template),
          provider: 'chatgpt-calibrated',
          calibrationVersion: calibrated.version
        })
      }

      try {
        const generated = await provider.generateStories(input)
        if (generated) return json(res, 200, { taskId: `story-${Date.now()}`, ...generated })
      } catch (err) {
        console.error('story provider failed; falling back:', err.message)
      }
      return json(res, 200, { taskId: `story-${Date.now()}`, stories: calibratedStories(template), provider: 'calibrated-fallback' })
    }

    if (req.method === 'POST' && req.url === '/v1/poster/generate') {
      const input = await body(req).catch(() => ({}))
      if (CALIBRATION_MODE) {
        return json(res, 200, {
          poster_url: '',
          story_core: input.storyCore || {},
          poster_prompt: (input.storyCore && input.storyCore.poster_scene) || '',
          provider: 'chatgpt-calibrated',
          status: 'prompt_ready'
        })
      }
      try {
        const generated = await provider.generatePoster(input)
        if (generated) return json(res, 200, { ...generated, story_core: input.storyCore || {}, status: 'ready' })
      } catch (err) {
        console.error('poster provider failed; falling back:', err.message)
      }
      return json(res, 200, { poster_url: '', story_core: input.storyCore || {}, provider: 'mock', status: 'preview_ready' })
    }

    if (req.method === 'POST' && req.url === '/v1/video/generate') {
      const input = await body(req).catch(() => ({}))
      if (CALIBRATION_MODE) {
        return json(res, 200, {
          video_task_id: 'chatgpt-calibration-video',
          status: 'director_ready',
          provider: 'chatgpt-calibrated',
          prompt: provider.buildVlogPrompt(input)
        })
      }
      try {
        const task = await provider.createVideoTask(input)
        if (task && task.task_id) return json(res, 200, { video_task_id: task.task_id, status: task.status, provider: task.provider, model: task.model, prompt: task.prompt })
        if (task && task.status === 'needs_reference') return json(res, 200, { video_task_id: '', ...task })
      } catch (err) {
        console.error('video provider failed; falling back:', err.message)
      }
      return json(res, 200, { video_task_id: 'mock-video-task', status: 'processing', provider: 'mock', prompt: provider.buildVlogPrompt(input) })
    }

    if (req.method === 'GET' && req.url.startsWith('/v1/video/tasks/')) {
      if (CALIBRATION_MODE) {
        return json(res, 200, {
          status: 'completed',
          progress: 100,
          video_url: '',
          provider: 'chatgpt-calibrated',
          platform_copy: {
            douyin: '蟠桃园长下凡第一天，就忍不住先尝了一口。',
            xiaohongshu: '今天跟着大圣去平谷桃园，慢了一会儿。'
          }
        })
      }
      const taskId = decodeURIComponent(req.url.slice('/v1/video/tasks/'.length).split('?')[0])
      try {
        const task = await provider.getVideoTask(taskId)
        if (task) return json(res, 200, { ...task, platform_copy: {
          douyin: '退休后的蟠桃园长，为什么跑到平谷来了？',
          xiaohongshu: '今天跟着大圣去桃园里慢了一会儿。'
        } })
      } catch (err) {
        console.error('video task provider failed; falling back:', err.message)
      }
      return json(res, 200, { status: 'completed', progress: 100, video_url: '', provider: 'mock' })
    }

    return json(res, 404, { error: 'not_found' })
  } catch (err) {
    console.error(err)
    return json(res, 500, { error: 'internal_error', message: err.message })
  }
})

server.listen(PORT, () => console.log(`TaoLight AI gateway listening on http://127.0.0.1:${PORT}`))
