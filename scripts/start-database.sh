#!/bin/bash

# E-Menum Database Startup Script
# This script starts the local Supabase database

set -e

echo "🚀 Starting E-Menum Database..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker is running
if ! docker ps &> /dev/null; then
    echo "⚠️  Docker is not running. Starting Docker..."
    echo "   Please run: sudo systemctl start docker"
    echo "   Or start Docker Desktop if you're using it."
    exit 1
fi

# Navigate to project directory
cd "$(dirname "$0")/.."

# Check if Supabase is initialized
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Supabase is not initialized in this project."
    exit 1
fi

# Start Supabase
echo "📦 Starting Supabase services..."
npx supabase start

echo ""
echo "✅ Supabase is now running!"
echo ""
echo "📋 Service URLs:"
echo "   - API URL: http://localhost:54321"
echo "   - Studio URL: http://localhost:54323"
echo "   - Database URL: postgresql://postgres:postgres@localhost:54322/postgres"
echo ""
echo "🔑 To get your local credentials, run:"
echo "   npx supabase status"
echo ""
echo "💡 Update your .env.local file with these credentials:"
echo "   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase status>"
echo "   SUPABASE_SERVICE_ROLE_KEY=<from supabase status>"
echo ""

