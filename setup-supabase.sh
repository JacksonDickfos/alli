#!/bin/bash

# Supabase SQL Schema Runner
# This script will help you run the database schema in Supabase

echo "🗄️  Supabase Database Schema Setup"
echo "=================================="
echo ""
echo "This script will help you set up the database schema for AI conversations."
echo ""

# Check if supabase-schema.sql exists
if [ ! -f "supabase-schema.sql" ]; then
    echo "❌ Error: supabase-schema.sql file not found!"
    echo "Please make sure the file exists in the current directory."
    exit 1
fi

echo "✅ Found supabase-schema.sql file"
echo ""
echo "📋 Next Steps:"
echo "1. Go to your Supabase project dashboard"
echo "2. Click 'SQL Editor' in the left sidebar"
echo "3. Click 'New query'"
echo "4. Copy the contents below and paste into the SQL editor:"
echo ""
echo "=========================================="
echo ""

# Display the SQL content
cat supabase-schema.sql

echo ""
echo "=========================================="
echo ""
echo "5. Click 'Run' to execute the SQL"
echo "6. Verify the tables were created in 'Table Editor'"
echo ""
echo "🎉 Once complete, your AI voice integration will be ready!"
echo ""
echo "💡 Pro tip: You can also copy the SQL content above and paste it directly into Supabase!"
