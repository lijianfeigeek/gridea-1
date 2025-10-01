# Gridea生产构建修复方案

## 问题描述

当前环境：Node.js v23.6.0
错误信息：`Error: error:0308010C:digital envelope routines::unsupported`
根本原因：Terser插件版本4.6.12与新版Node.js不兼容

## 解决方案

### 方案1：降级Node.js版本（最推荐）

**步骤：**
1. 安装NVM：
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
```

2. 安装Node.js 16.x：
```bash
nvm install 16
nvm use 16
node --version  # 应显示v16.x.x
```

3. 重新安装依赖：
```bash
rm -rf node_modules package-lock.json
npm install
yarn install
```

4. 测试构建：
```bash
yarn electron:build
```

### 方案2：升级Terser到兼容版本

**步骤：**
1. 卸载旧版本：
```bash
yarn remove terser terser-webpack-plugin
```

2. 安装兼容版本：
```bash
yarn add -D terser@^5.19.0 terser-webpack-plugin@^5.3.0
```

3. 更新webpack配置（已修改vue.config.js）：
- 添加fallback配置
- 更新Terser选项

### 方案3：使用OpenSSL Legacy Provider（临时方案）

**步骤：**
1. 使用环境变量：
```bash
export NODE_OPTIONS="--openssl-legacy-provider"
yarn electron:build
```

2. 或使用提供的构建脚本：
```bash
./build.sh
```

### 方案4：修改webpack配置绕过问题

**已实施的修改：**
- 在`vue.config.js`中添加resolve.fallback配置
- 禁用有问题的polyfill
- 添加Terser并行处理选项

## 推荐实施顺序

1. **首选方案1**：降级到Node.js 16.x，完全兼容现有依赖
2. **备选方案2**：升级Terser到更新版本，保持Node.js新特性
3. **临时方案3**：使用环境变量快速解决，作为临时方案

## 验证步骤

构建成功后，执行以下验证：
```bash
# 检查构建产物
ls -la dist/

# 验证应用启动
yarn electron:serve  # 简短测试

# 运行测试确保功能正常
yarn test
yarn lint
```

## 风险评估

- **方案1风险**：最低，完全兼容但Node.js版本较旧
- **方案2风险**：中等，可能引入新的依赖冲突
- **方案3风险**：低，只是临时解决方案
- **方案4风险**：中等，可能影响某些polyfill功能

## 建议选择

考虑到项目使用Vue CLI 3.6.0和较旧的技术栈，**强烈推荐使用方案1**（降级Node.js），这样可以确保所有依赖都处于兼容状态。