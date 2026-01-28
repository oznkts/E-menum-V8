#!/bin/bash

# Activate Superadmin User Script (Simple Version)
# 
# This script activates an existing user and sets them as superadmin using Supabase REST API.
# Usage: ./scripts/activate-superadmin-simple.sh [email]

EMAIL="${1:-admin@e-menum.com}"

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

echo "🔍 Looking for user: $EMAIL"
echo ""

# Get user by email
USER_RESPONSE=$(curl -s -X GET \
  "$SUPABASE_URL/auth/v1/admin/users?email=$EMAIL" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY")

USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "❌ User not found: $EMAIL"
  echo "   Please create the user first in Supabase Dashboard > Authentication > Users"
  exit 1
fi

echo "✅ User found: $USER_ID"
echo ""

# Update user to confirm email
echo "🔧 Activating user and confirming email..."
UPDATE_RESPONSE=$(curl -s -X PUT \
  "$SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email_confirm": true,
    "ban_duration": "none"
  }')

if echo "$UPDATE_RESPONSE" | grep -q '"id"'; then
  echo "✅ User activated and email confirmed"
else
  echo "⚠️  Warning: Could not update user (might already be active)"
  echo "   Response: $UPDATE_RESPONSE"
fi
echo ""

# Update profile
echo "🔧 Setting system_role to superadmin..."
PROFILE_RESPONSE=$(curl -s -X POST \
  "$SUPABASE_URL/rest/v1/rpc/update_profile_system_role" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$USER_ID\", \"new_role\": \"superadmin\"}" 2>/dev/null)

# If RPC doesn't exist, use direct update
if [ $? -ne 0 ] || echo "$PROFILE_RESPONSE" | grep -q "error\|not found"; then
  # Direct SQL update via REST API
  PROFILE_UPDATE=$(curl -s -X PATCH \
    "$SUPABASE_URL/rest/v1/profiles?id=eq.$USER_ID" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d '{
      "system_role": "superadmin",
      "full_name": "Super Admin",
      "is_active": true
    }')
  
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
        \"full_name\": \"Super Admin\",
        \"system_role\": \"superadmin\",
        \"is_active\": true
      }")
    
    if echo "$PROFILE_INSERT" | grep -q '"system_role":"superadmin"'; then
      echo "✅ Profile created with superadmin role"
    else
      echo "⚠️  Warning: Could not update/create profile"
      echo "   You may need to run SQL manually in Supabase Dashboard"
    fi
  fi
else
  echo "✅ Profile updated to superadmin"
fi

echo ""
echo "✅ Superadmin user activated successfully!"
echo ""
echo "📋 Login Credentials:"
echo "   Email: $EMAIL"
echo "   Password: (the password you set when creating the user)"
echo ""
echo "🌐 You can now login at: http://localhost:3000/login"
echo "   Then access admin panel at: http://localhost:3000/admin"

