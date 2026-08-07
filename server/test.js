const { spawn } = require('child_process')
const http = require('http')

function request(path, method = 'GET', data) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : ''
    const req = http.request({ hostname: '127.0.0.1', port: 8787, path, method, headers: payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {} }, res => {
      let raw = ''
      res.on('data', c => { raw += c })
      res.on('end', () => resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : {} }))
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

async function main() {
  const child = spawn(process.execPath, ['index.js'], { cwd: __dirname, stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, DASHSCOPE_API_KEY: '', DASHSCOPE_WORKSPACE_ID: '' } })
  await new Promise(r => setTimeout(r, 400))
  try {
    const health = await request('/health')
    if (health.status !== 200 || !health.body.ok) throw new Error('health check failed')

    const provider = await request('/v1/provider/status')
    if (provider.status !== 200 || provider.body.configured !== false) throw new Error('provider status failed')

    const story = await request('/v1/story/cores', 'POST', { template: 'vlog', storyText: '父亲留下的桃园', variety: '瑞蟠25' })
    if (story.status !== 200 || !Array.isArray(story.body.stories) || story.body.stories.length !== 3 || story.body.provider !== 'mock') throw new Error('story endpoint failed')

    const poster = await request('/v1/poster/generate', 'POST', { storyCore: story.body.stories[0] })
    if (poster.status !== 200 || poster.body.status !== 'preview_ready') throw new Error('poster fallback failed')

    const video = await request('/v1/video/generate', 'POST', { storyCore: story.body.stories[0] })
    if (video.status !== 200 || !video.body.video_task_id || !video.body.prompt) throw new Error('video endpoint failed')

    const task = await request(`/v1/video/tasks/${video.body.video_task_id}`)
    if (task.status !== 200 || task.body.progress !== 100) throw new Error('video task endpoint failed')

    console.log('PASS: AI gateway smoke test')
  } finally {
    child.kill()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
