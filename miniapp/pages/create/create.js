const TEMPLATES = [
  { id: 'goodday', title: '桃园里的好日子', tag: '治愈 · 松弛' },
  { id: 'farmer', title: '种桃人的故事', tag: '人物 · 传承' },
  { id: 'vlog', title: '大圣探桃Vlog', tag: '反差 · 传播' }
]

Page({
  data: {
    imagePath: '',
    storyText: '',
    templates: TEMPLATES,
    selectedTemplate: 'goodday'
  },

  goBack() {
    wx.navigateBack()
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => this.setData({ imagePath: res.tempFiles[0].tempFilePath })
    })
  },

  onStoryInput(e) {
    this.setData({ storyText: e.detail.value })
  },

  chooseTemplate(e) {
    this.setData({ selectedTemplate: e.currentTarget.dataset.id })
  },

  submit() {
    if (!this.data.imagePath) {
      wx.showToast({ title: '先让俺老孙看看桃', icon: 'none' })
      return
    }
    const payload = {
      imagePath: this.data.imagePath,
      storyText: this.data.storyText || '这颗桃，想让更多人看见。',
      template: this.data.selectedTemplate
    }
    wx.setStorageSync('taolight_creator_input', payload)
    wx.navigateTo({ url: '/pages/story/story' })
  }
})