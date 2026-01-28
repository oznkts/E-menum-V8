#!/bin/bash

# Create Superadmin User Script
# 
# This script creates a superadmin user via API endpoint.
# Usage: ./scripts/create-superadmin.sh [email] [password] [name]

EMAIL="${1:-admin@e-menum.com}"
PASSWORD="${2:-Admin123!}"
NAME="${3:-Super Admin}"

echo "🚀 Creating superadmin user..."
echo "Email: $EMAIL"
echo "Password: $PASSWORD"
echo "Name: $NAME"
echo ""

# Get the base URL (default to localhost:3000)
BASE_URL="${NEXT_PUBLIC_BASE_URL:-http://localhost:3000}"

# First, try to create the user
echo "📝 Attempting to create user..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/create-superadmin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"$NAME\"}")

# Check if curl was successful
if [ $? -eq 0 ]; then
  echo "$RESPONSE" | grep -q '"success":true'
  if [ $? -eq 0 ]; then
    echo "✅ Superadmin user created/updated successfully!"
    echo ""
    echo "📋 Login Credentials:"
    echo "   Email: $EMAIL"
    echo "   Password: $PASSWORD"
    echo ""
    echo "🌐 You can now login at: $BASE_URL/login"
    echo "   Then access admin panel at: $BASE_URL/admin"
    exit 0
  else
    # If creation failed, try to reset password
    echo "⚠️  User might already exist, attempting to reset password..."
    RESET_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/reset-password" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\",\"newPassword\":\"$PASSWORD\"}")
    
    if [ $? -eq 0 ]; then
      echo "$RESET_RESPONSE" | grep -q '"success":true'
      if [ $? -eq 0 ]; then
        echo "✅ Password reset successfully!"
        echo ""
        echo "📋 Login Credentials:"
        echo "   Email: $EMAIL"
        echo "   Password: $PASSWORD"
        echo ""
        echo "🌐 You can now login at: $BASE_URL/login"
        echo "   Then access admin panel at: $BASE_URL/admin"
        exit 0
      fi
    fi
    
    echo "❌ Failed to create/reset superadmin:"
    echo "Create response: $RESPONSE"
    echo "Reset response: $RESET_RESPONSE"
    exit 1
  fi
else
  echo "❌ Failed to connect to API. Make sure the development server is running."
  echo "   Run: npm run dev"
  exit 1
fi

