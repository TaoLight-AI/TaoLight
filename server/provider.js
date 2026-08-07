const { buildStoryPrompt, buildPosterPrompt, buildVlogPrompt } = require('./prompts')

function configured() {
  return Boolean(process.env.DASHSCOPE_API_KEY && process.env.DASHSCOPE_WORKSPACE_ID)
}

function baseUrl() {
  const region = process.env.DASHSCOPE_REGION || 'cn-beijing'
  const workspace = process.env.DASHSCOPE_WORKSPACE_ID
  if (region === 'cn-beijing') return `https://${workspace}.cn-beijing.maas.aliyuncs.com`
  if (region === 'ap-southeast-1') return `https://${workspace}.ap-southeast-1.maas.aliyuncs.com`
  if (region === 'ap-northeast-1') return `https://${workspace}.ap-northeast-1.maas.aliyuncs.com`
  return process.env.DASHSCOPE_BASE_URL || ''
}

async function requestJson(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS || 60000))
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    const raw = await res.text()
    let data = {}
    try { data = raw ? JSON.parse(raw) : {} } catch (_) { data = { raw } }
    if (!res.ok) throw new Error(`provider_http_${res.status}: ${raw.slice(0, 300)}`)
    return data
  } finally {
    clearTimeout(timer)
  }
}

async function postJson(url, payload, extraHeaders = {}) {
  return requestJson(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      ...extraHeaders
    },
    body: JSON.stringify(payload)
  })
}

async function getJson(url) {
  return requestJson(url, {
    method: 'GET',
    headers: { authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}` }
  })
}

function parseJsonText(text) {
  if (!text) throw new Error('empty_model_output')
  const cleaned = String(text).replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
  return JSON.parse(cleaned)
}

async function generateStories(input) {
  if (!configured()) return null
  const url = `${baseUrl()}/compatible-mode/v1/chat/completions`
  const model = process.env.STORY_MODEL || 'qwen3.7-plus'
  const data = await postJson(url, {
    model,
    messages: [
      { role: 'system', content: '你是桃紫有光内容导演，输出必须是可解析JSON。' },
      { role: 'user', content: buildStoryPrompt(input) }
    ],
    temperature: 0.85,
    response_format: { type: 'json_object' }
  })
  const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
  const parsed = parseJsonText(text)
  if (!Array.isArray(parsed.stories) || parsed.stories.length !== 3) throw new Error('invalid_story_shape')
  return { stories: parsed.stories, provider: 'dashscope', model }
}

async function generatePoster(input) {
  if (!configured()) return null
  const url = `${baseUrl()}/api/v1/services/aigc/multimodal-generation/generation`
  const model = process.env.IMAGE_MODEL || 'wan2.7-image-pro'
  const data = await postJson(url, {
    model,
    input: { messages: [{ role: 'user', content: [{ text: buildPosterPrompt(input) }] }] },
    parameters: { watermark: false, n: 1, size: '1536*2048', prompt_extend: true }
  })
  const content = data && data.output && data.output.choices && data.output.choices[0] && data.output.choices[0].message && data.output.choices[0].message.content
  const image = Array.isArray(content) ? content.find(x => x.image) : null
  if (!image || !image.image) throw new Error('poster_url_missing')
  return { poster_url: image.image, provider: 'dashscope', model, prompt: buildPosterPrompt(input) }
}

async function createVideoTask(input) {
  if (!configured()) return null
  const firstFrameUrl = input.firstFrameUrl || input.posterUrl || input.imageUrl
  if (!firstFrameUrl) {
    return {
      status: 'needs_reference',
      provider: 'dashscope',
      model: process.env.VIDEO_MODEL || 'wan2.7-i2v-2026-04-25',
      prompt: buildVlogPrompt(input),
      message: 'firstFrameUrl is required for image-to-video generation'
    }
  }

  const model = process.env.VIDEO_MODEL || 'wan2.7-i2v-2026-04-25'
  const data = await postJson(
    `${baseUrl()}/api/v1/services/aigc/video-generation/video-synthesis`,
    {
      model,
      input: {
        prompt: buildVlogPrompt(input),
        media: [{ type: 'first_frame', url: firstFrameUrl }]
      },
      parameters: {
        resolution: process.env.VIDEO_RESOLUTION || '720P',
        duration: Number(process.env.VIDEO_DURATION || 10),
        prompt_extend: true,
        watermark: false
      }
    },
    { 'X-DashScope-Async': 'enable' }
  )

  const taskId = data && data.output && data.output.task_id
  if (!taskId) throw new Error('video_task_id_missing')
  return { status: 'processing', provider: 'dashscope', model, task_id: taskId, prompt: buildVlogPrompt(input) }
}

async function getVideoTask(taskId) {
  if (!configured() || !taskId || taskId === 'mock-video-task') return null
  const data = await getJson(`${baseUrl()}/api/v1/tasks/${encodeURIComponent(taskId)}`)
  const output = (data && data.output) || {}
  const taskStatus = String(output.task_status || '').toUpperCase()
  const status = taskStatus === 'SUCCEEDED' ? 'completed' : taskStatus === 'FAILED' ? 'failed' : 'processing'
  return {
    status,
    progress: status === 'completed' ? 100 : status === 'failed' ? 0 : 60,
    video_url: output.video_url || '',
    provider: 'dashscope',
    raw_status: taskStatus,
    error: output.message || output.code || ''
  }
}

module.exports = { configured, generateStories, generatePoster, createVideoTask, getVideoTask, buildVlogPrompt, baseUrl }
