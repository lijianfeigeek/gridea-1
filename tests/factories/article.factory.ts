import {
  TestArticleData,
  TestUserData,
  TestSiteConfig,
  WebhookPayload,
} from '../helpers/test-setup'

export interface ArticleFactoryOptions {
  title?: string
  content?: string
  tags?: string[]
  published?: boolean
  summary?: string
  featuredImage?: string
  template?: string
  customMeta?: Record<string, any>
  author?: TestUserData
  createdAt?: string
  updatedAt?: string
  slug?: string
}

export interface ConfigFactoryOptions {
  name?: string
  description?: string
  domain?: string
  theme?: string
  language?: string
  postsPerPage?: number
  customConfig?: Record<string, any>
  author?: TestUserData
}

export class ArticleFactory {
  private static counter = 0

  static create(overrides: ArticleFactoryOptions = {}): TestArticleData {
    const counter = ++this.counter
    const user = overrides.author || {
      id: `author-${counter}`,
      name: `Author ${counter}`,
      email: `author${counter}@example.com`,
      avatar: `https://example.com/avatar${counter}.jpg`,
    }

    const title = overrides.title || `Test Article ${counter}`
    const slug = overrides.slug || `test-article-${counter}`

    const article: TestArticleData = {
      id: overrides.id || `article-${counter}`,
      title,
      content: overrides.content || `# Test Article ${counter}

This is the content of test article ${counter}. It contains **markdown** formatting and various elements.

## Section 1

Some text content here.

### Subsection

More content...

## Code Example

\`\`\`javascript
function test() {
  return 'Hello World';
}
\`\`\`

> This is a blockquote

- List item 1
- List item 2
- List item 3

---

*End of article*`,
      html: undefined,
      tags: overrides.tags || ['test', 'article', `tag-${counter}`],
      published: overrides.published || false,
      createdAt: overrides.createdAt || new Date(Date.now() - counter * 86400000).toISOString(),
      updatedAt: overrides.updatedAt || new Date().toISOString(),
      author: user,
      slug,
      summary: overrides.summary || `This is a summary for test article ${counter}. It provides a brief overview of the article content.`,
      featuredImage: overrides.featuredImage || `https://example.com/images/article-${counter}.jpg`,
      template: overrides.template || 'post',
      customMeta: overrides.customMeta || {
        seoTitle: `${title} - SEO Optimized`,
        seoDescription: `SEO description for article ${counter}`,
        keywords: ['test', 'article', `keyword-${counter}`],
        ogImage: `https://example.com/images/og-article-${counter}.jpg`,
        canonicalUrl: `https://example.com/articles/${slug}`,
      },
    }

    return article
  }

  static createMany(count: number, overrides: Partial<ArticleFactoryOptions> = {}): TestArticleData[] {
    const articles: TestArticleData[] = []
    for (let i = 0; i < count; i++) {
      const articleOverrides = { ...overrides }
      if (overrides.title) {
        articleOverrides.title = `${overrides.title} ${i + 1}`
      }
      articles.push(this.create(articleOverrides))
    }
    return articles
  }

  static createPublished(overrides: ArticleFactoryOptions = {}): TestArticleData {
    return this.create({
      ...overrides,
      published: true,
      publishedAt: new Date().toISOString(),
    })
  }

  static createDraft(overrides: ArticleFactoryOptions = {}): TestArticleData {
    return this.create({
      ...overrides,
      published: false,
    })
  }

  static createWithTags(tags: string[], overrides: ArticleFactoryOptions = {}): TestArticleData {
    return this.create({
      ...overrides,
      tags,
    })
  }

  static createWithCustomMeta(customMeta: Record<string, any>, overrides: ArticleFactoryOptions = {}): TestArticleData {
    return this.create({
      ...overrides,
      customMeta: {
        ...overrides.customMeta,
        ...customMeta,
      },
    })
  }

  static generateInvalidData(): Array<Partial<TestArticleData>> {
    return [
      // Empty title
      { title: '' },

      // Empty content
      { content: '' },

      // Title too long
      { title: 'a'.repeat(1001) },

      // Invalid tags format
      { tags: 'not-an-array' as any },

      // Invalid published status
      { published: 'not-a-boolean' as any },

      // Invalid date format
      { createdAt: 'invalid-date' as any },

      // Invalid slug format
      { slug: '' },

      // Missing required fields
      { title: undefined },
      { content: undefined },
      { tags: undefined },
      { published: undefined },
      { createdAt: undefined },
      { author: undefined },
    ]
  }

  static generateEdgeCaseData(): Array<Partial<TestArticleData>> {
    return [
      // Maximum length title
      { title: 'a'.repeat(1000) },

      // Very long content
      { content: `# Very Long Content\n\n${'Lorem ipsum dolor sit amet, '.repeat(1000)}` },

      // Maximum tags
      { tags: Array.from({ length: 50 }, (_, i) => `tag-${i}`) },

      // Special characters in title
      { title: '文章标题 with 中文 & ñoño © symbols' },

      // HTML content
      { content: '<h1>HTML Content</h1><p>This contains <strong>HTML</strong> tags.</p>' },

      // Empty tags array
      { tags: [] },

      // Very long slug
      { slug: `very-long-slug-with-many-hyphens-and-words-${'a'.repeat(200)}` },

      // Complex custom meta
      {
        customMeta: {
          nested: {
            level1: {
              level2: {
                deep: 'value',
              },
            },
          },
          array: [1, 2, 3, 'mixed'],
          boolean: true,
          nullValue: null,
          number: 42,
        },
      },

      // Unicode content
      { content: '# Unicode Content\n\n🌟 星星 emoji 🚀 Rocket\n中文内容\n🎉 Celebration' },

      // Future date
      { createdAt: new Date(Date.now() + 86400000).toISOString() },

      // Past date
      { createdAt: new Date(Date.now() - 31536000000).toISOString() },
    ]
  }
}

export class ConfigFactory {
  private static counter = 0

  static create(overrides: ConfigFactoryOptions = {}): TestSiteConfig {
    const counter = ++this.counter
    const user = overrides.author || {
      id: `config-author-${counter}`,
      name: `Config Author ${counter}`,
      email: `config.author${counter}@example.com`,
    }

    const config: TestSiteConfig = {
      name: overrides.name || `Test Site ${counter}`,
      description: overrides.description || `This is test site ${counter} description for testing purposes.`,
      domain: overrides.domain || `test-site-${counter}.example.com`,
      theme: overrides.theme || 'default',
      language: overrides.language || 'zh-CN',
      author: user,
      postsPerPage: overrides.postsPerPage || 10,
      customConfig: overrides.customConfig || {
        seo: {
          title: `${overrides.name || `Test Site ${counter}`} - SEO Optimized`,
          description: `SEO description for test site ${counter}`,
          keywords: ['test', 'site', `site-${counter}`],
        },
        social: {
          twitter: `@testsite${counter}`,
          github: `testsite${counter}`,
          linkedin: `testsite${counter}`,
        },
        analytics: {
          googleAnalytics: `UA-TEST-${counter}`,
          bingAnalytics: `TEST-${counter}`,
        },
        comments: {
          enabled: true,
          provider: 'disqus',
          siteId: `testsite-${counter}`,
        },
        search: {
          enabled: true,
          provider: 'algolia',
          appId: `TEST${counter}`,
          apiKey: `test-api-key-${counter}`,
          indexName: `test-site-${counter}`,
        },
      },
    }

    return config
  }

  static createMany(count: number, overrides: Partial<ConfigFactoryOptions> = {}): TestSiteConfig[] {
    const configs: TestSiteConfig[] = []
    for (let i = 0; i < count; i++) {
      const configOverrides = { ...overrides }
      if (overrides.name) {
        configOverrides.name = `${overrides.name} ${i + 1}`
      }
      configs.push(this.create(configOverrides))
    }
    return configs
  }

  static generateInvalidData(): Array<Partial<TestSiteConfig>> {
    return [
      // Empty name
      { name: '' },

      // Empty domain
      { domain: '' },

      // Invalid posts per page
      { postsPerPage: 0 },
      { postsPerPage: -1 },
      { postsPerPage: 1001 },

      // Invalid language format
      { language: 'invalid-lang-code' },

      // Missing required fields
      { name: undefined },
      { domain: undefined },
      { theme: undefined },
      { language: undefined },
      { author: undefined },
      { postsPerPage: undefined },
    ]
  }

  static generateEdgeCaseData(): Array<Partial<TestSiteConfig>> {
    return [
      // Maximum posts per page
      { postsPerPage: 1000 },

      // Minimum posts per page
      { postsPerPage: 1 },

      // Special characters in name
      { name: '站点名称 with 中文 & ñoño © symbols' },

      // Very long description
      { description: 'a'.repeat(2000) },

      // Complex domain
      { domain: 'subdomain.subdomain2.example-domain.co.uk' },

      // Complex custom config
      {
        customConfig: {
          nested: {
            level1: {
              level2: {
                deep: 'value',
              },
            },
          },
          array: [1, 2, 3, 'mixed'],
          boolean: true,
          nullValue: null,
          number: 42,
        },
      },

      // Unicode content
      {
        name: 'Unicode 站点 🌟',
        description: 'Unicode 描述 with emoji 🚀 and 中文',
      },

      // All supported languages
      { language: 'en' },
      { language: 'zh-CN' },
      { language: 'zh-TW' },
      { language: 'ja-JP' },
      { language: 'fr-FR' },
      { language: 'ru' },
    ]
  }
}

export class WebhookPayloadFactory {
  private static counter = 0

  static createArticleCreated(article: TestArticleData): WebhookPayload {
    return {
      event: 'article.created',
      data: article,
      timestamp: new Date().toISOString(),
      signature: this.generateSignature(JSON.stringify({ event: 'article.created', data: article })),
    }
  }

  static createArticleUpdated(article: TestArticleData, changes: any): WebhookPayload {
    return {
      event: 'article.updated',
      data: {
        article,
        changes,
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      signature: this.generateSignature(JSON.stringify({ event: 'article.updated', data: { article, changes } })),
    }
  }

  static createArticleDeleted(article: TestArticleData): WebhookPayload {
    return {
      event: 'article.deleted',
      data: {
        article,
        deletedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      signature: this.generateSignature(JSON.stringify({ event: 'article.deleted', data: { article } })),
    }
  }

  static createSiteConfigUpdated(config: TestSiteConfig, changes: any): WebhookPayload {
    return {
      event: 'config.updated',
      data: {
        config,
        changes,
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      signature: this.generateSignature(JSON.stringify({ event: 'config.updated', data: { config, changes } })),
    }
  }

  static createDeploymentStarted(deploymentId: string): WebhookPayload {
    return {
      event: 'deployment.started',
      data: {
        deploymentId,
        startedAt: new Date().toISOString(),
        status: 'started',
      },
      timestamp: new Date().toISOString(),
      signature: this.generateSignature(JSON.stringify({ event: 'deployment.started', data: { deploymentId } })),
    }
  }

  static createDeploymentCompleted(deploymentId: string, success: boolean): WebhookPayload {
    return {
      event: 'deployment.completed',
      data: {
        deploymentId,
        completedAt: new Date().toISOString(),
        status: success ? 'success' : 'failed',
        success,
      },
      timestamp: new Date().toISOString(),
      signature: this.generateSignature(JSON.stringify({ event: 'deployment.completed', data: { deploymentId, success } })),
    }
  }

  static createTestEvent(eventType: string, data: any): WebhookPayload {
    return {
      event: eventType,
      data,
      timestamp: new Date().toISOString(),
      signature: this.generateSignature(JSON.stringify({ event: eventType, data })),
    }
  }

  private static generateSignature(payload: string): string {
    const crypto = require('crypto')
    return crypto
      .createHmac('sha256', 'test-webhook-secret')
      .update(payload)
      .digest('hex')
  }
}

export {
  ArticleFactoryOptions,
  ConfigFactoryOptions,
}
