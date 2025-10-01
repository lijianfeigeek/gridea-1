#!/bin/bash
# Gridea详细构建脚本 - 用于调试构建问题

echo "🔍 Gridea详细构建调试模式..."

# 设置详细日志环境变量
export NODE_OPTIONS="--openssl-legacy-provider --trace-warnings --max-old-space-size=4096"
export DEBUG=vue:*
export VUE_CLI_SERVICE_CONFIG_PATH="./vue.config.js"

# 清理缓存
echo "🧹 清理所有缓存..."
rm -rf dist/
rm -rf node_modules/.cache/
rm -rf .tmp/

echo "📋 系统信息:"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"
echo "Yarn: $(yarn --version)"
echo "操作系统: $(uname -s)"
echo ""

echo "🔧 开始详细构建..."
echo "当前目录: $(pwd)"
echo "环境变量 NODE_OPTIONS: $NODE_OPTIONS"
echo ""

# 尝试分步构建
echo "第1步: 检查Vue CLI配置..."
npx vue-cli-service inspect --mode production > vue-cli-inspect.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Vue CLI配置检查通过"
else
    echo "❌ Vue CLI配置检查失败，查看 vue-cli-inspect.log"
fi

echo ""
echo "第2步: 开始实际构建..."
npx vue-cli-service electron:build --mode production --report --verbose 2>&1 | tee build.log

BUILD_EXIT_CODE=${PIPESTATUS[0]}

echo ""
if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "✅ 构建成功!"
    echo "📁 构建产物:"
    ls -la dist/ 2>/dev/null || echo "dist目录不存在"
else
    echo "❌ 构建失败! 退出码: $BUILD_EXIT_CODE"
    echo "📋 查看详细日志:"
    echo "- build.log: 构建完整日志"
    echo "- vue-cli-inspect.log: Vue CLI配置信息"

    # 查找关键错误信息
    echo ""
    echo "🔍 关键错误信息:"
    if [ -f build.log ]; then
        grep -i "error\|failed\|cannot\|unable" build.log | tail -10
    fi
fi