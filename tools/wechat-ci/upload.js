const path = require('path')
const ci = require('miniprogram-ci')

const appid = process.env.MINIPROGRAM_APPID
const privateKeyPath = process.env.MINIPROGRAM_PRIVATE_KEY_PATH
const version = process.env.MINIPROGRAM_VERSION || '0.1.0'
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

ci.upload({
  project,
  version,
  desc: process.env.UPLOAD_DESC || 'TaoLight stage build',
  setting: { es6: true, minify: true },
  robot,
  onProgressUpdate: console.log
}).then(() => console.log(`Uploaded version ${version}`))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
