# Gridea应用无法打开诊断和修复方案

## 问题分析

根据你的反馈：
1. **构建失败** - 需要检查具体错误
2. **应用无法打开** - 可能是权限或依赖问题

## 诊断步骤

### 1. 应用权限问题（最可能的原因）

macOS会阻止未签名应用运行，特别是从命令行构建的应用。

**症状**: 双击应用无反应，右键显示"无法验证开发者"

**解决方案**:
```bash
# 方法1: 允许未签名应用
sudo spctl --master-disable

# 方法2: 为应用移除隔离属性
xattr -cr dist_electron/mac/Gridea.app

# 方法3: 手动允许应用运行
# 系统偏好设置 > 安全性与隐私 > 通用 > 允许从以下位置下载的应用
```

### 2. 应用完整性检查

```bash
# 检查应用结构
ls -la dist_electron/mac/Gridea.app/Contents/
ls -la dist_electron/mac/Gridea.app/Contents/MacOS/
ls -la dist_electron/mac/Gridea.app/Contents/Resources/

# 检查权限
chmod +x dist_electron/mac/Gridea.app/Contents/MacOS/Gridea
```

### 3. 运行时错误诊断

```bash
# 在后台运行并查看输出
dist_electron/mac/Gridea.app/Contents/MacOS/Gridea > app.log 2>&1 &
APP_PID=$!
sleep 5
kill $APP_PID 2>/dev/null
cat app.log
```

## 完整修复脚本

创建以下修复脚本：

### fix-app.sh
```bash
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
```

## 替代解决方案

### 方案A: 使用开发模式运行
```bash
# 直接运行开发版本
yarn electron:serve
```

### 方案B: 重新构建并签名
```bash
# 如果你有开发者证书
# 在vue.config.js中设置正确的签名配置
```

### 方案C: 使用Node.js 16.x（推荐）
```bash
# 安装Node.js 16.x并重新构建
nvm install 16
nvm use 16
rm -rf dist_electron/
yarn electron:build
```

## 紧急解决步骤

如果应用无法立即打开：

1. **临时解决方案**:
```bash
# 使用开发模式
yarn electron:serve
```

2. **权限修复**:
```bash
# 移除隔离属性
xattr -cr dist_electron/mac/Gridea.app

# 修复权限
chmod +x dist_electron/mac/Gridea.app/Contents/MacOS/Gridea
```

3. **系统设置**:
```bash
# 临时允许未签名应用
sudo spctl --master-disable

# 之后记得重新启用
# sudo spctl --master-enable
```

## 预防措施

为避免将来出现此问题：

1. **使用正确的构建环境**: Node.js 16.x
2. **设置代码签名**: 配置有效的开发者证书
3. **测试应用**: 构建后立即测试运行

## 联系支持

如果以上方法都无法解决问题，请提供：
1. 完整的错误信息
2. 系统版本 (`sw_vers`)
3. Node.js版本 (`node --version`)
4. 构建日志 (`build.log`)