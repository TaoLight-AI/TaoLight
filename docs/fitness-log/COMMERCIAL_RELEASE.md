# AI教练商业版本验收与阻断项

日期：2026-09-07。当前状态：开发分支，不可标为商业正式版。

## 本轮实现
- 版本化确定性训练决策：两次完整训练、全部组达到次数上限且实测RIR≥3才允许考虑加重；受限档案冻结自动进阶。
- 每组RIR、空车0kg记录、跨动作误记撤销、完整历史、睡眠与围度记录。
- taolight-coach-data v2导出包含本机新训练、已迁移历史、餐食、睡眠和档案；训练导入先校验日期、单位、重复及本人确认。v1无结构化组次的记录不能直接自动导入。
- 华为OAuth服务代码：用户鉴权、一次性状态、AES-GCM令牌加密、刷新、解除连接、数据删除、来源与时间、幂等写入。
- 缓存只处理同源静态资源，不缓存带授权头的请求，不将HTML作为API离线响应。

## 正式发布阻断项
1. 华为已审批的应用、获批scope、回调域名、服务器密钥配置。需根据中国区获批API完成HUAWEI_DATA_ADAPTER_URL适配与真机联调。当前未读取真实手表数据，不宣称接入完成。
2. 统一商业账户：现有训练仍以本机账户为主，华为服务使用Supabase Auth。需完成统一登录、跨设备同步、找回/注销、账户切换和权限实测后才允许收费。
3. 付费主体、支付商户、定价、续费与退款规则、签名回调、订单对账未完成。
4. 现有AI和餐食服务需验证部署、身份校验、限流、费用预算、重试及服务监控。禁止用固定输出冒充在线模型。
5. 真人专家尚需资质、排班、响应时段及真实接收工单的组织。
6. 完整手机端浏览器与微信实测未完成；本次云浏览器无法访问本机预览。未将不可用预览冒充验收。
7. 身体扫描、动作视觉识别需取得模型/内容授权并验证准确度；当前不提供照片体脂或关节角度诊断。
8. 隐私政策、单独健康数据同意、删除/导出、备份恢复、审计、渗透测试需完成运营验收。

## 华为部署配置（只在服务端设置，禁止提交密钥）
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
HUAWEI_HEALTH_CLIENT_ID, HUAWEI_HEALTH_CLIENT_SECRET,
HUAWEI_HEALTH_REDIRECT_URI（huawei-oauth?action=callback）, HUAWEI_HEALTH_SCOPES,
HUAWEI_HEALTH_APPROVED=true, COACH_APP_URL,
HEALTH_TOKEN_ENCRYPTION_KEY（32随机字节base64）, HUAWEI_DATA_ADAPTER_URL, HUAWEI_DATA_ADAPTER_SECRET。
执行schema-v8-health.sql，部署huawei-oauth。回调路径关闭网关JWT，函数内验证所有非回调请求。
适配器只接收令牌及日期窗口，返回samples数组：source_id/metric/value/unit/measured_at。
允许metric：steps(count)、sleep_minutes(min)、heart_rate(bpm)、resting_heart_rate(bpm)。不猜测scope名称或中国区API路径。

## 验证
node tests/coach-engine.test.cjs
node tests/coach-session.test.cjs
node tests/fitness-steward-flow.test.mjs
以上为自动化逻辑验证；不等同于真机、支付或华为平台验收。

## 对标来源
- https://play.google.com/store/apps/details?id=coach.zing.fitness
- https://zingcoach.zendesk.com/hc/en-us/articles/15325477532316-Body-Scan
- https://developer.huawei.com/consumer/en/doc/hmscore-guides/apply-kitservice-0000001050071707
- https://developer.huawei.com/consumer/en/doc/hmscore-guides/open-platform-oauth-0000001053629189
