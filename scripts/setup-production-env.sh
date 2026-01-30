#!/bin/bash

# Setup Production Environment Variables for Vercel
# This script helps you get the correct environment variables for Vercel

set -e

echo "🔍 Getting Supabase Cloud credentials..."
echo ""

# Check if project is linked
if [ ! -f ".supabase/config.toml" ] || ! grep -q "project_id" .supabase/config.toml 2>/dev/null; then
    echo "❌ Project not linked. Please link your project first:"
    echo "   npx supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

# Get project info
echo "📋 Supabase Cloud Project Information:"
echo ""

# Try to get status
npx supabase status --linked 2>&1 | grep -E "(Project URL|API URL)" || {
    echo "⚠️  Could not get project status automatically."
    echo ""
    echo "💡 Please get these values from Supabase Dashboard:"
    echo "   1. Go to https://supabase.com/dashboard"
    echo "   2. Select your project"
    echo "   3. Go to Settings > API"
    echo "   4. Copy the following:"
    echo ""
    echo "   NEXT_PUBLIC_SUPABASE_URL=<Project URL>"
    echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>"
    echo "   SUPABASE_SERVICE_ROLE_KEY=<service_role key> (keep secret!)"
    echo ""
    echo "   Then add these to Vercel:"
    echo "   - Go to https://vercel.com/dashboard"
    echo "   - Select your project"
    echo "   - Settings > Environment Variables"
    echo "   - Add each variable for Production, Preview, and Development"
    exit 0
}

echo ""
echo "✅ Add these to Vercel Environment Variables:"
echo ""
echo "   Go to: https://vercel.com/dashboard > Your Project > Settings > Environment Variables"
echo ""
echo "   Add these variables:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "   Make sure to set them for: Production, Preview, and Development"

