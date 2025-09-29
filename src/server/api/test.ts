import ApiServer from './index'

// Simple test to verify the API server can be instantiated
console.log('Testing API Server instantiation...')

try {
  const apiServer = new ApiServer()
  console.log('✓ API Server instantiated successfully')

  const config = apiServer.getConfig()
  console.log('✓ Configuration loaded:', config.port, config.host)

  const stats = apiServer.getStats()
  console.log('✓ Server stats available:', typeof stats.uptime, typeof stats.requestCount)

  console.log('✓ All tests passed!')
} catch (error) {
  console.error('✗ Test failed:', error.message)
  process.exit(1)
}
