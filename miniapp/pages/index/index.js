const COPY = [
  { greeting: '老朋友，好久不见。', hint: '今天想让我帮你发现什么故事？' },
  { greeting: '风刚好，桃子也正甜。', hint: '说说你的故事，俺老孙慢慢听。' },
  { greeting: '别急，好故事会自己发光。', hint: '一张照片、一句话，就能开始。' }
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
      this.setData({
        copyIndex,
        greeting: COPY[copyIndex].greeting,
        hint: COPY[copyIndex].hint
      })
    }, 4200)

    setTimeout(() => this.setData({ welcomed: true }), 700)
  },

  onUnload() {
    clearInterval(this.copyTimer)
  },

  handleSceneTap(event) {
    const { x = 187, y = 330 } = event.detail || {}
    this.setData({
      listening: true,
      rippleX: Math.round((x / 375) * 100),
      rippleY: Math.round((y / 700) * 100)
    })
    wx.vibrateShort({ type: 'light' })
    clearTimeout(this.relaxTimer)
    this.relaxTimer = setTimeout(() => this.setData({ listening: false }), 1600)
  },

  noop() {},

  startStory() {
    wx.showToast({ title: '故事入口即将开启', icon: 'none' })
  },

  openInspiration() {
    const copyIndex = (this.data.copyIndex + 1) % COPY.length
    this.setData({
      copyIndex,
      greeting: COPY[copyIndex].greeting,
      hint: COPY[copyIndex].hint,
      listening: true
    })
    setTimeout(() => this.setData({ listening: false }), 1200)
  }
})