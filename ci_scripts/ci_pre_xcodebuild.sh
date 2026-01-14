#!/bin/bash

set -e

echo "🔧 Running pre-build script for Xcode Cloud..."

# Install Node.js dependencies first (required for Expo/React Native)
echo "📦 Installing Node.js dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi

# Navigate to ios directory
cd ios

# Check if CocoaPods is installed
if ! command -v pod &> /dev/null; then
    echo "📦 Installing CocoaPods..."
    sudo gem install cocoapods
fi

# Install pods
echo "📦 Installing CocoaPods dependencies..."
pod install

echo "✅ Pre-build setup complete!"
