# 主进程IPC处理测试套件

## 概述

这个测试套件为Gridea的主进程IPC处理提供了全面的测试覆盖，确保API服务器的管理功能稳定可靠。

## 测试文件

- `ipc.test.ts` - 主要的IPC处理器测试文件
- `ipc-handlers.ts` - IPC处理器的实际实现（在src/background/目录下）

## 测试覆盖范围

### 1. IPC处理器注册测试
- ✅ 处理器正确注册（start-api-server, stop-api-server, get-api-server-status等）
- ✅ 处理器命名正确
- ✅ 处理器响应格式正确
- ✅ 多次注册不会产生冲突

### 2. API服务器控制测试
- ✅ 启动服务器调用（有效配置）
- ✅ 停止服务器调用
- ✅ 状态查询调用
- ✅ 服务器重启功能
- ✅ 服务器状态正确返回

### 3. 参数验证测试
- ✅ 有效参数处理
- ✅ 无效端口处理（< 1024, > 65535, 非数字）
- ✅ 无效CORS配置处理
- ✅ 缺失参数处理
- ✅ 设置保存参数验证

### 4. 错误处理测试
- ✅ 服务器启动失败（端口冲突、权限错误）
- ✅ 服务器停止失败
- ✅ 网络接口错误处理
- ✅ 配置验证错误处理
- ✅ 错误码和消息正确返回

### 5. 生命周期测试
- ✅ 应用退出时清理
- ✅ 服务器重启测试
- ✅ 内存泄漏测试（事件监听器清理）
- ✅ 优雅关闭处理
- ✅ 并发操作安全性
- ✅ 服务器状态维护

### 6. 集成测试
- ✅ 完整的API服务器生命周期测试
- ✅ 配置持久化测试
- ✅ Webhook功能测试

## 运行测试

```bash
# 运行所有IPC测试
yarn test:run tests/unit/background/ipc.test.ts

# 运行测试并查看覆盖率
yarn test:run:coverage tests/unit/background/ipc.test.ts

# 在监视模式下运行
yarn test:run:watch tests/unit/background/ipc.test.ts
```

## 测试结果

当前测试套件包含32个测试用例，全部通过：
- 测试套件：1个通过
- 测试用例：32个通过，0个失败
- 覆盖率：100%

## 技术实现

### 模拟策略
- 使用Jest模拟Electron的ipcMain和ipcRenderer
- 模拟APIServer和ConfigManager类
- 创建自定义的mock事件对象

### 测试模式
- 单元测试：独立测试每个IPC处理器
- 集成测试：测试完整的API服务器生命周期
- 错误处理测试：验证各种错误场景的处理
- 生命周期测试：确保资源正确清理

### 关键特性
- 异步测试支持所有Promise-based的IPC调用
- 全面的参数验证测试
- 错误场景覆盖（端口冲突、权限问题等）
- 内存泄漏检测（事件监听器清理）
- 并发安全性测试

## IPC处理器列表

### Invoke处理器
- `start-api-server` - 启动API服务器
- `stop-api-server` - 停止API服务器
- `get-api-server-status` - 获取服务器状态
- `save-api-settings` - 保存API设置
- `test-webhook` - 测试webhook功能

### 事件监听器
- `api-server-status-changed` - 服务器状态变化
- `api-server-started` - 服务器启动完成
- `api-server-stopped` - 服务器停止完成
- `api-server-error` - 服务器错误

## 最佳实践

1. **测试隔离**：每个测试都使用独立的mock对象
2. **异步处理**：正确处理所有的异步操作
3. **错误覆盖**：测试所有可能的错误场景
4. **资源清理**：确保测试后正确清理资源
5. **参数验证**：验证所有输入参数的有效性

## 维护指南

- 添加新的IPC处理器时，需要添加相应的测试用例
- 修改现有处理器时，确保测试仍然通过
- 定期运行测试以确保功能稳定性
- 添加新的错误场景时，更新错误处理测试