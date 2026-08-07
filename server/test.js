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
  const child = spawn(process.execPath, ['index.js'], { cwd: __dirname, stdio: ['ignore', 'ignore', 'inherit'] })
  await new Promise(r => setTimeout(r, 350))
  try {
    const health = await request('/health')
    if (health.status !== 200 || !health.body.ok) throw new Error('health check failed')

    const story = await request('/v1/story/cores', 'POST', { template: 'vlog', storyText: '父亲留下的桃园' })
    if (story.status !== 200 || !Array.isArray(story.body.stories) || story.body.stories.length !== 3) throw new Error('story endpoint failed')

    const video = await request('/v1/video/generate', 'POST', {})
    if (video.status !== 200 || !video.body.video_task_id) throw new Error('video endpoint failed')

    const task = await request(`/v1/video/tasks/${video.body.video_task_id}`)
    if (task.status !== 200 || task.body.progress !== 100) throw new Error('video task endpoint failed')

    console.log('PASS: AI gateway smoke test')
  } finally {
    child.kill()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
