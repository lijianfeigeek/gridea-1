import fs from 'fs'
import moment from 'moment'
// @ts-ignore
import Model from './model'
import GitProxy from './plugins/deploys/gitproxy'

const git = require('isomorphic-git')

export default class Deploy extends Model {
  outputDir: string = this.buildDir

  remoteUrl = ''

  platformAddress = ''

  http = new GitProxy(this)

  constructor(appInstance: any) {
    super(appInstance)
    const { setting } = this.db
    this.platformAddress = ({
      github: 'github.com',
      coding: 'e.coding.net',
      gitee: 'gitee.com',
    } as any)[setting.platform || 'github']

    const preUrl = ({
      github: `${setting.username}:${setting.token}`,
      coding: `${setting.tokenUsername}:${setting.token}`,
      gitee: `${setting.username}:${setting.token}`,
    } as any)[setting.platform || 'github']

    this.remoteUrl = `https://${preUrl}@${this.platformAddress}/${setting.username}/${setting.repository}.git`
  }

  /**
   * Check whether the remote connection is normal
   */
  async remoteDetect() {
    const result = {
      success: true,
      message: [''],
    }
    try {
      const { setting } = this.db
      let isRepo = false
      try {
        await git.currentBranch({ fs, dir: this.outputDir })
        isRepo = true
      } catch (e) {
        console.log('Not a repo', e.message)
      }

      if (!setting.username || !setting.repository || !setting.token) {
        return {
          success: false,
          message: 'Username、repository、token is required',
        }
      }
      if (!isRepo) {
        await git.init({ fs, dir: this.outputDir })
        await git.setConfig({
          fs,
          dir: this.outputDir,
          path: 'user.name',
          value: setting.username,
        })
        await git.setConfig({
          fs,
          dir: this.outputDir,
          path: 'user.email',
          value: setting.email,
        })
      }

      await git.addRemote({
        fs, dir: this.outputDir, remote: 'origin', url: this.remoteUrl, force: true,
      })
      const info = await git.getRemoteInfo({
        http: this.http,
        url: this.remoteUrl,
      })
      console.log('info', info)
      result.message = info.capabilities
    } catch (e) {
      console.log('Test Remote Error: ', e)
      result.success = false
      result.message = e.message
    }
    return result
  }

  async publish() {
    await this.remoteDetect()
    this.db.themeConfig.domain = this.db.setting.domain
    let result = {
      success: true,
      message: '',
      localBranchs: {},
    }
    let isRepo = false
    try {
      await git.currentBranch({ fs, dir: this.outputDir })
      isRepo = true
    } catch (e) {
      console.log('Not a repo', e.message)
    }
    if (isRepo) {
      result = await this.commonPush()
    } else {
      // result = await this.firstPush()
    }
    return result
  }

  async commonPush() {
    console.log('🚀 [DEPLOY] Starting common push process')
    const pushStartTime = Date.now()
    const { setting } = this.db
    const localBranchs = {}

    try {
      console.log('📋 [DEPLOY] Repository status check...')
      const statusSummary = await git.status({ fs, dir: this.outputDir, filepath: '.' })
      console.log(`📊 [DEPLOY] Repository status: ${statusSummary}`)

      console.log('🔗 [DEPLOY] Configuring remote origin...')
      await git.addRemote({
        fs, dir: this.outputDir, remote: 'origin', url: this.remoteUrl, force: true,
      })
      console.log(`✅ [DEPLOY] Remote configured: ${this.remoteUrl}`)

      if (statusSummary !== 'unmodified') {
        console.log('📝 [DEPLOY] Staging changes...')
        await git.add({ fs, dir: this.outputDir, filepath: '.' })

        const commitMessage = `update from gridea: ${moment().format('YYYY-MM-DD HH:mm:ss')}`
        console.log(`💾 [DEPLOY] Creating commit: "${commitMessage}"`)
        await git.commit({
          fs,
          dir: this.outputDir,
          message: commitMessage,
        })
        console.log('✅ [DEPLOY] Commit created successfully')
      } else {
        console.log('ℹ️ [DEPLOY] No changes to commit - repository is up to date')
      }

      console.log('🌿 [DEPLOY] Checking current branch...')
      await this.checkCurrentBranch()

      console.log(`📤 [DEPLOY] Pushing to branch "${setting.branch}"...`)
      const actualPushStartTime = Date.now()
      const pushRes = await git.push({
        fs,
        http: this.http,
        dir: this.outputDir,
        remote: 'origin',
        ref: setting.branch,
        force: true,
      })
      const pushDuration = Date.now() - actualPushStartTime

      console.log('🎉 [DEPLOY] Push completed successfully!', {
        duration: `${pushDuration}ms`,
        branch: setting.branch,
        remote: this.remoteUrl,
        result: pushRes,
      })

      // Detailed push success logging
      if (pushRes && pushRes.ok) {
        console.log('✅ [DEPLOY] Push operation details:', {
          success: true,
          refs: pushRes.refs || {},
          server: pushRes.headers ? {
            server: pushRes.headers.server,
            date: pushRes.headers.date,
            connection: pushRes.headers.connection,
          } : {},
          totalDuration: `${Date.now() - pushStartTime}ms`,
          timestamp: new Date().toISOString(),
        })
      }

      return {
        success: true,
        data: pushRes,
        message: '',
        localBranchs,
      }
    } catch (e) {
      const totalDuration = Date.now() - pushStartTime
      console.error('❌ [DEPLOY] Push operation failed!', {
        error: e.message,
        errorType: e.constructor.name,
        stack: e.stack,
        duration: `${totalDuration}ms`,
        branch: setting.branch,
        remote: this.remoteUrl,
        timestamp: new Date().toISOString(),
      })

      return {
        success: false,
        message: e.message,
        data: localBranchs,
        localBranchs,
      }
    }
  }

  /**
   * Check whether the branch needs to be switched,
   * FIXME: if branch is change, then the fist push is not work. so need to push again.
   */
  async checkCurrentBranch() {
    const { setting } = this.db

    console.log('🔍 [BRANCH] Checking current branch...')
    const currentBranch = await git.currentBranch({ fs, dir: this.outputDir, fullname: false })
    const localBranches = await git.listBranches({ fs, dir: this.outputDir })

    console.log(`📊 [BRANCH] Current branch: "${currentBranch}", Target branch: "${setting.branch}"`)
    console.log(`📋 [BRANCH] Available local branches: [${localBranches.join(', ')}]`)

    if (currentBranch !== setting.branch) {
      console.log(`🔄 [BRANCH] Switching from "${currentBranch}" to "${setting.branch}"...`)

      if (!localBranches.includes(setting.branch)) {
        console.log(`🌱 [BRANCH] Creating new branch "${setting.branch}"...`)
        await git.branch({ fs, dir: this.outputDir, ref: setting.branch })
        console.log('✅ [BRANCH] New branch created successfully')
      } else {
        console.log(`📁 [BRANCH] Branch "${setting.branch}" already exists locally`)
      }

      await git.checkout({ fs, dir: this.outputDir, ref: setting.branch })
      console.log(`✅ [BRANCH] Successfully switched to branch "${setting.branch}"`)
    } else {
      console.log(`✅ [BRANCH] Already on correct branch "${setting.branch}"`)
    }
  }
}
