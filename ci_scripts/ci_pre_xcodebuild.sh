#!/bin/bash

set -e

echo "🔧 Running pre-build script for Xcode Cloud..."

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

echo "✅ CocoaPods installation complete!"
