#!/bin/bash

# Check Vercel Environment Variables
# This script helps verify Vercel environment variables

set -e

echo "🔍 Checking Vercel Environment Variables..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Install it with:"
    echo "   npm install -g vercel"
    echo ""
    echo "   Or check manually in Vercel Dashboard:"
    echo "   https://vercel.com/dashboard"
    exit 1
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Not logged in to Vercel. Please login:"
    echo "   vercel login"
    exit 1
fi

echo "📋 Required Environment Variables:"
echo ""
echo "   NEXT_PUBLIC_SUPABASE_URL"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   SUPABASE_SERVICE_ROLE_KEY"
echo ""

# Try to get environment variables (if project is linked)
if [ -f ".vercel/project.json" ]; then
    echo "🔍 Fetching environment variables from Vercel..."
    vercel env ls 2>&1 | grep -E "(NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE)" || echo "   No matching variables found"
else
    echo "⚠️  Project not linked to Vercel."
    echo "   Run: vercel link"
    echo ""
    echo "   Or check manually in Vercel Dashboard:"
    echo "   Project Settings > Environment Variables"
fi

echo ""
echo "💡 To set environment variables:"
echo "   1. Go to https://vercel.com/dashboard"
echo "   2. Select your project"
echo "   3. Go to Settings > Environment Variables"
echo "   4. Add the required variables for Production, Preview, and Development"
echo ""

