import ApiServer from './index'

async function startServer() {
  try {
    const apiServer = new ApiServer()

    await apiServer.start()

    console.log('API Server started successfully')
    console.log('Health check: http://localhost:3000/api/health')
    console.log('Server config:', apiServer.getConfig())

    // Get server stats
    const stats = apiServer.getStats()
    console.log('Server stats:', stats)

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully...')
      await apiServer.stop()
      process.exit(0)
    })

    process.on('SIGINT', async () => {
      console.log('Received SIGINT, shutting down gracefully...')
      await apiServer.stop()
      process.exit(0)
    })
  } catch (error) {
    console.error('Failed to start API server:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  startServer()
}

export default startServer
