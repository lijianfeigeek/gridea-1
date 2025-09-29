#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')

// Test runner script for API tests
class TestRunner {
  constructor() {
    this.testDir = path.join(__dirname, '..')
    this.testFiles = [
      'tests/api.test.ts',
      'tests/integration.test.ts',
      'tests/performance.test.ts',
    ]
    this.passed = 0
    this.failed = 0
  }

  async runTests() {
    console.log('🧪 Starting API Test Suite...')
    console.log('=====================================')

    /* eslint-disable no-await-in-loop */
    for (const testFile of this.testFiles) {
      await this.runTestFile(testFile)
    }
    /* eslint-enable no-await-in-loop */

    this.printSummary()
    process.exit(this.failed > 0 ? 1 : 0)
  }

  async runTestFile(testFile) {
    const fullPath = path.join(this.testDir, testFile)
    console.log(`\n📋 Running ${testFile}...`)

    return new Promise((resolve) => {
      const testProcess = spawn('npx', ['mocha', fullPath, '--timeout', '10000'], {
        cwd: this.testDir,
        stdio: 'pipe',
        shell: true,
      })

      let output = ''
      let errorOutput = ''

      testProcess.stdout.on('data', (data) => {
        const text = data.toString()
        output += text
        process.stdout.write(text)
      })

      testProcess.stderr.on('data', (data) => {
        const text = data.toString()
        errorOutput += text
        process.stderr.write(text)
      })

      testProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ ${testFile} - PASSED`)
          this.passed++
        } else {
          console.log(`❌ ${testFile} - FAILED (code: ${code})`)
          this.failed++
        }
        resolve()
      })

      testProcess.on('error', (error) => {
        console.error(`💥 ${testFile} - ERROR: ${error.message}`)
        this.failed++
        resolve()
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!testProcess.killed) {
          testProcess.kill()
          console.log(`⏰ ${testFile} - TIMEOUT`)
          this.failed++
          resolve()
        }
      }, 30000)
    })
  }

  printSummary() {
    console.log('\n=====================================')
    console.log('📊 Test Summary')
    console.log('=====================================')
    console.log(`✅ Passed: ${this.passed}`)
    console.log(`❌ Failed: ${this.failed}`)
    console.log(`📈 Total: ${this.passed + this.failed}`)
    console.log(`🎯 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`)

    if (this.failed === 0) {
      console.log('\n🎉 All tests passed!')
    } else {
      console.log('\n💥 Some tests failed. Please check the output above.')
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new TestRunner()
  runner.runTests().catch(console.error)
}

module.exports = TestRunner
