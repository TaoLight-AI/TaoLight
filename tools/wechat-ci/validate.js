const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '../..')
const miniapp = path.join(root, 'miniapp')
const required = [
  'app.js',
  'app.json',
  'app.wxss',
  'project.config.json',
  'pages/index/index.js',
  'pages/index/index.wxml',
  'pages/create/create.js',
  'pages/create/create.wxml',
  'pages/story/story.js',
  'pages/story/story.wxml',
  'pages/poster/poster.js',
  'pages/poster/poster.wxml',
  'pages/result/result.js',
  'pages/result/result.wxml'
]

let failed = false
for (const rel of required) {
  const full = path.join(miniapp, rel)
  if (!fs.existsSync(full)) {
    console.error(`MISSING: miniapp/${rel}`)
    failed = true
  }
}

try {
  const app = JSON.parse(fs.readFileSync(path.join(miniapp, 'app.json'), 'utf8'))
  const pages = new Set(app.pages || [])
  for (const p of ['pages/index/index','pages/create/create','pages/story/story','pages/poster/poster','pages/result/result']) {
    if (!pages.has(p)) {
      console.error(`MISSING PAGE REGISTRATION: ${p}`)
      failed = true
    }
  }
} catch (err) {
  console.error('INVALID app.json:', err.message)
  failed = true
}

if (failed) process.exit(1)
console.log('TaoLight miniapp validation passed.')
