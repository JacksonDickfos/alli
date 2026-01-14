#!/bin/sh

set -euo pipefail

echo "🔧 Running post-clone script for Xcode Cloud..."
echo "📂 Current directory: $(pwd)"

# Install Node.js dependencies first (required for Expo/React Native)
echo "📦 Installing Node.js dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi

# Install CocoaPods using Homebrew (recommended for Xcode Cloud)
echo "📦 Installing CocoaPods..."
brew install cocoapods || {
    echo "⚠️ Homebrew install failed, trying gem install..."
    gem install cocoapods || {
        echo "❌ Failed to install CocoaPods"
        exit 1
    }
}

# Navigate to ios directory
echo "📂 Changing to ios directory..."
cd ios || { echo "❌ Failed to change to ios directory"; exit 1; }

# Verify pod command is available
if ! command -v pod &> /dev/null; then
    echo "❌ CocoaPods is not available after installation"
    exit 1
fi

echo "✅ CocoaPods version: $(pod --version)"

# Install pods
echo "📦 Installing CocoaPods dependencies..."
pod install || {
    echo "❌ pod install failed"
    exit 1
}

# Verify the xcconfig file exists
echo "🔍 Verifying Pods installation..."
if [ -f "Pods/Target Support Files/Pods-Alli/Pods-Alli.release.xcconfig" ]; then
    echo "✅ Pods-Alli.release.xcconfig found!"
else
    echo "❌ Pods-Alli.release.xcconfig NOT found!"
    echo "📋 Listing Pods directory:"
    ls -la Pods/Target\ Support\ Files/ 2>/dev/null || echo "Pods directory not found"
    exit 1
fi

echo "✅ Post-clone setup complete!"
