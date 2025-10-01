import { MarkdownValidator } from '../../../src/server/validators/markdown'

describe('Markdown Validator - 基础验证测试', () => {
  let validator: MarkdownValidator

  beforeEach(() => {
    validator = new MarkdownValidator()
  })

  describe('空内容验证', () => {
    it('应该拒绝空字符串', () => {
      const result = validator.validate('')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('内容不能为空')
    })

    it('应该拒绝 null 或 undefined', () => {
      const nullResult = validator.validate(null)
      const undefinedResult = validator.validate(undefined)

      expect(nullResult.isValid).toBe(false)
      expect(undefinedResult.isValid).toBe(false)
      expect(nullResult.errors).toContain('内容不能为空')
    })
  })

  describe('仅包含空格的内容验证', () => {
    it('应该拒绝仅包含空格的内容', () => {
      const result = validator.validate('   \n  \t  \n   ')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('内容不能只包含空白字符')
    })

    it('应该拒绝仅包含换行符的内容', () => {
      const result = validator.validate('\n\n\n\n\n')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('内容不能只包含空白字符')
    })

    it('应该拒绝仅包含制表符的内容', () => {
      const result = validator.validate('\t\t\t\t\t')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('内容不能只包含空白字符')
    })
  })

  describe('有效markdown内容验证', () => {
    it('应该接受简单的标题', () => {
      const result = validator.validate('# Hello World')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该接受段落文本', () => {
      const result = validator.validate('这是一个简单的段落。')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该接受完整的文章结构', () => {
      const markdown = `# 文章标题

## 小标题

这是一个段落，包含一些**粗体**和*斜体*文本。

- 列表项1
- 列表项2
- 列表项3

\`\`\`javascript
function test() {
  return true;
}
\`\`\`
`
      const result = validator.validate(markdown)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该接受单个字符的内容', () => {
      const result = validator.validate('A')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})

describe('Markdown Validator - 链接验证测试', () => {
  let validator: MarkdownValidator

  beforeEach(() => {
    validator = new MarkdownValidator()
  })

  describe('有效链接格式验证', () => {
    it('应该接受有效的HTTP链接', () => {
      const result = validator.validate('[Google](https://www.google.com)')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该接受有效的HTTPS链接', () => {
      const result = validator.validate('[GitHub](https://github.com)')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该接受有效的相对路径链接', () => {
      const result = validator.validate('[内部链接](/path/to/page)')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该接受mailto链接', () => {
      const result = validator.validate('[邮箱](mailto:test@example.com)')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该接受锚点链接', () => {
      const result = validator.validate('[跳转到标题](#section-title)')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('无效URL格式验证', () => {
    it('应该拒绝javascript协议链接', () => {
      const result = validator.validate('[恶意链接](javascript:alert("xss"))')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('检测到不安全的链接协议')
    })

    it('应该拒绝vbscript协议链接', () => {
      const result = validator.validate('[恶意链接](vbscript:msgbox("xss"))')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('检测到不安全的链接协议')
    })

    it('应该拒绝data协议链接（除图片外）', () => {
      const result = validator.validate('[恶意链接](data:text/html,<script>alert("xss")</script>)')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('检测到不安全的链接协议')
    })

    it('应该拒绝包含空格的URL', () => {
      const result = validator.validate('[链接](https://example.com/ path with spaces)')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('URL格式不正确')
    })

    it('应该拒绝格式错误的URL', () => {
      const result = validator.validate('[链接](https://example.com/path[invalid]')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('链接格式不正确')
    })
  })

  describe('缺失链接地址验证', () => {
    it('应该拒绝空的链接地址', () => {
      const result = validator.validate('[链接]()')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('链接地址不能为空')
    })

    it('应该拒绝仅包含空格的链接地址', () => {
      const result = validator.validate('[链接](   )')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('链接地址不能为空')
    })

    it('应该拒绝缺失链接地址的链接', () => {
      const result = validator.validate('[链接]')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('链接格式不正确')
    })
  })
})

describe('Markdown Validator - 图片链接验证测试', () => {
  let validator: MarkdownValidator

  beforeEach(() => {
    validator = new MarkdownValidator()
  })

  describe('有效图片链接验证', () => {
    it('应该接受有效的HTTP图片链接', () => {
      const result = validator.validate('![图片](https://example.com/image.jpg)')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该接受有效的HTTPS图片链接', () => {
      const result = validator.validate('![图片](https://example.com/image.png)')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该接受有效的相对路径图片链接', () => {
      const result = validator.validate('![图片](/images/logo.png)')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该接受data URI图片链接', () => {
      const result = validator.validate('![图片](data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==)')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该接受带尺寸的图片链接', () => {
      const result = validator.validate('![图片](https://example.com/image.jpg =100x50)')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('无效图片链接验证', () => {
    it('应该拒绝javascript协议图片链接', () => {
      const result = validator.validate('![图片](javascript:alert("xss"))')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('检测到不安全的图片链接')
    })

    it('应该拒绝vbscript协议图片链接', () => {
      const result = validator.validate('![图片](vbscript:msgbox("xss"))')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('检测到不安全的图片链接')
    })

    it('应该拒绝不支持的文件格式', () => {
      const result = validator.validate('![图片](https://example.com/script.exe)')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('不支持的图片格式')
    })

    it('应该拒绝格式错误的图片URL', () => {
      const result = validator.validate('![图片](https://example.com/image.jpg[invalid])')
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('图片链接格式不正确') || error.includes('不支持的图片格式'))).toBe(true)
    })
  })

  describe('缺失图片地址验证', () => {
    it('应该拒绝空的图片地址', () => {
      const result = validator.validate('![图片]()')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('图片地址不能为空')
    })

    it('应该拒绝仅包含空格的图片地址', () => {
      const result = validator.validate('![图片](   )')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('图片地址不能为空')
    })

    it('应该拒绝缺失图片地址的图片', () => {
      const result = validator.validate('![图片]')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('图片链接格式不正确')
    })
  })
})

describe('Markdown Validator - 内容结构验证测试', () => {
  let validator: MarkdownValidator

  beforeEach(() => {
    validator = new MarkdownValidator()
  })

  describe('标题结构验证', () => {
    it('应该接受正确的标题层级', () => {
      const markdown = `# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题`
      const result = validator.validate(markdown)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该拒绝跳级的标题层级', () => {
      const markdown = `# 一级标题
### 三级标题`
      const result = validator.validate(markdown)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('标题层级不能跳级')
    })

    it('应该拒绝超过6级的标题', () => {
      const result = validator.validate('####### 七级标题')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('标题层级不能超过6级')
    })

    it('应该拒绝空标题', () => {
      const result = validator.validate('# ')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('标题不能为空')
    })
  })

  describe('代码块验证', () => {
    it('应该接受有效的代码块', () => {
      const result = validator.validate('```javascript\nconsole.log("Hello");\n```')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该接受未指定语言的代码块', () => {
      const result = validator.validate('```\nconsole.log("Hello");\n```')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该拒绝未闭合的代码块', () => {
      const result = validator.validate('```javascript\nconsole.log("Hello");')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('代码块未闭合')
    })

    it('应该拒绝格式错误的代码块', () => {
      const result = validator.validate('````javascript\nconsole.log("Hello");\n```')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('代码块格式错误')
    })
  })

  describe('表格格式验证', () => {
    it('应该接受有效的表格', () => {
      const markdown = `| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 | 数据3 |
| 数据4 | 数据5 | 数据6 |`
      const result = validator.validate(markdown)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该拒绝缺少分隔行的表格', () => {
      const markdown = `| 列1 | 列2 | 列3 |
| 数据1 | 数据2 | 数据3 |`
      const result = validator.validate(markdown)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('表格缺少分隔行')
    })

    it('应该拒绝列数不一致的表格', () => {
      const markdown = `| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 |
| 数据4 | 数据5 | 数据6 |`
      const result = validator.validate(markdown)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('表格列数不一致')
    })

    it('应该拒绝格式错误的分隔行', () => {
      const markdown = `| 列1 | 列2 | 列3 |
| 列1 | 列2 | 列3 |
| 数据1 | 数据2 | 数据3 |`
      const result = validator.validate(markdown)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('表格分隔行格式错误')
    })
  })
})

describe('Markdown Validator - 边界情况测试', () => {
  let validator: MarkdownValidator

  beforeEach(() => {
    validator = new MarkdownValidator()
  })

  describe('超长内容处理', () => {
    it('应该拒绝超过长度限制的内容', () => {
      const longText = 'A'.repeat(100001) // 假设限制为100,000字符
      const result = validator.validate(longText)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('内容长度超过限制')
    })

    it('应该接受刚好在长度限制内的内容', () => {
      const longText = 'A'.repeat(100000) // 假设限制为100,000字符
      const result = validator.validate(longText)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该处理超长的行', () => {
      const longLine = 'A'.repeat(10001)
      const result = validator.validate(longLine)
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('建议将长行分割成多行')
    })
  })

  describe('特殊字符处理', () => {
    it('应该接受包含特殊字符的内容', () => {
      const content = `# 特殊字符测试

包含特殊字符：!@#$%^&*()_+-={}[]|\\:;"'<>,.?/

特殊组合：
- **粗体文本**
- *斜体文本*
- \`代码文本\`
- [链接](https://example.com)
- ![图片](https://example.com/image.png)

HTML实体：&amp; &lt; &gt; &quot; &apos;
`
      const result = validator.validate(content)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该正确处理转义字符', () => {
      const content = '# 转义字符测试\n\n' +
        '转义字符：\n' +
        '\\\\* 不是粗体 \\\\*\n' +
        '\\\\# 不是标题 \\\\#\n' +
        '\\\\` 不是代码 \\\\`\n' +
        '\\\\[ 不是链接 [\\\\]\n' +
        '\\\\\\\\ 反斜杠\n'
      const result = validator.validate(content)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该拒绝HTML注入攻击', () => {
      const maliciousContent = `<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<a href="javascript:alert('XSS')">点击</a>`
      const result = validator.validate(maliciousContent)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('安全') || error.includes('HTML'))).toBe(true)
    })
  })

  describe('Unicode字符处理', () => {
    it('应该接受中文字符', () => {
      const content = `# 中文标题

这是一个中文段落，包含中文字符：中文、English、数字123、特殊符号！@#。

**粗体中文**
*斜体中文*
\`代码中文\`
`
      const result = validator.validate(content)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该接受Emoji字符', () => {
      const content = `# Emoji测试 🎉

包含Emoji的文本：
- 😊 表情符号
- 🚀 火箭
- 🌟 星星
- 📱 手机
- 💻 电脑

Mixed content: Hello 世界! 🌍
`
      const result = validator.validate(content)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该接受各种语言的Unicode字符', () => {
      const content = `# 多语言测试

English: Hello World!
中文: 你好世界！
日本語: こんにちは世界！
한국어: 안녕하세요 세계!
العربية: مرحبا بالعالم!
Русский: Привет мир!
Español: ¡Hola Mundo!
Français: Bonjour le monde!
Deutsch: Hallo Welt!
`
      const result = validator.validate(content)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该接受特殊的Unicode符号', () => {
      const content = `# 特殊Unicode符号

数学符号：∑ ∏ ∫ √ ∞ ≠ ≤ ≥ ≈
货币符号：$ € £ ¥ ₩
箭头符号：← → ↑ ↓ ↔ ↕
几何符号：■ □ ● ◆ ◇ ★ ☆
其他符号：™ © ® § ¶ † ‡
`
      const result = validator.validate(content)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('性能边界测试', () => {
    it('应该处理大量的链接', () => {
      let content = '# 大量链接测试\n\n'
      for (let i = 0; i < 1000; i++) {
        content += `[链接${i}](https://example.com/page${i})\n`
      }
      const result = validator.validate(content)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该处理大量标题', () => {
      let content = ''
      for (let i = 1; i <= 100; i++) {
        const level = (i % 6) + 1
        content += `${'#'.repeat(level)} 标题${i}\n\n`
      }
      const result = validator.validate(content)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该处理嵌套的格式', () => {
      const content = `# 嵌套格式测试

## 复杂的嵌套格式

这篇文章包含***粗体和斜体***的组合，以及\`**代码中的粗体**\`和[*斜体中的链接*](https://example.com)。

### 表格中的格式
| 格式1 | 格式2 | 格式3 |
|-------|-------|-------|
| **粗体** | *斜体* | \`代码\` |
| [链接](https://example.com) | ![图片](https://example.com/image.png) | 混合***格式*** |

> 引用中的**粗体**和*斜体*文本
> 以及 \`代码文本\` 和 [链接](https://example.com)

1. 列表项包含**粗体**
2. 列表项包含*斜体*
3. 列表项包含\`代码\`
`
      const result = validator.validate(content)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})