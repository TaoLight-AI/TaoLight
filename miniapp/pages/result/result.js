const AI = require('../../services/ai')

Page({
  data: {
    story: {},
    input: {},
    progress: 0,
    statusText: '大圣正在整理故事…',
    taskId: '',
    videoUrl: '',
    platformCopy: {},
    provider: 'mock',
    needsReference: false,
    failed: false
  },

  onLoad() {
    this.setData({
      story: wx.getStorageSync('taolight_story_core') || {},
      input: wx.getStorageSync('taolight_creator_input') || {}
    })
    this.startVideoTask()
  },

  onUnload() {
    clearInterval(this.timer)
  },

  async startVideoTask() {
    try {
      const poster = wx.getStorageSync('taolight_poster_result') || {}
      const result = await AI.generateVideo({
        storyCore: this.data.story,
        input: this.data.input,
        posterUrl: poster.poster_url || '',
        videoPrompt: this.buildVideoPrompt()
      })
      this.setData({
        taskId: result.video_task_id || '',
        videoUrl: result.video_url || '',
        platformCopy: result.platform_copy || {},
        provider: result.provider || 'unknown'
      })

      if (result.status === 'needs_reference') {
        this.setData({
          needsReference: true,
          progress: 100,
          statusText: '故事导演稿已准备好，等首帧海报就能生成成片。'
        })
        return
      }

      if (result.status === 'failed') {
        this.setData({ failed: true, progress: 0, statusText: '这条片子没生成好，先保留导演稿。' })
        return
      }

      if (result.status === 'completed' || result.video_url) {
        this.setData({ progress: 100, statusText: '故事准备好了。' })
      } else if (result.video_task_id) {
        this.pollVideoTask()
      } else {
        this.simulateProgress()
      }
    } catch (err) {
      this.simulateProgress()
    }
  },

  buildVideoPrompt() {
    const story = this.data.story || {}
    return [
      '中年略发福的桃仙大圣，手持自拍杆，在真实平谷桃园拍第一人称生活Vlog。',
      `故事核：${story.core || ''}`,
      `标题：${story.title || ''}`,
      `情绪：${story.emotion || '治愈 · 松弛'}`,
      '自然与桃农一问一答，可边说边摸桃、闻桃、摘桃咬一口、调整自拍杆。',
      '真实感来自角色性格与生活小动作，不使用AI错误制造真实感。',
      '10%轻幽默/西游彩蛋，整体像种田文式松弛生活记录。',
      '结尾预留3秒品牌落版，LOGO和二维码由后期程序叠加。'
    ].join('\n')
  },

  pollVideoTask() {
    const stages = {
      queued: [18, '大圣正在找个顺眼的机位…'],
      processing: [58, '正在桃园里边走边拍…'],
      compositing: [84, '正在把故事和镜头缝在一起…']
    }
    clearInterval(this.timer)
    this.timer = setInterval(async () => {
      try {
        const result = await AI.getVideoTask(this.data.taskId)
        const fallback = stages[result.status] || [result.progress || 72, '大圣还在忙活…']
        this.setData({
          progress: result.progress == null ? fallback[0] : result.progress,
          statusText: result.status === 'completed' ? '故事准备好了。' : result.status === 'failed' ? '这条片子没生成好，先保留导演稿。' : fallback[1],
          videoUrl: result.video_url || this.data.videoUrl,
          failed: result.status === 'failed'
        })
        if (result.status === 'completed' || result.status === 'failed') clearInterval(this.timer)
      } catch (err) {
        clearInterval(this.timer)
        this.simulateProgress()
      }
    }, 2000)
  },

  simulateProgress() {
    const stages = [
      [20, '大圣正在整理故事…'],
      [45, '正在想第一句怎么开口…'],
      [70, '正在安排桃园里的镜头…'],
      [90, '正在加一点大圣自己的小脾气…'],
      [100, '导演稿准备好了。']
    ]
    let i = 0
    clearInterval(this.timer)
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
