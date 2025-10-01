#!/bin/bash
# Gridea构建脚本 - 解决Node.js 23.x兼容性问题

echo "🔧 正在设置Gridea构建环境..."
echo "解决方案: 禁用TypeScript类型检查 + OpenSSL兼容性"

# 只在当前进程中设置Node.js选项以解决OpenSSL兼容性问题
export NODE_OPTIONS="--openssl-legacy-provider --max-old-space-size=4096"
export NODE_ENV=production

# 清理缓存
echo "🧹 清理构建缓存..."
rm -rf dist/
rm -rf node_modules/.cache/
rm -rf .tmp/

echo "📦 开始生产构建..."
echo "Node版本: $(node --version)"
echo "NODE_OPTIONS: $NODE_OPTIONS"
echo "TypeScript检查: 已禁用 (fork-ts-checker)"
echo ""

# 执行构建
if yarn electron:build; then
    echo ""
    echo "✅ 构建成功!"
    echo "📁 构建产物:"
    ls -la dist/ 2>/dev/null | head -10 || echo "dist目录不存在"
    echo ""
    echo "🎉 Gridea Electron应用构建完成!"
    echo "💡 提示: 此构建跳过了TypeScript类型检查以确保兼容性"
else
    echo ""
    echo "❌ 构建失败!"
    echo "📋 常见解决方案:"
    echo "1. 检查vue.config.js中fork-ts-checker是否被正确禁用"
    echo "2. 确认NODE_OPTIONS设置正确"
    echo "3. 查看上方错误信息进行调试"
    echo "4. 考虑使用Node.js 16.x版本（完全兼容方案）"
    exit 1
fi