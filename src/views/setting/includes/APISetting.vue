<template>
  <div>
    <a-form :form="form" style="padding-bottom: 48px;">
      <!-- API开关控制 -->
      <a-form-item :label="$t('apiSettings.enableApi')" :labelCol="formLayout.label" :wrapperCol="formLayout.wrapper" :colon="false">
        <a-switch
          v-model="enabled"
          :loading="apiServerStatus.loading"
          @change="handleApiEnabledChange"
        />
        <a-tag v-if="apiServerStatus.running" color="green" style="margin-left: 12px;">
          {{ $t('apiSettings.running') }}
        </a-tag>
        <a-tag v-else-if="apiServerStatus.loading" color="orange" style="margin-left: 12px;">
          {{ $t('apiSettings.starting') }}
        </a-tag>
        <a-tag v-else color="red" style="margin-left: 12px;">
          {{ $t('apiSettings.stopped') }}
        </a-tag>
      </a-form-item>

      <!-- 端口配置输入 -->
      <a-form-item
        v-if="enabled"
        :label="$t('apiSettings.port')"
        :labelCol="formLayout.label"
        :wrapperCol="formLayout.wrapper"
        :colon="false"
        :help="portValidationError ? $t('apiSettings.portValidationError') : ''"
        :validate-status="portValidationError ? 'error' : ''"
      >
        <a-input-number
          v-model="port"
          :min="1024"
          :max="65535"
          :disabled="apiServerStatus.running"
          @change="handlePortChange"
          style="width: 200px;"
        />
        <a-button
          v-if="apiServerStatus.running"
          type="default"
          @click="copyApiUrl"
          style="margin-left: 8px;"
        >
          <a-icon type="copy" />
          {{ $t('apiSettings.copyUrl') }}
        </a-button>
      </a-form-item>

      <!-- 认证设置面板 -->
      <a-form-item
        v-if="enabled"
        :label="$t('apiSettings.authentication')"
        :labelCol="formLayout.label"
        :wrapperCol="formLayout.wrapper"
        :colon="false"
      >
        <a-switch
          v-model="authEnabled"
          @change="handleAuthEnabledChange"
          :disabled="apiServerStatus.running"
        />
        <a-button
          v-if="authEnabled"
          type="default"
          @click="generateApiKey"
          :disabled="apiServerStatus.running"
          style="margin-left: 8px;"
        >
          <a-icon type="reload" />
          {{ $t('apiSettings.regenerateKey') }}
        </a-button>
      </a-form-item>

      <!-- API密钥管理 -->
      <a-form-item
        v-if="enabled && authEnabled"
        :label="$t('apiSettings.apiKey')"
        :labelCol="formLayout.label"
        :wrapperCol="formLayout.wrapper"
        :colon="false"
      >
        <a-input
          v-model="apiKey"
          :placeholder="$t('apiSettings.apiKeyPlaceholder')"
          readonly
          :addon-after="apiKeyVisible ? '👁️' : '👁️‍🗨️'"
          @click="toggleApiKeyVisibility"
        />
      </a-form-item>

      <!-- CORS配置 -->
      <a-form-item
        v-if="enabled"
        :label="$t('apiSettings.cors')"
        :labelCol="formLayout.label"
        :wrapperCol="formLayout.wrapper"
        :colon="false"
      >
        <a-switch
          v-model="corsEnabled"
          @change="handleCorsEnabledChange"
          :disabled="apiServerStatus.running"
        />
      </a-form-item>

      <a-form-item
        v-if="enabled && corsEnabled"
        :label="$t('apiSettings.allowedOrigins')"
        :labelCol="formLayout.label"
        :wrapperCol="formLayout.wrapper"
        :colon="false"
        :help="$t('apiSettings.allowedOriginsHelp')"
      >
        <a-select
          v-model="corsOrigins"
          mode="tags"
          :placeholder="$t('apiSettings.allowedOriginsPlaceholder')"
          style="width: 100%;"
          @change="handleCorsOriginsChange"
          :disabled="apiServerStatus.running"
        >
          <a-select-option v-for="origin in defaultCorsOrigins" :key="origin" :value="origin">
            {{ origin }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- 自动部署设置 -->
      <a-form-item
        v-if="enabled"
        :label="$t('apiSettings.autoDeploy')"
        :labelCol="formLayout.label"
        :wrapperCol="formLayout.wrapper"
        :colon="false"
        :help="$t('apiSettings.autoDeployHelp')"
      >
        <a-switch
          v-model="autoDeploy"
          @change="handleAutoDeployChange"
        />
      </a-form-item>

      <!-- 服务器状态显示 -->
      <a-form-item
        v-if="enabled"
        :label="$t('apiSettings.serverStatus')"
        :labelCol="formLayout.label"
        :wrapperCol="formLayout.wrapper"
        :colon="false"
      >
        <a-alert
          v-if="apiServerStatus.error"
          :message="apiServerStatus.error"
          type="error"
          show-icon
          style="margin-bottom: 12px;"
        />

        <div v-if="apiServerStatus.running" style="background: #f6ffed; padding: 12px; border-radius: 4px;">
          <p style="margin: 0; color: #52c41a;">
            <a-icon type="check-circle" />
            {{ $t('apiSettings.serverRunning') }}
          </p>
          <p style="margin: 8px 0 0 0; color: #52c41a;">
            {{ $t('apiSettings.apiUrl') }}: <strong>{{ apiServerStatus.url }}</strong>
          </p>
        </div>

        <div v-else style="background: #fff2f0; padding: 12px; border-radius: 4px;">
          <p style="margin: 0; color: #ff4d4f;">
            <a-icon type="close-circle" />
            {{ $t('apiSettings.serverStopped') }}
          </p>
        </div>
      </a-form-item>

      <!-- 操作按钮 -->
      <footer-box>
        <div class="flex justify-between">
          <a-button
            v-if="apiServerStatus.running"
            :loading="apiServerStatus.loading"
            @click="stopApiServer"
          >
            <a-icon type="stop" />
            {{ $t('apiSettings.stopServer') }}
          </a-button>
          <a-button
            v-else-if="enabled"
            :disabled="portValidationError || apiServerStatus.loading"
            :loading="apiServerStatus.loading"
            @click="startApiServer"
            type="primary"
          >
            <a-icon type="play-circle" />
            {{ $t('apiSettings.startServer') }}
          </a-button>
          <div v-else></div>

          <a-button
            @click="saveSettings"
            type="primary"
            :disabled="!hasChanges"
          >
            <a-icon type="save" />
            {{ $t('save') }}
          </a-button>
        </div>
      </footer-box>
    </a-form>
  </div>
</template>

<script lang="ts">
import { ipcRenderer, IpcRendererEvent } from 'electron'
import { Vue, Component, Watch } from 'vue-property-decorator'
import { State } from 'vuex-class'
import FooterBox from '../../../components/FooterBox/Index.vue'
import ga from '../../../helpers/analytics'
import { IAPISetting } from '../../../interfaces/setting'

interface APIConfig extends IAPISetting {
}

interface APIServerStatus {
  running: boolean
  loading: boolean
  url: string
  error: string
}

@Component({
  components: {
    FooterBox,
  },
})
export default class APISetting extends Vue {
  @State('site') site!: any

  form: any = {}

  formLayout = {
    label: { span: 6 },
    wrapper: { span: 12 },
  }

  // 配置数据
  enabled: boolean = false

  port: number = 3000

  authEnabled: boolean = false

  apiKey: string = ''

  corsEnabled: boolean = true

  corsOrigins: string[] = ['*']

  autoDeploy: boolean = false

  // UI状态
  apiKeyVisible: boolean = false

  originalConfig: APIConfig | null = null

  // 服务器状态
  apiServerStatus: APIServerStatus = {
    running: false,
    loading: false,
    url: '',
    error: '',
  }

  // 默认CORS源
  defaultCorsOrigins: string[] = [
    'http://localhost:3000',
    'http://localhost:4000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4000',
    'http://127.0.0.1:8080',
  ]

  // 计算属性
  get hasChanges(): boolean {
    if (!this.originalConfig) return true

    return (
      this.originalConfig.enabled !== this.enabled
      || this.originalConfig.port !== this.port
      || this.originalConfig.auth.enabled !== this.authEnabled
      || this.originalConfig.auth.apiKey !== this.apiKey
      || this.originalConfig.cors.enabled !== this.corsEnabled
      || JSON.stringify(this.originalConfig.cors.origins) !== JSON.stringify(this.corsOrigins)
      || this.originalConfig.autoDeploy !== this.autoDeploy
    )
  }

  get portValidationError(): boolean {
    return this.port < 1024 || this.port > 65535
  }

  // 生命周期钩子
  mounted() {
    this.loadApiSettings()
    this.setupIpcListeners()
    this.checkApiServerStatus()
  }

  beforeDestroy() {
    this.removeIpcListeners()
  }

  // 数据加载
  loadApiSettings() {
    // 检查site是否存在，如果不存在则使用默认值
    if (!this.site) {
      this.enabled = false
      this.port = 3000
      this.authEnabled = false
      this.apiKey = ''
      this.corsEnabled = true
      this.corsOrigins = ['*']
      this.autoDeploy = false
    } else {
      const { api } = this.site

      // 检查api是否存在，如果不存在则使用默认值
      if (!api) {
        this.enabled = false
        this.port = 3000
        this.authEnabled = false
        this.apiKey = ''
        this.corsEnabled = true
        this.corsOrigins = ['*']
        this.autoDeploy = false
      } else {
        this.enabled = api.enabled || false
        this.port = api.port || 3000
        this.authEnabled = (api.auth && api.auth.enabled) || false
        this.apiKey = (api.auth && api.auth.apiKey) || ''
        this.corsEnabled = (api.cors && api.cors.enabled) !== false
        this.corsOrigins = (api.cors && api.cors.origins) || ['*']
        this.autoDeploy = api.autoDeploy || false
      }
    }

    // 保存原始配置用于变更检测
    this.originalConfig = {
      enabled: this.enabled,
      port: this.port,
      auth: {
        enabled: this.authEnabled,
        apiKey: this.apiKey,
      },
      cors: {
        enabled: this.corsEnabled,
        origins: [...this.corsOrigins],
      },
      autoDeploy: this.autoDeploy,
    }
  }

  // IPC监听器设置
  setupIpcListeners() {
    ipcRenderer.on('api-server-status-changed', this.handleApiServerStatusChanged)
    ipcRenderer.on('api-server-started', this.handleApiServerStarted)
    ipcRenderer.on('api-server-stopped', this.handleApiServerStopped)
    ipcRenderer.on('api-server-error', this.handleApiServerError)
  }

  removeIpcListeners() {
    ipcRenderer.removeAllListeners('api-server-status-changed')
    ipcRenderer.removeAllListeners('api-server-started')
    ipcRenderer.removeAllListeners('api-server-stopped')
    ipcRenderer.removeAllListeners('api-server-error')
  }

  // 检查API服务器状态
  async checkApiServerStatus() {
    try {
      const status = await ipcRenderer.invoke('get-api-server-status')
      this.apiServerStatus = {
        ...this.apiServerStatus,
        ...status,
      }
    } catch (error) {
      console.warn('Failed to check API server status:', error)
    }
  }

  // 用户交互处理
  handleApiEnabledChange(checked: boolean) {
    this.enabled = checked
    this.updateApiSettings()

    ga.event('API Setting', 'API Enable Toggle', { evLabel: checked.toString() })
  }

  handlePortChange(value: number) {
    this.port = value
    this.updateApiSettings()

    ga.event('API Setting', 'Port Change', { evLabel: value.toString() })
  }

  handleAuthEnabledChange(checked: boolean) {
    this.authEnabled = checked
    if (checked && !this.apiKey) {
      this.generateApiKey()
    }
    this.updateApiSettings()

    ga.event('API Setting', 'Auth Enable Toggle', { evLabel: checked.toString() })
  }

  handleCorsEnabledChange(checked: boolean) {
    this.corsEnabled = checked
    this.updateApiSettings()

    ga.event('API Setting', 'CORS Enable Toggle', { evLabel: checked.toString() })
  }

  handleCorsOriginsChange(value: string[]) {
    this.corsOrigins = value
    this.updateApiSettings()

    ga.event('API Setting', 'CORS Origins Change', { evLabel: value.length.toString() })
  }

  handleAutoDeployChange(checked: boolean) {
    this.autoDeploy = checked
    this.updateApiSettings()

    ga.event('API Setting', 'Auto Deploy Toggle', { evLabel: checked.toString() })
  }

  // API密钥管理
  generateApiKey() {
    const crypto = require('crypto')
    const randomBytes = crypto.randomBytes(16)
    this.apiKey = `gridea_api_${randomBytes.toString('hex')}`
    this.updateApiSettings()

    this.$message.success(this.$t('apiSettings.apiKeyGenerated'))
    ga.event('API Setting', 'API Key Generated', { evLabel: 'Generated' })
  }

  toggleApiKeyVisibility() {
    this.apiKeyVisible = !this.apiKeyVisible
  }

  copyApiUrl() {
    if (this.apiServerStatus.url) {
      const clipboard = (navigator as any).clipboard || (window as any).clipboard
      if (clipboard) {
        clipboard.writeText(this.apiServerStatus.url).then(() => {
          this.$message.success(this.$t('apiSettings.urlCopied'))
        }).catch(() => {
          this.$message.error(this.$t('apiSettings.copyFailed'))
        })
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = this.apiServerStatus.url
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
          this.$message.success(this.$t('apiSettings.urlCopied'))
        } catch (err) {
          this.$message.error(this.$t('apiSettings.copyFailed'))
        }
        document.body.removeChild(textArea)
      }
    }
  }

  // 服务器控制
  async startApiServer() {
    try {
      this.apiServerStatus.loading = true
      this.apiServerStatus.error = ''

      const result = await ipcRenderer.invoke('start-api-server', {
        port: this.port,
        auth: this.authEnabled ? this.apiKey : null,
        cors: {
          enabled: this.corsEnabled,
          origins: this.corsOrigins,
        },
      })

      if (result.success) {
        this.apiServerStatus.running = true
        this.apiServerStatus.url = result.url
        this.$message.success(this.$t('apiSettings.serverStarted'))

        ga.event('API Setting', 'Server Started', { evLabel: this.port.toString() })
      } else {
        throw new Error(result.error || this.$t('apiSettings.startFailed'))
      }
    } catch (error) {
      this.apiServerStatus.error = (error as Error).message
      this.$message.error(`${this.$t('apiSettings.startError')}: ${(error as Error).message}`)

      ga.event('API Setting', 'Server Start Failed', { evLabel: error.message })
    } finally {
      this.apiServerStatus.loading = false
    }
  }

  async stopApiServer() {
    try {
      this.apiServerStatus.loading = true
      this.apiServerStatus.error = ''

      const result = await ipcRenderer.invoke('stop-api-server')

      if (result.success) {
        this.apiServerStatus.running = false
        this.apiServerStatus.url = ''
        this.$message.success(this.$t('apiSettings.serverStopped'))

        ga.event('API Setting', 'Server Stopped', { evLabel: 'Stopped' })
      } else {
        throw new Error(result.error || this.$t('apiSettings.stopFailed'))
      }
    } catch (error) {
      this.apiServerStatus.error = (error as Error).message
      this.$message.error(`${this.$t('apiSettings.stopError')}: ${(error as Error).message}`)

      ga.event('API Setting', 'Server Stop Failed', { evLabel: error.message })
    } finally {
      this.apiServerStatus.loading = false
    }
  }

  // 设置保存
  updateApiSettings() {
    const settings: APIConfig = {
      enabled: this.enabled,
      port: this.port,
      auth: {
        enabled: this.authEnabled,
        apiKey: this.apiKey,
      },
      cors: {
        enabled: this.corsEnabled,
        origins: this.corsOrigins,
      },
      autoDeploy: this.autoDeploy,
    }

    this.$store.dispatch('site/updateApiSettings', settings)
  }

  async saveSettings() {
    try {
      this.updateApiSettings()

      // 保存到配置文件
      await ipcRenderer.invoke('save-api-settings', {
        enabled: this.enabled,
        port: this.port,
        auth: {
          enabled: this.authEnabled,
          secretKey: this.apiKey,
        },
        cors: {
          enabled: this.corsEnabled,
          origins: this.corsOrigins,
        },
        autoDeploy: this.autoDeploy,
      })

      // 更新原始配置
      this.originalConfig = {
        enabled: this.enabled,
        port: this.port,
        auth: {
          enabled: this.authEnabled,
          apiKey: this.apiKey,
        },
        cors: {
          enabled: this.corsEnabled,
          origins: [...this.corsOrigins],
        },
        autoDeploy: this.autoDeploy,
      }

      this.$message.success(this.$t('apiSettings.settingsSaved'))

      ga.event('API Setting', 'Settings Saved', { evLabel: 'Saved' })
    } catch (error) {
      this.$message.error(`${this.$t('apiSettings.saveError')}: ${(error as Error).message}`)

      ga.event('API Setting', 'Settings Save Failed', { evLabel: (error as Error).message })
    }
  }

  // IPC事件处理
  handleApiServerStatusChanged(event: IpcRendererEvent, status: APIServerStatus) {
    this.apiServerStatus = {
      ...this.apiServerStatus,
      ...status,
    }
  }

  handleApiServerStarted(event: IpcRendererEvent, result: any) {
    this.apiServerStatus.running = true
    this.apiServerStatus.url = result.url
    this.apiServerStatus.loading = false
    this.apiServerStatus.error = ''
    this.$message.success(this.$t('apiSettings.serverStarted'))
  }

  handleApiServerStopped(event: IpcRendererEvent) {
    this.apiServerStatus.running = false
    this.apiServerStatus.url = ''
    this.apiServerStatus.loading = false
    this.$message.success(this.$t('apiSettings.serverStopped'))
  }

  handleApiServerError(event: IpcRendererEvent, error: any) {
    this.apiServerStatus.error = error.message
    this.apiServerStatus.loading = false
    this.$message.error(`${this.$t('apiSettings.serverError')}: ${error.message}`)
  }

  // 监听器
  @Watch('enabled')
  onEnabledChange(val: boolean) {
    if (!val) {
      // 禁用API时停止服务器
      if (this.apiServerStatus.running) {
        this.stopApiServer()
      }
    }
  }

  @Watch('apiKey')
  onApiKeyChanged(val: string) {
    this.apiKey = this.apiKey.trim()
  }
}
</script>

<style lang="less" scoped>
.flex {
  display: flex;
}

.justify-between {
  justify-content: space-between;
}

.justify-end {
  justify-content: flex-end;
}


// 主题适配
[data-theme='dark'] {
  .ant-alert-error {
    background-color: #2a1215;
    border-color: #4a1e1e;
  }

  .ant-tag-green {
    background-color: #162312;
    border-color: #274916;
    color: #73d13d;
  }

  .ant-tag-red {
    background-color: #2a1215;
    border-color: #4a1e1e;
    color: #ff4d4f;
  }

  .ant-tag-orange {
    background-color: #2b1f11;
    border-color: #4a3914;
    color: #faad14;
  }
}

// 错误状态样式
.ant-form-item-has-error .ant-input-number {
  border-color: #ff4d4f;

  &:hover,
  &:focus {
    border-color: #ff4d4f;
    box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2);
  }
}

// 加载状态样式
.ant-switch-loading {
  opacity: 0.65;
  cursor: not-allowed;
}

// 按钮组样式
.ant-btn + .ant-btn {
  margin-left: 8px;
}

// 状态显示样式
.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  .anticon {
    font-size: 16px;
  }
}

// API密钥输入框样式
.api-key-input {
  .ant-input {
    font-family: 'Courier New', monospace;
    letter-spacing: 0.5px;
  }

  .ant-input-group-addon {
    cursor: pointer;
    user-select: none;

    &:hover {
      background-color: #f5f5f5;
    }
  }
}

// 服务器状态卡片
.server-status-card {
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #d9d9d9;

  &.running {
    background-color: #f6ffed;
    border-color: #b7eb8f;

    .status-text {
      color: #52c41a;
    }
  }

  &.stopped {
    background-color: #fff2f0;
    border-color: #ffccc7;

    .status-text {
      color: #ff4d4f;
    }
  }

  &.loading {
    background-color: #fff7e6;
    border-color: #ffd591;

    .status-text {
      color: #faad14;
    }
  }
}

// 帮助文本样式
.help-text {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
  line-height: 1.4;
}

// 响应式调整
@media (max-width: 576px) {
  .ant-form-item {
    margin-bottom: 16px;
  }

  .ant-input-number {
    width: 100% !important;
  }

  .flex.justify-between {
    flex-direction: column;
    gap: 12px;

    .ant-btn {
      width: 100%;
    }
  }
}
</style>
