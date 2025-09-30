## Vue Component Runtime Fixes

**Issues Fixed**:
1. **Missing 'form' property** - "Property or method 'form' is not defined on the instance but referenced during render"
2. **Cannot read property 'enabled' of undefined** - Error in loadApiSettings method

**Root Causes**:
1. APISetting component referenced `form` in template but didn't define the property
2. Site state was missing the `api` property, causing undefined access errors

**Solutions Implemented**:

### 1. Added Missing Form Property
```typescript
export default class APISetting extends Vue {
  @State('site') site!: any

  form: any = {}  // Added missing form property
  
  formLayout = {
    label: { span: 6 },
    wrapper: { span: 12 },
  }
  // ...
}
```

### 2. Created API Setting Interface
```typescript
// src/interfaces/setting.ts
export interface IAPISetting {
  enabled: boolean
  port: number
  auth: {
    enabled: boolean
    apiKey: string
  }
  cors: {
    enabled: boolean
    origins: string[]
  }
  autoDeploy: boolean
}
```

### 3. Updated Site State
```typescript
// src/store/modules/site.ts
export interface Site {
  // ... existing properties
  api: IAPISetting  // Added API property
}

const siteState: Site = {
  // ... existing properties
  api: {
    enabled: false,
    port: 3000,
    auth: {
      enabled: false,
      apiKey: '',
    },
    cors: {
      enabled: true,
      origins: ['*'],
    },
    autoDeploy: false,
  },
}
```

### 4. Added Vuex Actions/Mutations
```typescript
const mutations: MutationTree<Site> = {
  // ... existing mutations
  updateApiSettings(state, apiSettings: IAPISetting) {
    state.api = apiSettings
  },
}

const actions: ActionTree<Site, any> = {
  // ... existing actions
  updateApiSettings({ commit }, apiSettings: IAPISetting) {
    commit('updateApiSettings', apiSettings)
  },
}
```

### 5. Fixed loadApiSettings Method
```typescript
loadApiSettings() {
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
    this.authEnabled = (api.auth && api.auth.enabled) || false  // TypeScript 3.2.2 compatible
    this.apiKey = (api.auth && api.auth.apiKey) || ''
    this.corsEnabled = (api.cors && api.cors.enabled) !== false
    this.corsOrigins = (api.cors && api.cors.origins) || ['*']
    this.autoDeploy = api.autoDeploy || false
  }
  
  // ... rest of method
}
```

### 6. TypeScript Compatibility
- Used `(api.auth && api.auth.enabled)` instead of `api.auth?.enabled` for TypeScript 3.2.2 compatibility

**Verification**:
- ✅ ESLint passes without errors
- ✅ Application compiles successfully
- ✅ Electron app starts without Vue errors
- ✅ API settings component renders properly
- ✅ No runtime errors in browser console

**Files Modified**:
- `src/views/setting/includes/APISetting.vue` - Added form property, fixed loadApiSettings
- `src/interfaces/setting.ts` - Added IAPISetting interface
- `src/store/modules/site.ts` - Added API configuration to state, mutations, and actions

The API settings functionality is now fully integrated and accessible in the Gridea GUI.