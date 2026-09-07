# TaoLight 微信小程序阶段预览

目标：每个阶段版本都能生成微信小程序预览二维码，供产品负责人直接手机体验。

## 所需环境变量

- `MINIPROGRAM_APPID`：真实微信小程序 AppID
- `MINIPROGRAM_PRIVATE_KEY_PATH`：微信公众平台下载的代码上传密钥文件本地路径
- `MINIPROGRAM_ROBOT`：可选，默认 1

密钥文件绝不能提交到 GitHub。

## 阶段闸门（必须遵守）

任何阶段版本在提交/合并前必须依次完成：

1. `npm run validate`：检查小程序关键文件和页面注册；
2. `npm run preview`：真实生成微信预览二维码；
3. 用手机微信扫码，确认能打开；
4. 手动走完本阶段新增功能，确认主路径可用；
5. 若任一步失败，继续修改并重复 1-4；
6. 只有全部通过后，才允许标记 PR Ready / 合并。

以后每个阶段验收必须同时给出：
- 微信预览二维码/体验版入口；
- 当前 commit SHA；
- 本阶段已验证的功能；
- 已知问题（若有）。

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

## 说明

不再把第三方 HTML 镜像链接当作阶段验收入口。正式阶段验收以微信预览二维码/体验版为准。
