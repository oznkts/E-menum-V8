#!/bin/bash

# Deploy Migrations to Supabase Cloud
# This script helps deploy local migrations to Supabase Cloud

set -e

echo "🚀 Deploying migrations to Supabase Cloud..."
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if logged in
if ! npx supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase. Please login:"
    echo "   npx supabase login"
    exit 1
fi

# Check if project is linked
if [ ! -f ".supabase/config.toml" ] || ! grep -q "project_id" .supabase/config.toml 2>/dev/null; then
    echo "⚠️  Project not linked. Please link your project:"
    echo "   npx supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "   To find your project ref:"
    echo "   1. Go to https://supabase.com/dashboard"
    echo "   2. Select your project"
    echo "   3. Go to Settings > General"
    echo "   4. Copy the 'Reference ID'"
    exit 1
fi

# Show current migration status
echo "📋 Current migration status:"
npx supabase migration list --linked

echo ""
read -p "Do you want to push migrations to Supabase Cloud? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled."
    exit 0
fi

# Push migrations
echo "📤 Pushing migrations..."
npx supabase db push

echo ""
echo "✅ Migrations pushed successfully!"
echo ""
echo "💡 Next steps:"
echo "   1. Check Vercel environment variables"
echo "   2. Redeploy your Vercel project"
echo "   3. Test the deployment"

