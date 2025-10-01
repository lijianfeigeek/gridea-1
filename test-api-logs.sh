#!/bin/bash

echo "Testing API server to generate logs..."

# Test health check
echo "1. Testing health check..."
curl -s http://localhost:3000/api/health

echo -e "\n\n2. Testing article publish endpoint..."
# Test article publish (this should generate multiple logs)
curl -X POST http://localhost:3000/api/articles/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-key" \
  -d '{
    "title": "Log Test Article",
    "content": "# Log Test\n\nThis is a test article to generate logs.",
    "tags": ["test", "logs"],
    "autoDeploy": false
  }'

echo -e "\n\n3. Testing webhook endpoint..."
# Test webhook
curl -X POST http://localhost:3000/api/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://httpbin.org/post",
    "headers": {
      "Content-Type": "application/json"
    }
  }'

echo -e "\n\nTest completed. Check the API configuration page for logs."