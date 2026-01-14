#!/bin/bash

set -euo pipefail

echo "🔧 Running pre-build script for Xcode Cloud..."
echo "📂 Current directory: $(pwd)"
echo "📂 Listing root directory:"
ls -la

# Install Node.js dependencies first (required for Expo/React Native)
echo "📦 Installing Node.js dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci --verbose
else
    npm install --verbose
fi

# Navigate to ios directory
echo "📂 Changing to ios directory..."
cd ios || { echo "❌ Failed to change to ios directory"; exit 1; }
echo "📂 Current directory: $(pwd)"

# Check if CocoaPods is installed (Xcode Cloud usually has it pre-installed)
if ! command -v pod &> /dev/null; then
    echo "📦 CocoaPods not found, attempting to install..."
    # Try without sudo first (Xcode Cloud might have it in PATH)
    gem install cocoapods || {
        echo "⚠️ Failed to install CocoaPods, trying with bundler..."
        bundle install || echo "⚠️ Bundle install also failed, continuing..."
    }
fi

# Verify pod command is available
if ! command -v pod &> /dev/null; then
    echo "❌ CocoaPods is still not available after installation attempt"
    echo "📋 Available commands:"
    which -a pod || echo "pod not found in PATH"
    exit 1
fi

echo "✅ CocoaPods version: $(pod --version)"

# Install pods with verbose output
echo "📦 Installing CocoaPods dependencies..."
pod install --verbose || {
    echo "❌ pod install failed"
    echo "📋 Checking Podfile..."
    cat Podfile || echo "Could not read Podfile"
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

echo "✅ Pre-build setup complete!"
