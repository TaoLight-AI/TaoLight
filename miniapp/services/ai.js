// TaoLight AI service contract.
// MVP uses mock data. Real provider calls must live behind backend/cloud functions.

function analyzeMaterial(input) {
  return Promise.resolve({
    scene: input.imagePath ? 'peach_image' : 'unknown',
    notes: ['检测到桃子素材', '建议优先使用真实人物与田间场景']
  })
}

function generateStoryCores(input) {
  return Promise.resolve({ taskId: 'mock-story-task', input })
}

function generatePoster(input) {
  return Promise.resolve({
    poster_url: '',
    story_core: input.storyCore || {},
    provider: 'mock'
  })
}

function generateVideo(input) {
  return Promise.resolve({
    video_prompt: input.videoPrompt || '',
    video_task_id: 'mock-video-task',
    video_url: '',
    status: 'mock_ready',
    platform_copy: {
      douyin: '退休后的蟠桃园长，为什么跑到平谷来了？',
      xiaohongshu: '今天跟着大圣去桃园里慢了一会儿。'
    }
  })
}

function getVideoTask() {
  return Promise.resolve({ status: 'completed', progress: 100, video_url: '' })
}

module.exports = {
  analyzeMaterial,
  generateStoryCores,
  generatePoster,
  generateVideo,
  getVideoTask
}
