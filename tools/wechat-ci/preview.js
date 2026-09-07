const path = require('path')
const ci = require('miniprogram-ci')

const appid = process.env.MINIPROGRAM_APPID
const privateKeyPath = process.env.MINIPROGRAM_PRIVATE_KEY_PATH
const robot = Number(process.env.MINIPROGRAM_ROBOT || 1)

if (!appid || !privateKeyPath) {
  console.error('Missing MINIPROGRAM_APPID or MINIPROGRAM_PRIVATE_KEY_PATH')
  process.exit(1)
}

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath: path.resolve(__dirname, '../../miniapp'),
  privateKeyPath,
  ignores: ['node_modules/**/*']
})

ci.preview({
  project,
  desc: process.env.PREVIEW_DESC || 'TaoLight stage preview',
  setting: { es6: true, minify: true },
  qrcodeFormat: 'image',
  qrcodeOutputDest: path.resolve(__dirname, 'preview-qrcode.png'),
  robot,
  onProgressUpdate: console.log
}).then(() => {
  console.log('Preview generated: tools/wechat-ci/preview-qrcode.png')
}).catch(err => {
  console.error(err)
  process.exit(1)
})
