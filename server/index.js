const http = require('http')

const PORT = Number(process.env.PORT || 8787)

const STORY_LIBRARY = {
  goodday: [
    { title: '今天不赶路，陪你看看桃熟了没有', core: '把忙碌留在山外，大圣在桃园里陪一个普通人把日子慢下来。', emotion: '治愈 · 松弛', slogan: '生活再累，也得给自己留一口甜。' },
    { title: '退休以后，大圣终于学会慢下来', core: '从十万八千里的筋斗，到一亩桃园的风，真正的好日子原来不必赶。', emotion: '松弛 · 人间烟火', slogan: '好桃要慢慢长，好日子也一样。' },
    { title: '一颗桃，留住了一个夏天', core: '桃子不是商品，而是一家人坐下来、把日子过慢一点的理由。', emotion: '家庭 · 治愈', slogan: '甜一点，日子就亮一点。' }
  ],
  farmer: [
    { title: '种了二十年桃，他第一次想让更多人知道', core: '桃农把半辈子交给桃树，却一直没人知道他的名字。', emotion: '人物 · 传承', slogan: '认真生活的人，值得被看见。' },
    { title: '天上的蟠桃园长，也佩服这个种桃的人', core: '大圣见过仙桃，却第一次认真看见一颗桃背后真正的辛苦。', emotion: '尊重 · 温暖', slogan: '神仙见过桃，俺老孙今天见到了种桃的人。' },
    { title: '父亲留下的不是桃园，是一段日子', core: '一片桃园把两代人的时间连在一起，桃熟的时候，记忆也跟着甜起来。', emotion: '亲情 · 传承', slogan: '有些甜，是一代人留给下一代的。' }
  ],
  vlog: [
    { title: '蟠桃园长下凡第一天，就忍不住偷吃了', core: '大圣本想认真探园，结果看到桃子，边举着自拍杆边摘了一颗。', emotion: '反差 · 幽默', slogan: '这不是偷吃，这是专业鉴定。' },
    { title: '大圣第一次学给桃套袋，嘴硬了三分钟', core: '会七十二变的大圣，被一个桃袋难住，最后老老实实向桃农请教。', emotion: '幽默 · 真实', slogan: '会七十二变，不代表会七十二种农活。' },
    { title: '不在天庭当牛马，只在平谷做桃仙', core: '大圣拿着自拍杆逃离天庭KPI，在平谷桃园重新找回生活。', emotion: '反差 · 治愈', slogan: '不在天庭当牛马，只在平谷做桃仙。' }
  ]
}

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

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {})
  if (req.url === '/health') return json(res, 200, { ok: true, service: 'taolight-ai-gateway', mode: 'mock-first' })

  if (req.method === 'POST' && req.url === '/v1/material/analyze') {
    const input = await body(req).catch(() => ({}))
    return json(res, 200, { scene: input.imagePath ? 'peach_image' : 'unknown', notes: ['优先识别真实桃、桃树、桃园和人物关系', '故事优先，不把参数堆给桃农'] })
  }

  if (req.method === 'POST' && req.url === '/v1/story/cores') {
    const input = await body(req).catch(() => ({}))
    const template = input.template || 'goodday'
    return json(res, 200, { taskId: `story-${Date.now()}`, stories: STORY_LIBRARY[template] || STORY_LIBRARY.goodday })
  }

  if (req.method === 'POST' && req.url === '/v1/poster/generate') {
    const input = await body(req).catch(() => ({}))
    return json(res, 200, { poster_url: '', story_core: input.storyCore || {}, provider: 'mock', status: 'preview_ready' })
  }

  if (req.method === 'POST' && req.url === '/v1/video/generate') {
    return json(res, 200, { video_task_id: 'mock-video-task', status: 'processing' })
  }

  if (req.method === 'GET' && req.url.startsWith('/v1/video/tasks/')) {
    return json(res, 200, {
      status: 'completed', progress: 100, video_url: '',
      platform_copy: {
        douyin: '退休后的蟠桃园长，为什么跑到平谷来了？',
        xiaohongshu: '今天跟着大圣去桃园里慢了一会儿。'
      }
    })
  }

  return json(res, 404, { error: 'not_found' })
})

server.listen(PORT, () => console.log(`TaoLight AI gateway listening on http://127.0.0.1:${PORT}`))
