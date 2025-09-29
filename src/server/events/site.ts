import { ipcMain, IpcMainEvent } from 'electron'

export default class SiteEvents {
  constructor(appInstance: any) {
    /**
     * load site config and data
     */
    ipcMain.removeAllListeners('app-site-reload')
    ipcMain.removeAllListeners('app-site-loaded')
    ipcMain.removeAllListeners('app-source-folder-setting')
    ipcMain.removeAllListeners('app-source-folder-set')
    ipcMain.removeAllListeners('app-preview-server-port-get')
    ipcMain.removeAllListeners('app-preview-server-port-got')

    ipcMain.on('app-site-reload', async (event: IpcMainEvent, params: any) => {
      try {
        const result = await appInstance.loadSite()
        // 移除无法序列化的 BrowserWindow 对象
        const { mainWindow, ...serializableResult } = result
        event.sender.send('app-site-loaded', serializableResult)
      } catch (error) {
        console.error('Error in app-site-reload:', error)
        event.sender.send('app-site-loaded', { error: error.message })
      }
    })

    ipcMain.on('app-source-folder-setting', async (event: IpcMainEvent, params: string) => {
      try {
        const result = await appInstance.saveSourceFolderSetting(params)
        event.sender.send('app-source-folder-set', result)
      } catch (error) {
        console.error('Error in app-source-folder-setting:', error)
        event.sender.send('app-source-folder-set', { error: error.message })
      }
    })

    ipcMain.on('app-preview-server-port-get', async (event: IpcMainEvent, params: string) => {
      try {
        const port = await appInstance.previewServer.get('port')
        event.sender.send('app-preview-server-port-got', port)
      } catch (error) {
        console.error('Error in app-preview-server-port-get:', error)
        event.sender.send('app-preview-server-port-got', { error: error.message })
      }
    })
  }
}
