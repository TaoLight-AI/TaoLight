const COPY = [
  { greeting: '老朋友，好久不见。', hint: '俺老孙今天又发现了一件有意思的事。' },
  { greeting: '以前俺管天上的蟠桃园。', hint: '现在嘛，喜欢看看人间的桃。' },
  { greeting: '生活再累，也得给自己留一口甜。', hint: '坐一会儿，听听风，也听听你的故事。' }
]

Page({
  data: {
    copyIndex: 0,
    greeting: COPY[0].greeting,
    hint: COPY[0].hint,
    welcomed: false,
    listening: false,
    rippleX: 50,
    rippleY: 50
  },

  onLoad() {
    this.copyTimer = setInterval(() => {
      const copyIndex = (this.data.copyIndex + 1) % COPY.length
      this.setData({ copyIndex, greeting: COPY[copyIndex].greeting, hint: COPY[copyIndex].hint })
    }, 4800)
    setTimeout(() => this.setData({ welcomed: true }), 500)
  },

  onUnload() {
    clearInterval(this.copyTimer)
    clearTimeout(this.relaxTimer)
  },

  handleSceneTap(event) {
    const { x = 187, y = 330 } = event.detail || {}
    this.setData({ listening: true, rippleX: Math.round((x / 375) * 100), rippleY: Math.round((y / 700) * 100) })
    wx.vibrateShort({ type: 'light' })
    clearTimeout(this.relaxTimer)
    this.relaxTimer = setTimeout(() => this.setData({ listening: false }), 1600)
  },

  noop() {},

  startStory() {
    wx.navigateTo({ url: '/pages/create/create' })
  },

  openInspiration() {
    const copyIndex = (this.data.copyIndex + 1) % COPY.length
    this.setData({ copyIndex, greeting: COPY[copyIndex].greeting, hint: COPY[copyIndex].hint, listening: true })
    clearTimeout(this.relaxTimer)
    this.relaxTimer = setTimeout(() => this.setData({ listening: false }), 1200)
  }
})