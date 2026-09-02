# V6 服务开通清单

界面只在服务真实可用后显示“已连接/已开通”。静态网页发布并不等于以下外部服务已经上线。

## AI 服务端复核

1. 部署更新后的 `coach-feedback` Edge Function。
2. 配置 `GEMINI_API_KEY` 与可用的 `GEMINI_COACH_MODEL`。
3. 用 6 条脱敏训练记录验证 phase 模式，并检查红旗样本不能被模型改成进阶。

## 华为运动健康

1. 在华为开发者平台完成 Account Kit 与 Health Service Kit 申请及验证。
2. 申请最小范围：活动、睡眠、心率；不得申请与训练决策无关的数据。
3. 在安全服务端实现 OAuth 2.0 Authorization Code、token加密存储、刷新、撤权和数据删除。
4. 配置 `HUAWEI_HEALTH_CLIENT_ID`、`HUAWEI_HEALTH_CLIENT_SECRET`、`HUAWEI_HEALTH_AUTH_START_URL`、`HUAWEI_HEALTH_APPROVED=true` 后部署 `huawei-health`。
5. 同步数据必须保存来源、采集时间和新鲜度；睡眠/心率只用于个人基线比较。

## 离线提醒

1. PWA Service Worker 与用户主动授权已经实现。
2. 支持 Periodic Background Sync 的已安装浏览器可尽力后台触发；不支持时只在应用进程存活期间准时触发。
3. 要达到跨浏览器可靠推送，仍需 VAPID Web Push 订阅、服务端队列和失败重试，且必须提供一键退订。

## 真人专家与SLA

1. 执行 `schema-v6-services.sql`，部署 `expert-service`。
2. 建立实名专家名单、资质核验、服务时段、升级联系人和隐私协议。
3. 配置 `EXPERT_SERVICE_ENABLED=true` 与 `EXPERT_ROSTER_ID` 后，才允许前端创建工单。
4. 安全复核目标4小时，普通训练调整目标24小时；胸痛、晕厥、明显呼吸困难、突发视力变化不进入SLA等待，直接线下就医。
