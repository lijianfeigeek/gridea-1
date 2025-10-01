#!/bin/bash

echo "🔧 Gridea应用修复脚本"
echo "========================"

# 1. 检查构建产物
if [ ! -d "dist_electron/mac/Gridea.app" ]; then
    echo "❌ 应用包不存在，需要重新构建"
    ./build.sh
    if [ $? -ne 0 ]; then
        echo "❌ 构建失败，请查看错误信息"
        exit 1
    fi
fi

echo "✅ 应用包存在"

# 2. 修复权限
echo "🔧 修复应用权限..."
chmod +x dist_electron/mac/Gridea.app/Contents/MacOS/Gridea
chmod -R 755 dist_electron/mac/Gridea.app/Contents/Resources

# 3. 移除隔离属性
echo "🔧 移除隔离属性..."
xattr -cr dist_electron/mac/Gridea.app 2>/dev/null || echo "跳过xattr操作"

# 4. 检查应用完整性
echo "🔍 检查应用完整性..."
EXECUTABLE="dist_electron/mac/Gridea.app/Contents/MacOS/Gridea"
if [ -f "$EXECUTABLE" ]; then
    echo "✅ 主程序存在"
    file "$EXECUTABLE"
else
    echo "❌ 主程序缺失"
    exit 1
fi

# 5. 测试运行
echo "🧪 测试应用启动..."
timeout 5s dist_electron/mac/Gridea.app/Contents/MacOS/Gridea > test.log 2>&1 &
APP_PID=$!
sleep 3

if kill -0 $APP_PID 2>/dev/null; then
    echo "✅ 应用启动成功"
    kill $APP_PID
else
    echo "❌ 应用启动失败"
    if [ -f test.log ]; then
        echo "错误信息:"
        cat test.log
    fi
fi

echo ""
echo "🎉 修复完成！"
echo "现在可以尝试双击应用运行"
echo "如果仍然无法打开，请执行："
echo "sudo spctl --master-disable"
echo "然后在系统偏好设置中允许应用运行"