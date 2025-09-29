// 基础测试验证Jest配置
describe('Basic Jest Configuration', () => {
  test('Jest is working', () => {
    expect(true).toBe(true)
  })

  test('Math operations work', () => {
    expect(2 + 2).toBe(4)
    expect(10 / 2).toBe(5)
  })

  test('String operations work', () => {
    expect('hello'.toUpperCase()).toBe('HELLO')
    expect('world'.length).toBe(5)
  })

  test('Array operations work', () => {
    const arr = [1, 2, 3]
    expect(arr.includes(2)).toBe(true)
    expect(arr.length).toBe(3)
  })

  test('Async operations work', async () => {
    const result = await Promise.resolve('success')
    expect(result).toBe('success')
  })

  test('Mock functions work', () => {
    const mockFn = jest.fn()
    mockFn('test')
    expect(mockFn).toHaveBeenCalledWith('test')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })
})
