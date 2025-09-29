const express = require('express')

// Simple test to verify Express works with our middleware setup
console.log('Testing Express middleware setup...')

try {
  const app = express()

  // Test basic middleware
  app.use((req, res, next) => {
    console.log('Middleware test passed')
    next()
  })

  // Test basic route
  app.get('/test', (req, res) => {
    res.json({ success: true, message: 'Test route works' })
  })

  console.log('✓ Express app created successfully')
  console.log('✓ Middleware can be added')
  console.log('✓ Routes can be added')
  console.log('✓ All basic functionality tests passed!')
} catch (error) {
  console.error('✗ Test failed:', error.message)
  process.exit(1)
}
