const STORY_MAP = {
  goodday: [
    { title: '今天不赶路，陪你看看桃熟了没有', core: '把城市里的忙碌留在山外，大圣在桃园里学会慢下来。', emotion: '治愈 · 松弛', slogan: '生活再累，也得给自己留一口甜。' },
    { title: '退休以后，大圣终于学会慢下来', core: '从十万八千里的筋斗，到一亩桃园的风，大圣第一次觉得慢也很好。', emotion: '松弛 · 人间烟火', slogan: '好桃要慢慢长，好日子也一样。' },
    { title: '一颗桃，留住了一个夏天', core: '桃子不是商品，而是一家人坐下来、把日子过慢一点的理由。', emotion: '家庭 · 治愈', slogan: '甜一点，日子就亮一点。' }
  ],
  farmer: [
    { title: '种了二十年桃，他第一次想让更多人知道', core: '桃农把半辈子交给桃树，却一直没人知道他的名字。', emotion: '人物 · 传承', slogan: '认真生活的人，值得被看见。' },
    { title: '天上的蟠桃园长，也佩服这个种桃的人', core: '大圣见过仙桃，却第一次看见一颗桃背后真正的辛苦。', emotion: '尊重 · 温暖', slogan: '神仙见过桃，俺老孙今天见到了种桃的人。' },
    { title: '父亲留下的不是桃园，是一段日子', core: '一片桃园把父子两代人的时间连在一起。', emotion: '亲情 · 传承', slogan: '有些甜，是一代人留给下一代的。' }
  ],
  vlog: [
    { title: '蟠桃园长下凡第一天，就忍不住偷吃了', core: '大圣本想认真探园，结果看到瑞蟠25，边直播边摘了一颗。', emotion: '反差 · 幽默', slogan: '这不是偷吃，这是专业鉴定。' },
    { title: '大圣第一次学给桃套袋，嘴硬了三分钟', core: '会七十二变的大圣，被一个桃袋难住，最后向桃农认真请教。', emotion: '幽默 · 真实', slogan: '会七十二变，不代表会七十二种农活。' },
    { title: '不在天庭当牛马，只在平谷做桃仙', core: '大圣拿着自拍杆逃离天庭KPI，在平谷桃园重新找回生活。', emotion: '反差 · 治愈', slogan: '不在天庭当牛马，只在平谷做桃仙。' }
  ]
}

Page({
  data: { stories: [], selected: -1 },
  onLoad() {
    const input = wx.getStorageSync('taolight_creator_input') || {}
    this.setData({ stories: STORY_MAP[input.template] || STORY_MAP.goodday })
  },
  selectStory(e) {
    this.setData({ selected: Number(e.currentTarget.dataset.index) })
  },
  confirm() {
    if (this.data.selected < 0) {
      wx.showToast({ title: '挑一个最像你的故事', icon: 'none' })
      return
    }
    wx.setStorageSync('taolight_story_core', this.data.stories[this.data.selected])
    wx.navigateTo({ url: '/pages/poster/poster' })
  }
})