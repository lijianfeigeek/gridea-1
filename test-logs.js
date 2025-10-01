#!/usr/bin/env node

const { ipcMain } = require('electron')
const { app } = require('electron')

// Test script to verify log functionality
console.log('Starting log test...')

// Simulate some API server logs
console.log('API Server is running on 0.0.0.0:3000')
console.log('Health check available at: http://0.0.0.0:3000/api/health')

// Test JSON logs like the API server produces
console.log('{"timestamp":"2025-10-01T05:41:41.791Z","level":"info","message":"API request received","requestId":"req_1759297301791_8bl3owdq5","responseTime":0,"method":"POST","path":"/api/articles/publish","userAgent":"curl/8.7.1","ip":"192.168.0.245","type":"request_start"}')

console.log('Test completed. Check the API configuration page for logs.')
