# ChatGPT 校准模式

## 目的
在正式申请/接入第三方 API 前，先用当前 ChatGPT 对故事、海报视觉、Vlog结构反复校准；把确认后的结果固化为 fixtures，让小程序按真实产品结构运行。

## 重要边界
ChatGPT Plus/客户端本身不能直接作为小程序后端 API 被程序自动调用。当前阶段采用“人工智能导演 + 固化夹具”的校准方式：

1. 桃农输入测试资料；
2. ChatGPT 生成/调整 3 个故事核；
3. 确认后的结构化结果写入 `server/fixtures/chatgpt-calibrated.json`；
4. 小程序读取同样的数据结构完成页面与交互测试；
5. ChatGPT 同步生成海报视觉与视频导演标准，用于角色、镜头、情绪测试；
6. 等产品结构稳定后，再把同一 schema 换成真实 API。

这样可以先验证“内容正确不正确”，再付 API 成本，避免把模型问题、Prompt问题和UI问题混在一起。

## Story Schema
每个故事核固定字段：

```json
{
  "title": "",
  "core": "",
  "emotion": "",
  "slogan": "",
  "hook": "",
  "poster_scene": ""
}
```

正式 API 必须兼容这个 schema。后续推荐使用 Structured Outputs / JSON Schema 约束，减少模型返回结构漂移。

## 校准标准

- 桃子不是主角，人物和情绪才是主角。
- 用户端不得出现 Prompt、模型、分辨率、参数选择。
- 70% 治愈与松弛，20% 智慧/人物价值，10% 西游式幽默。
- 大圣真实感来自性格和生活动作，不来自 AI 穿帮。
- Vlog必须像真实手机创作者：自拍杆、轻微晃动、停顿、观察、问桃农、偶尔摘桃品尝。
- 广告信息后置；先让观众想看故事，再自然产生购买兴趣。

## API 替换原则
校准期：ChatGPT -> fixture -> 小程序

生产期：用户输入 -> AI Gateway -> provider -> 同一 schema -> 小程序

前端页面不因模型替换而重写。