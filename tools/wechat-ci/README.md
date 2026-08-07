# TaoLight 微信小程序阶段预览

目标：每个阶段版本都能生成微信小程序预览二维码，供产品负责人直接手机体验。

## 所需环境变量

- `MINIPROGRAM_APPID`：真实微信小程序 AppID
- `MINIPROGRAM_PRIVATE_KEY_PATH`：微信公众平台下载的代码上传密钥文件本地路径
- `MINIPROGRAM_ROBOT`：可选，默认 1

密钥文件绝不能提交到 GitHub。

## 生成预览二维码

```bash
cd tools/wechat-ci
npm install
MINIPROGRAM_APPID=xxx MINIPROGRAM_PRIVATE_KEY_PATH=/absolute/path/private.key npm run preview
```

输出：`tools/wechat-ci/preview-qrcode.png`

## 上传体验版代码

```bash
MINIPROGRAM_APPID=xxx MINIPROGRAM_PRIVATE_KEY_PATH=/absolute/path/private.key MINIPROGRAM_VERSION=0.1.0 npm run upload
```

## 发布纪律

每次阶段验收必须同时给出：
1. 微信小程序预览二维码/体验版入口；
2. 当前 commit SHA；
3. H5 镜像体验入口（若可用）；
4. 本阶段变化与已知问题。
