const AI = require('../../services/ai')

Page({
  data: { story: {}, input: {}, posterUrl: '', loading: false, provider: 'mock' },

  onLoad() {
    this.setData({
      story: wx.getStorageSync('taolight_story_core') || {},
      input: wx.getStorageSync('taolight_creator_input') || {}
    })
    this.generatePoster()
  },

  async generatePoster() {
    this.setData({ loading: true })
    try {
      const result = await AI.generatePoster({
        storyCore: this.data.story,
        input: this.data.input
      })
      this.setData({
        posterUrl: result.poster_url || '',
        provider: result.provider || 'unknown',
        loading: false
      })
      wx.setStorageSync('taolight_poster_result', result)
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: '海报没生成好，再来一次', icon: 'none' })
    }
  },

  regenerate() {
    this.generatePoster()
  },

  confirm() {
    wx.navigateTo({ url: '/pages/result/result' })
  }
})
