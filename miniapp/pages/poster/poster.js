Page({
  data: { story: {}, input: {} },
  onLoad() {
    this.setData({
      story: wx.getStorageSync('taolight_story_core') || {},
      input: wx.getStorageSync('taolight_creator_input') || {}
    })
  },
  regenerate() {
    wx.showToast({ title: '体验版：下一版接真实生图', icon: 'none' })
  },
  confirm() {
    wx.navigateTo({ url: '/pages/result/result' })
  }
})