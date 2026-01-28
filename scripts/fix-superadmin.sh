#!/bin/bash

# Fix Superadmin User Script
# 
# This script checks the user status and fixes it if needed.
# Usage: ./scripts/fix-superadmin.sh [email] [password]

EMAIL="${1:-admin@e-menum.com}"
PASSWORD="${2:-Admin123!}"

echo "🔍 Checking user status for: $EMAIL"
echo ""

# Get the base URL (default to localhost:3000)
BASE_URL="${NEXT_PUBLIC_BASE_URL:-http://localhost:3000}"

# Check if user exists
echo "1. Checking if user exists..."
CHECK_RESPONSE=$(curl -s "$BASE_URL/api/admin/check-user?email=$EMAIL")
echo "$CHECK_RESPONSE" | jq '.' 2>/dev/null || echo "$CHECK_RESPONSE"
echo ""

# Check if user exists
EXISTS=$(echo "$CHECK_RESPONSE" | grep -o '"exists":true' || echo "")

if [ -z "$EXISTS" ]; then
  echo "❌ User does not exist. Creating new user..."
  CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/create-superadmin" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Super Admin\"}")
  
  echo "$CREATE_RESPONSE" | jq '.' 2>/dev/null || echo "$CREATE_RESPONSE"
  echo ""
  
  if echo "$CREATE_RESPONSE" | grep -q '"success":true'; then
    echo "✅ User created successfully!"
  else
    echo "❌ Failed to create user"
    exit 1
  fi
else
  echo "✅ User exists. Resetting password..."
  RESET_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/reset-password" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"newPassword\":\"$PASSWORD\"}")
  
  echo "$RESET_RESPONSE" | jq '.' 2>/dev/null || echo "$RESET_RESPONSE"
  echo ""
  
  if echo "$RESET_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Password reset successfully!"
  else
    echo "❌ Failed to reset password"
    exit 1
  fi
  
  # Also ensure profile is updated
  echo "🔧 Ensuring profile is set to superadmin..."
  CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/create-superadmin" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Super Admin\"}")
  
  if echo "$CREATE_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Profile updated successfully!"
  fi
fi

echo ""
echo "📋 Final Login Credentials:"
echo "   Email: $EMAIL"
echo "   Password: $PASSWORD"
echo ""
echo "🌐 Try logging in at: $BASE_URL/login"
echo "   Then access admin panel at: $BASE_URL/admin"

