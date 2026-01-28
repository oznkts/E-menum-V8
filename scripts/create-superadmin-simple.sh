#!/bin/bash

# Create Superadmin User Script (Simple Version)
# 
# This script creates a superadmin user using Supabase REST API.
# Usage: ./scripts/create-superadmin-simple.sh [email] [password] [name]

EMAIL="${1:-admin@e-menum.com}"
PASSWORD="${2:-Admin123!}"
NAME="${3:-Super Admin}"

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Missing required environment variables:"
  echo "   NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:+✓}${NEXT_PUBLIC_SUPABASE_URL:-✗}"
  echo "   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:+✓}${SUPABASE_SERVICE_ROLE_KEY:-✗}"
  echo ""
  echo "Please set these in .env.local file."
  exit 1
fi

SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

echo "🚀 Creating superadmin user..."
echo "Email: $EMAIL"
echo "Password: $PASSWORD"
echo "Name: $NAME"
echo ""

# Check if user already exists
echo "🔍 Checking if user exists..."
USER_RESPONSE=$(curl -s -X GET \
  "$SUPABASE_URL/auth/v1/admin/users?email=$EMAIL" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY")

USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$USER_ID" ]; then
  echo "⚠️  User already exists: $USER_ID"
  echo "   Updating to superadmin..."
  
  # Update password
  UPDATE_PASSWORD=$(curl -s -X PUT \
    "$SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"password\": \"$PASSWORD\", \"email_confirm\": true}")
  
  if echo "$UPDATE_PASSWORD" | grep -q '"id"'; then
    echo "✅ Password updated and email confirmed"
  fi
else
  # Create new user
  echo "📝 Creating new user..."
  CREATE_RESPONSE=$(curl -s -X POST \
    "$SUPABASE_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$EMAIL\",
      \"password\": \"$PASSWORD\",
      \"email_confirm\": true,
      \"user_metadata\": {
        \"full_name\": \"$NAME\"
      }
    }")
  
  USER_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -z "$USER_ID" ]; then
    echo "❌ Failed to create user"
    echo "Response: $CREATE_RESPONSE"
    exit 1
  fi
  
  echo "✅ User created: $USER_ID"
fi

# Update or create profile
echo "🔧 Setting system_role to superadmin..."
PROFILE_UPDATE=$(curl -s -X PATCH \
  "$SUPABASE_URL/rest/v1/profiles?id=eq.$USER_ID" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"system_role\": \"superadmin\",
    \"full_name\": \"$NAME\",
    \"is_active\": true
  }")

if echo "$PROFILE_UPDATE" | grep -q '"system_role":"superadmin"'; then
  echo "✅ Profile updated to superadmin"
else
  # Try to insert if doesn't exist
  PROFILE_INSERT=$(curl -s -X POST \
    "$SUPABASE_URL/rest/v1/profiles" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{
      \"id\": \"$USER_ID\",
      \"email\": \"$EMAIL\",
      \"full_name\": \"$NAME\",
      \"system_role\": \"superadmin\",
      \"is_active\": true
    }")
  
  if echo "$PROFILE_INSERT" | grep -q '"system_role":"superadmin"'; then
    echo "✅ Profile created with superadmin role"
  else
    echo "⚠️  Warning: Could not update/create profile"
    echo "   You may need to run SQL manually in Supabase Dashboard"
    echo "   Response: $PROFILE_UPDATE"
  fi
fi

echo ""
echo "✅ Superadmin user created successfully!"
echo ""
echo "📋 Login Credentials:"
echo "   Email: $EMAIL"
echo "   Password: $PASSWORD"
echo ""
echo "🌐 You can now login at: http://localhost:3000/login"
echo "   Then access admin panel at: http://localhost:3000/admin"

