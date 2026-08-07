# 微信小程序账号信息

当前已知：

- 小程序名称/标识：WWKitchen
- 原始ID：`gh_651608241ee9`

重要说明：微信公众平台的“原始ID”不是 AppID，不能填写到 `project.config.json` 的 `appid` 字段，也不能用于 `miniprogram-ci` 生成预览二维码。

因此当前 `miniapp/project.config.json` 继续保留游客 AppID，避免写入错误标识。

后续仅需补齐两项即可打通真实预览：

1. 微信公众平台 → 开发 → 开发管理 → 开发设置 中的 AppID（通常形如 `wx...`）；
2. 代码上传密钥，仅保存在本地/Codex安全环境，不提交 GitHub。

在这两项补齐前，其余产品、AI Gateway、故事核、海报、视频接口、UI及测试工作继续推进，不阻塞开发。
