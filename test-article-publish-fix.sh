#!/bin/bash

echo "=== Testing Article Publishing Fix ==="
echo "This script tests the async race condition fix for article publishing"
echo ""

# API Server Configuration
API_URL="http://localhost:3000"
AUTH_HEADER="Authorization: Bearer test-key"

echo "1. Testing first article publish..."
# First article publish
RESPONSE1=$(curl -s -X POST "${API_URL}/api/articles/publish" \
  -H "Content-Type: application/json" \
  -H "${AUTH_HEADER}" \
  -d '{
    "title": "First Test Article",
    "content": "# First Test Article\n\nThis is the first test article to verify the async fix.",
    "tags": ["test", "first"],
    "autoDeploy": false
  }')

echo "First Response:"
echo "${RESPONSE1}" | jq -r '.data.fileName // "Error: " + (.error.message // "Unknown error")'
echo ""

# Wait a moment to ensure proper processing
sleep 2

echo "2. Testing second article publish..."
# Second article publish
RESPONSE2=$(curl -s -X POST "${API_URL}/api/articles/publish" \
  -H "Content-Type: application/json" \
  -H "${AUTH_HEADER}" \
  -d '{
    "title": "Second Test Article",
    "content": "# Second Test Article\n\nThis is the second test article to verify the async fix.",
    "tags": ["test", "second"],
    "autoDeploy": false
  }')

echo "Second Response:"
echo "${RESPONSE2}" | jq -r '.data.fileName // "Error: " + (.error.message // "Unknown error")'
echo ""

# Extract filenames for verification
FILENAME1=$(echo "${RESPONSE1}" | jq -r '.data.fileName // empty')
FILENAME2=$(echo "${RESPONSE2}" | jq -r '.data.fileName // empty')

echo "3. Verification..."
if [ -n "${FILENAME1}" ] && [ -n "${FILENAME2}" ]; then
  echo "✅ Both articles published successfully"
  echo "   First article: ${FILENAME1}"
  echo "   Second article: ${FILENAME2}"

  if [ "${FILENAME1}" != "${FILENAME2}" ]; then
    echo "✅ Articles have different filenames - race condition fixed!"
  else
    echo "❌ Articles have same filename - race condition still exists"
  fi

  # Check if files exist in the posts directory
  if [ -f "/Users/lijianfei/Desktop/gridea/.gridea/posts/${FILENAME1}.md" ]; then
    echo "✅ First article file exists"
  else
    echo "❌ First article file missing"
  fi

  if [ -f "/Users/lijianfei/Desktop/gridea/.gridea/posts/${FILENAME2}.md" ]; then
    echo "✅ Second article file exists"
  else
    echo "❌ Second article file missing"
  fi

  # Check content verification
  if [ -f "/Users/lijianfei/Desktop/gridea/.gridea/posts/${FILENAME1}.md" ]; then
    if grep -q "First Test Article" "/Users/lijianfei/Desktop/gridea/.gridea/posts/${FILENAME1}.md"; then
      echo "✅ First article content is correct"
    else
      echo "❌ First article content is incorrect"
    fi
  fi

  if [ -f "/Users/lijianfei/Desktop/gridea/.gridea/posts/${FILENAME2}.md" ]; then
    if grep -q "Second Test Article" "/Users/lijianfei/Desktop/gridea/.gridea/posts/${FILENAME2}.md"; then
      echo "✅ Second article content is correct"
    else
      echo "❌ Second article content is incorrect"
    fi
  fi

else
  echo "❌ One or both articles failed to publish"
  if [ -z "${FILENAME1}" ]; then
    echo "   First article failed: $(echo "${RESPONSE1}" | jq -r '.error.message // "Unknown error"')"
  fi
  if [ -z "${FILENAME2}" ]; then
    echo "   Second article failed: $(echo "${RESPONSE2}" | jq -r '.error.message // "Unknown error"')"
  fi
fi

echo ""
echo "4. Checking API server health..."
curl -s "${API_URL}/api/health" | jq -r '.status // "API server not responding"'

echo ""
echo "=== Test Complete ==="