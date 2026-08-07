# TaoLight AI Provider Integration v1

## 目标
在不暴露技术复杂度给桃农的前提下，把真实的图像理解、故事核生成、海报生成、视频生成接入小程序。

## 架构原则
1. 小程序只调用 TaoLight 自己的后端/云函数。
2. 所有第三方 API Key 只存在后端环境变量中。
3. 业务页面不直接依赖任何模型厂商。
4. 每种能力至少保留 2 个 provider 适配器，便于按质量/成本切换。
5. 视频生成使用异步任务：submit -> task_id -> polling -> video_url。

## 能力接口
### POST /api/material/analyze
输入：图片 + 用户一句话
输出：scene_type, visual_facts, suggested_emotions

### POST /api/story/generate
输入：视觉分析 + 用户一句话 + template
输出：3 个故事核

### POST /api/poster/generate
输入：用户原图 + 已确认故事核 + 大圣参考图
输出：poster_url

### POST /api/video/generate
输入：poster/story_core/video_prompt/character_reference
输出：video_task_id

### GET /api/video/task/:id
输出：status/progress/video_url/error

## Provider 选择原则
不要只看公开榜单。用同一套“桃仙大圣 Vlog Benchmark”实际出片比较：
- 角色一致性 25%
- 手机自拍/Vlog真实感 20%
- 动作自然度 20%
- 中国乡村场景质感 15%
- 故事服从度 10%
- 单条成本与速度 10%

## MVP落地顺序
1. 真实故事核（最先接）
2. 真实故事核海报
3. 选 2 家视频 provider 生成同一条 10-15 秒样片
4. 选优后接入 30 秒异步工作流
5. 片尾统一由 TaoLight 后端合成 LOGO + 二维码，避免模型把二维码生成错

## 非谈判要求
- 桃农前台永远不出现模型、Prompt、API、参数等技术词。
- 海报与视频失败时自动降级为可重试，不把错误堆栈暴露给用户。
- 二维码不交给图片/视频模型绘制，必须使用真实二维码后期合成。
- 大圣角色参考资产要版本化，生成任务必须记录 character_version。
