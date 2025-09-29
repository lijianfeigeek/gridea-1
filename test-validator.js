// Test the validator directly
const { MarkdownValidator } = require('./src/server/validators/markdown.ts')

const validator = new MarkdownValidator()
const result = validator.validate('[链接](https://example.com/path[invalid])')

console.log('Result:', result)
console.log('Errors:', result.errors)
console.log('Is valid:', result.isValid)
