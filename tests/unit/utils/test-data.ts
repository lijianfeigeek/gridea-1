import { ArticlePublishRequest, ArticlePublishResponse } from '../../../src/server/api/types'

export const validArticleData: ArticlePublishRequest = {
  title: '测试文章标题',
  content: '# 测试文章\n\n这是一篇测试文章的内容。\n\n## 子标题\n\n这里有一些内容。',
  tags: ['测试', '文章', 'API'],
  autoDeploy: false,
}

export const validArticleResponse: ArticlePublishResponse = {
  articleId: '12345678-1234-1234-1234-123456789012',
  fileName: 'test-article-title.md',
  published: true,
  publishedAt: new Date().toISOString(),
  deploymentStatus: 'pending',
  autoDeploy: false,
  deployUrl: null,
}

export const invalidArticleData = {
  // 缺少标题
  content: '缺少标题的文章',
  tags: [],
  autoDeploy: false,
}

export const emptyTitleArticle = {
  title: '',
  content: '空标题的文章',
  tags: [],
  autoDeploy: false,
}

export const whitespaceOnlyTitle = {
  title: '   ',
  content: '只有空格的标题',
  tags: [],
  autoDeploy: false,
}

export const missingContentArticle = {
  title: '缺少内容的文章',
  tags: [],
  autoDeploy: false,
}

export const longTitleArticle = {
  title: 'a'.repeat(201),
  content: '超长标题的文章',
  tags: [],
  autoDeploy: false,
}

export const longContentArticle = {
  title: '标题',
  content: 'a'.repeat(1000001),
  tags: [],
  autoDeploy: false,
}

export const autoDeployArticle: ArticlePublishRequest = {
  title: '自动部署测试文章',
  content: '# 自动部署\n\n这篇文章应该自动部署。',
  tags: ['自动部署', '测试'],
  autoDeploy: true,
}

export const manualDeployArticle: ArticlePublishRequest = {
  title: '手动部署测试文章',
  content: '# 手动部署\n\n这篇文章需要手动部署。',
  tags: ['手动部署', '测试'],
  autoDeploy: false,
}

export const markdownContent = {
  title: 'Markdown测试',
  content: `# 标题

这是一个段落。

**粗体文本** 和 *斜体文本*

## 列表

- 项目1
- 项目2
- 项目3

### 代码块

\`\`\`javascript
console.log('Hello World');
\`\`\`

> 引用文本

[链接](https://example.com)

---

### 表格

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 | 数据3 |
`,
  tags: ['Markdown', '测试'],
  autoDeploy: false,
}

export const invalidMarkdownContent = {
  title: '无效Markdown',
  content: '```未闭合的代码块',
  tags: ['Markdown'],
  autoDeploy: false,
}

export const complexTagsArticle: ArticlePublishRequest = {
  title: '复杂标签测试',
  content: '包含特殊字符的标签测试',
  tags: ['前端开发', 'JavaScript', 'TypeScript', 'Vue.js', 'API测试', '单元测试'],
  autoDeploy: false,
}

export const emptyTagsArticle: ArticlePublishRequest = {
  title: '空标签测试',
  content: '空标签数组的测试',
  tags: [],
  autoDeploy: false,
}

export const specialCharactersArticle: ArticlePublishRequest = {
  title: '特殊字符测试：标题包含！@#$%^&*()',
  content: '内容包含特殊字符：！@#$%^&*（）',
  tags: ['特殊字符', '测试'],
  autoDeploy: false,
}

export const unicodeArticle: ArticlePublishRequest = {
  title: 'Unicode测试：中文标题 🚀',
  content: '包含中文和Emoji的内容 😊',
  tags: ['Unicode', '中文', 'Emoji'],
  autoDeploy: false,
}

// 批量测试数据
export const batchArticles = Array.from({ length: 10 }, (_, index) => ({
  title: `批量测试文章 ${index + 1}`,
  content: `这是第 ${index + 1} 篇批量测试文章的内容。`,
  tags: [`批量${index + 1}`, '测试'],
  autoDeploy: false,
}))

// 边界值测试数据
export const boundaryTitleArticle = {
  title: 'a'.repeat(200),
  content: '标题长度边界测试',
  tags: ['边界测试'],
  autoDeploy: false,
}

export const boundaryContentArticle = {
  title: '内容长度边界测试',
  content: 'a'.repeat(1000000),
  tags: ['边界测试'],
  autoDeploy: false,
}

export const maxTagsArticle = {
  title: '最大标签数测试',
  content: '标签数量边界测试',
  tags: Array.from({ length: 50 }, (_, i) => `标签${i + 1}`),
  autoDeploy: false,
}
