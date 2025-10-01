import { ipcMain, IpcMainEvent } from 'electron'
import { IPost, IPostDb } from '../interfaces/post'
import Posts from '../posts'

export default class PostEvents {
  constructor(appInstance: any) {
    ipcMain.removeAllListeners('app-post-create')
    ipcMain.removeAllListeners('app-post-created')
    ipcMain.removeAllListeners('app-post-delete')
    ipcMain.removeAllListeners('app-post-deleted')
    ipcMain.removeAllListeners('app-post-list-delete')
    ipcMain.removeAllListeners('app-post-list-deleted')
    ipcMain.removeAllListeners('image-upload')
    ipcMain.removeAllListeners('image-uploaded')

    const posts = new Posts(appInstance)

    ipcMain.on('app-post-create', async (event: IpcMainEvent, post: IPost) => {
      const data = await posts.savePostToFile(post)
      event.sender.send('app-post-created', data)
    })

    ipcMain.on('app-post-delete', async (event: IpcMainEvent, post: IPostDb) => {
      try {
        const data = await posts.deletePost(post)
        // Ensure only serializable data is sent
        event.sender.send('app-post-deleted', { success: !!data })
      } catch (error) {
        console.error('Error deleting post:', error)
        event.sender.send('app-post-deleted', { success: false, error: error.message })
      }
    })

    ipcMain.on('app-post-list-delete', async (event: IpcMainEvent, postList: IPostDb[]) => {
      try {
        let allSuccess = true
        for (const post of postList) {
          const result = await posts.deletePost(post)
          if (!result) allSuccess = false
        }

        // Ensure only serializable data is sent
        event.sender.send('app-post-list-deleted', { success: allSuccess })
      } catch (error) {
        console.error('Error deleting post list:', error)
        event.sender.send('app-post-list-deleted', { success: false, error: error.message })
      }
    })

    ipcMain.on('image-upload', async (event: IpcMainEvent, files: any[]) => {
      console.log('执行了上传图片', files)
      const data = await posts.uploadImages(files)
      event.sender.send('image-uploaded', data)
    })
  }
}
