Page({
  data: { story: {}, input: {}, progress: 0, statusText: '大圣正在整理故事…' },
  onLoad() {
    this.setData({
      story: wx.getStorageSync('taolight_story_core') || {},
      input: wx.getStorageSync('taolight_creator_input') || {}
    })
    this.simulateProgress()
  },
  onUnload() {
    clearInterval(this.timer)
  },
  simulateProgress() {
    const stages = [
      [20, '大圣正在整理故事…'],
      [45, '正在想第一句怎么开口…'],
      [70, '正在安排桃园里的镜头…'],
      [90, '正在加一点大圣自己的小脾气…'],
      [100, '故事准备好了。']
    ]
    let i = 0
    this.timer = setInterval(() => {
      const [progress, statusText] = stages[i]
      this.setData({ progress, statusText })
      i += 1
      if (i >= stages.length) clearInterval(this.timer)
    }, 650)
  },
  restart() {
    wx.reLaunch({ url: '/pages/create/create' })
  }
})