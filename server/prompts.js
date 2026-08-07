function buildStoryPrompt(input = {}) {
  const template = input.template || 'goodday'
  return [
    '你是桃紫有光的AI故事导演。不要写硬广告，要从真实农业素材里发现人物、情绪和生活故事。',
    `产品：${input.productName || input.variety || '平谷大桃'}`,
    `地点：${input.location || '北京平谷'}`,
    `用户故事：${input.storyText || '未填写'}`,
    `模板：${template}`,
    '大圣设定：中年、略发福、松弛、有智慧，拿自拍杆记录田间生活；70%治愈，20%智慧，10%西游式生活幽默。',
    '桃子是故事道具，人和生活才是主角。',
    '输出JSON对象，字段stories，包含3个明显不同的故事。每个故事包含title、core、emotion、slogan、dasheng_entry、visual_hook。'
  ].join('\n')
}

function buildPosterPrompt(input = {}) {
  const s = input.storyCore || {}
  return `竖版9:16真实中国乡村生活方式封面，北京平谷盛夏桃园。中年略发福的大圣，桃粉系轻便布衣，手持自拍杆，松弛但保留猴王气场，真实摄影感。故事：${s.title || ''}；情绪：${s.emotion || '治愈、松弛'}；核心：${s.visual_hook || s.core || ''}。晨光或傍晚侧光，桃叶、果袋、成熟蟠桃、田间细节。预留中文标题安全区。不要二维码，不要战斗姿态，不要廉价国潮广告感。`
}

function buildVlogPrompt(input = {}) {
  const s = input.storyCore || {}
  return `真实手机自拍Vlog，竖屏9:16，中年略发福的大圣拿自拍杆走进北京平谷桃园。轻微手持晃动、呼吸、停顿、调整自拍杆；与桃农边走边聊；走到桃树前摸桃、闻桃，在允许后摘下一颗咬一口，另一只手继续自拍。偶尔轻咳、摸肚子、扶腰或被树枝蹭到后笑一下。幽默约10%，来自角色性格。故事：${s.title || ''}。核心：${s.core || ''}。环境有蝉鸣、风吹桃叶和远处人声。不要喊麦，不要站桩卖货，不要战斗。结尾预留2秒干净定格，后期叠加LOGO和真实二维码。`
}

module.exports = { buildStoryPrompt, buildPosterPrompt, buildVlogPrompt }
