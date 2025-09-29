# Jest 测试框架配置文档

## 配置概述

已为Gridea项目配置了Jest测试框架，包括以下组件：

### 1. 已安装的依赖包

```bash
# Jest核心和相关依赖
yarn add -D jest @types/jest ts-jest vue-jest babel-jest jest-transform-stub @vue/test-utils
```

### 2. 配置文件

#### jest.config.js
- 测试环境：node
- 超时时间：30秒
- 测试文件匹配：`**/tests/**/*.test.js`
- 覆盖率报告：text, lcov, clover
- 覆盖率目录：`./coverage`

#### .env.test
测试环境变量配置：
```
NODE_ENV=test
VUE_APP_ENV=test
VUE_APP_API_BASE_URL=http://localhost:3000/api
VUE_APP_TEST_MODE=true
```

#### package.json 脚本
```json
{
  "scripts": {
    "test": "vue-cli-service test:unit",
    "test:watch": "vue-cli-service test:unit --watch",
    "test:coverage": "vue-cli-service test:unit --coverage",
    "test:run": "jest",
    "test:run:watch": "jest --watch",
    "test:run:coverage": "jest --coverage"
  }
}
```

### 3. 测试目录结构

```
tests/
├── helpers/
│   ├── test-setup.ts      # TypeScript测试设置
│   ├── test-setup.js       # JavaScript测试设置
│   └── simple-setup.js     # 简化测试设置
└── unit/
    ├── example.test.ts     # TypeScript示例测试
    ├── example.test.js     # JavaScript示例测试
    └── slug.test.js        # Slug函数测试
```

### 4. 测试设置功能

#### test-setup.js 功能：
- Mock console方法减少测试噪音
- Mock window.matchMedia
- Mock ResizeObserver和IntersectionObserver
- Mock Electron APIs
- 设置30秒测试超时
- 自动清理mocks和timers

### 5. 已知问题和解决方案

#### 问题1：TypeScript语法错误
- **原因**：项目使用TypeScript 3.0，与最新Jest版本不兼容
- **解决方案**：使用JavaScript测试文件或升级TypeScript

#### 问题2：Babel配置冲突
- **原因**：项目Babel配置与Jest默认转换冲突
- **解决方案**：自定义Jest Babel配置

#### 问题3：Vue组件测试
- **原因**：vue-jest版本兼容性问题
- **解决方案**：使用兼容Vue 2的vue-jest版本

### 6. 使用建议

#### 编写测试
```javascript
// 示例：测试工具函数
describe('Utility Function', () => {
  it('should work correctly', () => {
    const result = utilityFunction('input')
    expect(result).toBe('expected output')
  })
})
```

#### 运行测试
```bash
# 运行所有测试
yarn test:run

# 运行特定测试文件
npx jest tests/unit/example.test.js

# 生成覆盖率报告
yarn test:run:coverage

# 监视模式
yarn test:run:watch
```

#### 测试最佳实践
1. 使用describe和it组织测试
2. 每个测试应该独立运行
3. 使用beforeEach和afterEach进行清理
4. Mock外部依赖
5. 测试正常和异常情况

### 7. 后续改进建议

1. **升级TypeScript**：升级到TypeScript 4.x以获得更好的Jest支持
2. **配置Vue组件测试**：完善Vue组件的测试配置
3. **集成测试**：添加Express服务器的集成测试
4. **E2E测试**：考虑添加端到端测试框架

### 8. 故障排除

#### 常见错误
- "Cannot use import statement outside a module"：Babel配置问题
- "Module not found"：路径映射问题
- "TypeScript compilation error"：TypeScript配置问题

#### 调试命令
```bash
# 检查Jest配置
npx jest --showConfig

# 详细输出
npx jest --verbose

# 调试模式
npx jest --debug
```

## 总结

Jest测试框架已基本配置完成，可以开始编写测试。建议从简单的工具函数测试开始，逐步扩展到组件和集成测试。