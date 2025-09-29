// 测试Monaco编辑器主题配置
const theme = require('@/components/MonacoMarkdownEditor/theme.js').default

describe('Monaco Editor Theme', () => {
  test('should have correct base configuration', () => {
    expect(theme.base).toBe('vs')
    expect(theme.inherit).toBe(true)
  })

  test('should have rules array', () => {
    expect(Array.isArray(theme.rules)).toBe(true)
    expect(theme.rules.length).toBeGreaterThan(0)
  })

  test('should have colors configuration', () => {
    expect(theme.colors).toBeDefined()
    expect(theme.colors['editor.foreground']).toBe('#333333')
    expect(theme.colors['editor.background']).toBe('#FFFFFF')
  })

  test('should contain specific theme rules', () => {
    const commentRule = theme.rules.find(rule => rule.token === 'comment')
    expect(commentRule).toBeDefined()
    expect(commentRule.foreground).toBe('999999')

    const stringRule = theme.rules.find(rule => rule.token === 'string')
    expect(stringRule).toBeDefined()
    expect(stringRule.foreground).toBe('e88501')

    const keywordRule = theme.rules.find(rule => rule.token === 'keyword')
    expect(keywordRule).toBeDefined()
    expect(keywordRule.foreground).toBe('b7791f')
  })

  test('should contain heading formatting rules', () => {
    const headingRule = theme.rules.find(rule => rule.token === 'markup.heading')
    expect(headingRule).toBeDefined()
    expect(headingRule.fontStyle).toBe('bold')
  })

  test('should contain bold and italic formatting rules', () => {
    const boldRule = theme.rules.find(rule => rule.token === 'markup.bold')
    expect(boldRule).toBeDefined()
    expect(boldRule.fontStyle).toBe('bold')

    const italicRule = theme.rules.find(rule => rule.token === 'markup.italic')
    expect(italicRule).toBeDefined()
    expect(italicRule.fontStyle).toBe('italic')
  })
})
