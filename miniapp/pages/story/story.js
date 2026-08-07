const AI = require('../../services/ai')

Page({
  data: { stories: [], selected: -1, loading: true, errorText: '' },

  async onLoad() {
    const input = wx.getStorageSync('taolight_creator_input') || {}
    try {
      const result = await AI.generateStoryCores(input)
      this.setData({ stories: result.stories || [], loading: false })
    } catch (err) {
      this.setData({ loading: false, errorText: '大圣刚才走神了，再试一次。' })
    }
  },

  selectStory(e) {
    this.setData({ selected: Number(e.currentTarget.dataset.index) })
  },

  async retry() {
    this.setData({ loading: true, errorText: '' })
    const input = wx.getStorageSync('taolight_creator_input') || {}
    try {
      const result = await AI.generateStoryCores(input)
      this.setData({ stories: result.stories || [], loading: false })
    } catch (err) {
      this.setData({ loading: false, errorText: '还是没想好，等俺老孙再琢磨一下。' })
    }
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
