export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

export interface ValidatorConfig {
  maxContentLength?: number
  maxLineLength?: number
  allowedImageFormats?: string[]
  requireTitle?: boolean
  allowedLinkProtocols?: string[]
}

/**
 * Constants for regex patterns and validation thresholds
 */
// eslint-disable-next-line no-script-url, no-useless-escape
const CONSTANTS = {
  DEFAULT_MAX_CONTENT_LENGTH: 100000,
  DEFAULT_MAX_LINE_LENGTH: 10000,
  DEFAULT_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] as const,
  DEFAULT_ALLOWED_PROTOCOLS: ['http:', 'https:', 'mailto:', 'tel:', '#'] as const,
  LINK_PERFORMANCE_THRESHOLD: 100,
  HEADING_PERFORMANCE_THRESHOLD: 50,
  MIN_LINK_TEXT_LENGTH: 2,
  // eslint-disable-next-line no-script-url
  UNSAFE_PROTOCOLS: ['javascript:', 'vbscript:', 'data:'] as const,
  // eslint-disable-next-line no-script-url
  UNSAFE_IMAGE_PROTOCOLS: ['javascript:', 'vbscript:'] as const,
}

/**
 * Pre-compiled regex patterns for better performance
 */
// eslint-disable-next-line no-useless-escape, no-script-url
const PATTERNS = {
  WHITESPACE_ONLY: /^\s+$/,
  // eslint-disable-next-line no-useless-escape
  LINK: /(?<!\!)\[([^\]]*)\]\(([^)]*)\)/g,
  IMAGE: /!\[([^\]]*)\]\(([^)]*)\)/g,
  // eslint-disable-next-line no-useless-escape
  INCOMPLETE_LINK: /(?<!\\)(?<!\!)\[([^\]\[\s\\]{2,})\](?!\s*[\(])/g,
  INCOMPLETE_IMAGE: /!\[([^\]]+)\](?!\s*\()/g,
  IMAGE_DIMENSIONS: /\s*=\d+x\d+$/,
  HEADING: /^(#+)\s*(.*)$/,
  CODE_BLOCK: /^```/gm,
  INVALID_CODE_BLOCK: /^````/gm,
  HTML_SCRIPT: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  HTML_EVENT_HANDLER: /on\w+\s*=/gi,
  MARKDOWN_LINK: /\[([^\]]*)\]\(([^)]+)\)/g,
  MARKDOWN_HEADING: /^#{1,6}\s+/gm,
  UNICODE_CHINESE: /[\u4e00-\u9fff]/,
  UNICODE_EMOJI: /[\u1f600-\u1f64f]/,
  UNICODE_CYRILLIC: /[\u0400-\u04ff]/,
  URL_PROTOCOL: /^([a-z]+):/,
  URL_SPACES: / /,
  // eslint-disable-next-line no-useless-escape
  URL_INVALID_CHARS: /[<>\[\]{}`|]/,
  TABLE_SEPARATOR: /^:?-+:?$/,
  TABLE_ROW: /^\|.*\|$/,
}

/**
 * MarkdownValidator validates markdown content against various security and format rules
 */
export class MarkdownValidator {
  private config: Required<ValidatorConfig>

  constructor(config: ValidatorConfig = {}) {
    this.config = {
      maxContentLength: config.maxContentLength || CONSTANTS.DEFAULT_MAX_CONTENT_LENGTH,
      maxLineLength: config.maxLineLength || CONSTANTS.DEFAULT_MAX_LINE_LENGTH,
      allowedImageFormats: config.allowedImageFormats || [...CONSTANTS.DEFAULT_IMAGE_FORMATS],
      requireTitle: config.requireTitle !== false,
      allowedLinkProtocols: config.allowedLinkProtocols || [...CONSTANTS.DEFAULT_ALLOWED_PROTOCOLS],
    }
  }

  validate(content: string | null | undefined): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    }

    // 基础验证
    this.validateBasicContent(content, result)

    if (!result.isValid) {
      return result
    }

    // 内容长度验证
    this.validateContentLength(content as string, result)

    if (!result.isValid) {
      return result
    }

    // 图片验证
    this.validateImages(content as string, result)

    // 链接验证
    this.validateLinks(content as string, result)

    // 内容结构验证
    this.validateContentStructure(content as string, result)

    // 边界情况处理
    this.validateEdgeCases(content as string, result)

    // 最终验证状态
    result.isValid = result.errors.length === 0

    return result
  }

  /**
   * Validates basic content requirements (non-null, non-empty, type checking)
   */
  private validateBasicContent(content: string | null | undefined, result: ValidationResult): void {
    if (content === null || content === undefined) {
      result.errors.push('内容不能为空')
      result.isValid = false
      return
    }

    if (typeof content !== 'string') {
      result.errors.push('内容必须是字符串类型')
      result.isValid = false
      return
    }

    // 检查是否只包含空白字符（包括空格、制表符、换行符等）
    if (PATTERNS.WHITESPACE_ONLY.test(content)) {
      result.errors.push('内容不能只包含空白字符')
      result.isValid = false
      return
    }

    if (content.trim() === '') {
      result.errors.push('内容不能为空')
      result.isValid = false
    }
  }

  /**
   * Validates content length and line length constraints
   */
  private validateContentLength(content: string, result: ValidationResult): void {
    if (content.length > this.config.maxContentLength) {
      result.errors.push('内容长度超过限制')
      result.isValid = false
    }

    // 检查超长行
    const lines = content.split('\n')
    const longLines = lines.filter(line => line.length > this.config.maxLineLength)
    if (longLines.length > 0) {
      result.warnings.push('建议将长行分割成多行')
    }
  }

  /**
   * Validates all markdown links in the content
   */
  private validateLinks(content: string, result: ValidationResult): void {
    // 匹配 markdown 链接 [text](url)，但不匹配图片 ![alt](url)
    let match

    PATTERNS.LINK.lastIndex = 0 // Reset regex state
    // eslint-disable-next-line no-cond-assign
    while ((match = PATTERNS.LINK.exec(content)) !== null) {
      const [, text, url] = match
      this.validateSingleLink(text, url, result)
    }

    // 检查缺失链接地址的情况 [链接] (在非链接上下文中的独立括号)
    const lines = content.split('\n')
    for (const line of lines) {
      const incompleteMatches = line.match(PATTERNS.INCOMPLETE_LINK)
      if (incompleteMatches) {
        for (const incompleteMatch of incompleteMatches) {
          // 确保这不是完整链接的一部分
          const isPartOfCompleteLink = PATTERNS.LINK.test(line)
          if (!isPartOfCompleteLink) {
            result.errors.push('链接格式不正确')
            result.isValid = false
            break
          }
        }
      }
    }
  }

  /**
   * Validates a single markdown link
   */
  private validateSingleLink(text: string, url: string, result: ValidationResult): void {
    // 验证链接文本
    if (!text || text.trim() === '') {
      result.errors.push('链接文本不能为空')
      result.isValid = false
      return
    }

    // 验证URL
    if (!url || url.trim() === '') {
      result.errors.push('链接地址不能为空')
      result.isValid = false
      return
    }

    // 验证URL格式
    this.validateUrl(url, this.config.allowedLinkProtocols, CONSTANTS.UNSAFE_PROTOCOLS, result)
  }

  /**
   * Common URL validation logic for links and images
   */
  private validateUrl(url: string, allowedProtocols: string[], unsafeProtocols: string[], result: ValidationResult): void {
    try {
      // 检查协议
      const protocolMatch = url.match(PATTERNS.URL_PROTOCOL)
      if (protocolMatch) {
        const protocol = `${protocolMatch[1].toLowerCase()}:`

        if (!allowedProtocols.includes(protocol)) {
          if (unsafeProtocols.includes(protocol)) {
            result.errors.push('检测到不安全的链接协议')
          } else {
            result.errors.push(`不支持的链接协议: ${protocol}`)
          }
          result.isValid = false
          return
        }
      }

      // 对于完整URL，尝试解析
      if (url.includes('://')) {
        // eslint-disable-next-line no-new
        new URL(url)
      } else if (url.startsWith('//')) {
        // eslint-disable-next-line no-new
        new URL(`http:${url}`)
      } else if (url.startsWith('#')) {
        // 锚点链接，不需要验证
      }

      // 检查URL中的特殊字符
      if (PATTERNS.URL_SPACES.test(url)) {
        result.errors.push('URL格式不正确')
        result.isValid = false
        return
      }

      // 检查URL中的无效字符
      if (PATTERNS.URL_INVALID_CHARS.test(url)) {
        result.errors.push('URL格式不正确')
        result.isValid = false
        return
      }
    } catch (error) {
      result.errors.push('URL格式不正确')
      result.isValid = false
    }
  }

  /**
   * Validates all markdown images in the content
   */
  private validateImages(content: string, result: ValidationResult): void {
    // 匹配 markdown 图片 ![alt](url)
    let match

    PATTERNS.IMAGE.lastIndex = 0 // Reset regex state
    // eslint-disable-next-line no-cond-assign
    while ((match = PATTERNS.IMAGE.exec(content)) !== null) {
      const [, alt, url] = match
      this.validateSingleImage(alt, url, result)
    }

    // 检查不完整图片链接 ![图片] (没有URL的情况)
    const lines = content.split('\n')
    for (const line of lines) {
      const incompleteMatches = line.match(PATTERNS.INCOMPLETE_IMAGE)
      if (incompleteMatches) {
        for (const incompleteMatch of incompleteMatches) {
          // 确保这不是完整图片链接的一部分
          const isPartOfCompleteImage = PATTERNS.IMAGE.test(line)
          if (!isPartOfCompleteImage) {
            result.errors.push('图片链接格式不正确')
            result.isValid = false
            break
          }
        }
      }
    }
  }

  /**
   * Validates a single markdown image
   */
  private validateSingleImage(alt: string, url: string, result: ValidationResult): void {
    // 验证图片URL
    if (!url || url.trim() === '') {
      result.errors.push('图片地址不能为空')
      result.isValid = false
      return
    }

    // 移除尺寸参数（如 =100x50）
    const cleanUrl = url.replace(PATTERNS.IMAGE_DIMENSIONS, '').trim()

    // 检查不安全的协议
    const protocolMatch = cleanUrl.match(PATTERNS.URL_PROTOCOL)
    if (protocolMatch) {
      const protocol = `${protocolMatch[1].toLowerCase()}:`

      if (CONSTANTS.UNSAFE_IMAGE_PROTOCOLS.includes(protocol)) {
        result.errors.push('检测到不安全的图片链接')
        result.isValid = false
        return
      }

      // 允许 data: 协议的图片
      if (protocol === 'data:' && !cleanUrl.startsWith('data:image/')) {
        result.errors.push('只支持data协议的图片')
        result.isValid = false
        return
      }
    }

    // 检查文件扩展名（如果不是data URI）
    if (!cleanUrl.startsWith('data:')) {
      const extension = cleanUrl.split('.').pop()
      const extensionLower = extension ? extension.toLowerCase() : ''
      if (extensionLower && !this.config.allowedImageFormats.includes(extensionLower)) {
        result.errors.push('不支持的图片格式')
        result.isValid = false
        return
      }
    }

    // 检查URL格式
    if (PATTERNS.URL_SPACES.test(cleanUrl)) {
      result.errors.push('图片链接格式不正确')
      result.isValid = false
      return
    }

    if (PATTERNS.URL_INVALID_CHARS.test(cleanUrl)) {
      result.errors.push('图片链接格式不正确')
      result.isValid = false
    }
  }

  /**
   * Validates content structure (headings, code blocks, tables)
   */
  private validateContentStructure(content: string, result: ValidationResult): void {
    const lines = content.split('\n')

    // 标题结构验证
    this.validateHeadings(lines, result)

    // 代码块验证
    this.validateCodeBlocks(content, result)

    // 表格验证
    this.validateTables(content, result)
  }

  /**
   * Validates markdown heading structure and hierarchy
   */
  private validateHeadings(lines: string[], result: ValidationResult): void {
    const headingLevels: number[] = []

    for (const line of lines) {
      const trimmedLine = line.trim()

      // 首先检查是否是标题格式（以#开头）
      const hashMatch = trimmedLine.match(PATTERNS.HEADING)
      if (hashMatch) {
        const hashCount = hashMatch[1].length
        const title = hashMatch[2].trim()

        // 检查标题级别（包括超过6级的情况）
        if (hashCount > 6) {
          result.errors.push('标题层级不能超过6级')
          result.isValid = false
          continue
        }

        // 检查标题内容
        if (!title) {
          result.errors.push('标题不能为空')
          result.isValid = false
          continue
        }

        // 检查标题层级跳级（只对1-6级标题检查）
        if (hashCount <= 6 && headingLevels.length > 0) {
          const lastLevel = headingLevels[headingLevels.length - 1]
          if (hashCount > lastLevel + 1) {
            result.errors.push('标题层级不能跳级')
            result.isValid = false
          }
        }

        if (hashCount <= 6) {
          headingLevels.push(hashCount)
        }
      }
    }
  }

  /**
   * Validates markdown code blocks for proper syntax
   */
  private validateCodeBlocks(content: string, result: ValidationResult): void {
    // 检查代码块是否成对
    const codeBlockMatches = content.match(PATTERNS.CODE_BLOCK)

    if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
      result.errors.push('代码块未闭合')
      result.isValid = false
    }

    // 检查代码块格式
    const invalidCodeBlocks = content.match(PATTERNS.INVALID_CODE_BLOCK)
    if (invalidCodeBlocks) {
      result.errors.push('代码块格式错误')
      result.isValid = false
    }
  }

  /**
   * Validates markdown table structure and format
   */
  private validateTables(content: string, result: ValidationResult): void {
    const lines = content.split('\n')
    let tableStartIndex = -1
    let hasSeparatorRow = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // 检查是否是表格行
      if (PATTERNS.TABLE_ROW.test(line)) {
        const cells = line.split('|').map(cell => cell.trim()).slice(1, -1)

        // 记录表格开始
        if (tableStartIndex === -1) {
          tableStartIndex = i
          hasSeparatorRow = false
        }

        // 检查是否有分隔行（应该在表格的第二行）
        if (i === tableStartIndex + 1) {
          const separatorCells = line.split('|').map(cell => cell.trim()).slice(1, -1)

          // 检查分隔行格式
          const isValidSeparator = separatorCells.every(cell => PATTERNS.TABLE_SEPARATOR.test(cell))

          if (isValidSeparator) {
            hasSeparatorRow = true
          } else {
            result.errors.push('表格分隔行格式错误')
            result.isValid = false
          }
        }

        // 检查列数一致性
        if (i > tableStartIndex + 1) {
          const headerCells = lines[tableStartIndex].split('|').map(cell => cell.trim()).slice(1, -1)
          if (headerCells.length !== cells.length) {
            result.errors.push('表格列数不一致')
            result.isValid = false
          }
        }
      } else {
        // 检查表格是否缺少分隔行
        if (tableStartIndex !== -1 && !hasSeparatorRow) {
          result.errors.push('表格缺少分隔行')
          result.isValid = false
        }
        // 重置表格开始索引
        tableStartIndex = -1
        hasSeparatorRow = false
      }
    }

    // 检查文件末尾的表格是否缺少分隔行
    if (tableStartIndex !== -1 && !hasSeparatorRow) {
      result.errors.push('表格缺少分隔行')
      result.isValid = false
    }
  }

  /**
   * Validates edge cases including security threats, Unicode, and performance
   */
  private validateEdgeCases(content: string, result: ValidationResult): void {
    // HTML注入检测
    const htmlTags = content.match(PATTERNS.HTML_SCRIPT)
    if (htmlTags) {
      result.errors.push('检测到潜在的HTML注入攻击')
      result.isValid = false
    }

    // 检测危险的HTML事件处理器
    const dangerousEvents = content.match(PATTERNS.HTML_EVENT_HANDLER)
    if (dangerousEvents) {
      result.errors.push('检测到危险的HTML事件处理器')
      result.isValid = false
    }

    // Unicode字符处理（这里只是验证，不做限制）
    const unicodeRanges = [
      PATTERNS.UNICODE_CHINESE, // 中文字符
      PATTERNS.UNICODE_EMOJI, // emoji表情
      PATTERNS.UNICODE_CYRILLIC, // 西里尔字母
    ]

    const hasUnicode = unicodeRanges.some(regex => regex.test(content))
    if (hasUnicode) {
      result.suggestions.push('内容包含Unicode字符，确保目标平台支持')
    }

    // 性能考虑：大量链接
    const linkCount = (content.match(PATTERNS.MARKDOWN_LINK) || []).length
    if (linkCount > CONSTANTS.LINK_PERFORMANCE_THRESHOLD) {
      result.warnings.push('包含大量链接，可能影响性能')
    }

    // 性能考虑：大量标题
    const headingCount = (content.match(PATTERNS.MARKDOWN_HEADING) || []).length
    if (headingCount > CONSTANTS.HEADING_PERFORMANCE_THRESHOLD) {
      result.warnings.push('包含大量标题，建议简化文档结构')
    }
  }
}
