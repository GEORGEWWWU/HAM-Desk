// function/useDownImage.ts
export async function downloadImage(src: string, filename?: string): Promise<void> {
  try {
    // 如果是相对路径，通过主进程获取图片数据
    if (src.startsWith('../assets/')) {
      const fileName = src.replace('../assets/', '')
      
      // 显示保存对话框
      const result = await window.electronAPI.showSaveDialog({
        defaultPath: filename || fileName,
        filters: [
          { name: 'PNG Images', extensions: ['png'] },
          { name: 'JPEG Images', extensions: ['jpg', 'jpeg'] },
          { name: 'GIF Images', extensions: ['gif'] },
          { name: 'SVG Images', extensions: ['svg'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      
      if (result.filePath) {
        // 通过主进程直接复制文件
        const copyResult = await window.electronAPI.copyAssetFile(fileName, result.filePath)
        if (copyResult.success) {
          console.log('图片保存成功:', result.filePath)
        } else {
          console.error('图片保存失败:', copyResult.error)
          throw new Error(copyResult.error || '保存失败')
        }
      } else {
        console.log('用户取消了保存')
      }
    } else {
      // 对于网络图片或其他绝对路径，使用原来的方式
      const response = await fetch(src)
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`)
      }
      
      // 获取图片数据
      const buffer = await response.arrayBuffer()
      
      // 显示保存对话框
      const result = await window.electronAPI.showSaveDialog({
        defaultPath: filename || src.split('/').pop(),
        filters: [
          { name: 'PNG Images', extensions: ['png'] },
          { name: 'JPEG Images', extensions: ['jpg', 'jpeg'] },
          { name: 'GIF Images', extensions: ['gif'] },
          { name: 'SVG Images', extensions: ['svg'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      
      if (result.filePath) {
        // 保存图片到用户选择的位置
        await window.electronAPI.writeFile(result.filePath, Buffer.from(buffer))
        console.log('图片保存成功:', result.filePath)
      } else {
        console.log('用户取消了保存')
      }
    }
  } catch (error) {
    console.error('保存失败:', error)
    throw error
  }
}
