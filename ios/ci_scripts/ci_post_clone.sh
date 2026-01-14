#!/bin/sh

set -e

echo "🔧 Running post-clone script for Xcode Cloud..."
echo "📂 CI_WORKSPACE: ${CI_WORKSPACE:-not set}"
echo "📂 Current directory: $(pwd)"

# Navigate to workspace root (Xcode Cloud sets CI_WORKSPACE)
# From ios/ci_scripts, go up two levels to reach repo root
cd ../.. || {
    # If CI_WORKSPACE is set, use that instead
    if [ -n "${CI_WORKSPACE:-}" ]; then
        cd "$CI_WORKSPACE" || exit 1
    else
        echo "❌ Failed to navigate to repo root"
        exit 1
    fi
}
echo "📂 Changed to repo root: $(pwd)"

# Install Node.js if not available (required for Expo Podfile)
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
    export HOMEBREW_NO_AUTO_UPDATE=1
    brew install node@18 || brew install node
    brew link node@18 2>/dev/null || true
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install Node.js dependencies first (required for Expo/React Native)
echo "📦 Installing Node.js dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi

# Install CocoaPods using Homebrew (recommended for Xcode Cloud)
echo "📦 Installing CocoaPods..."
export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
export HOMEBREW_NO_AUTO_UPDATE=1
brew install cocoapods || {
    echo "⚠️ Homebrew install failed, trying gem install..."
    gem install cocoapods || {
        echo "❌ Failed to install CocoaPods"
        exit 1
    }
}

# Verify pod command is available
if ! command -v pod &> /dev/null; then
    echo "❌ CocoaPods is not available after installation"
    exit 1
fi

echo "✅ CocoaPods version: $(pod --version)"

# Navigate to ios directory
echo "📂 Changing to ios directory..."
cd ios || { echo "❌ Failed to change to ios directory"; exit 1; }
echo "📂 Current directory: $(pwd)"

# Install pods
echo "📦 Installing CocoaPods dependencies..."
pod install --verbose || {
    echo "❌ pod install failed"
    echo "📋 Podfile contents:"
    head -20 Podfile || echo "Could not read Podfile"
    exit 1
}

# Verify the xcconfig file exists
echo "🔍 Verifying Pods installation..."
if [ -f "Pods/Target Support Files/Pods-Alli/Pods-Alli.release.xcconfig" ]; then
    echo "✅ Pods-Alli.release.xcconfig found!"
    ls -la "Pods/Target Support Files/Pods-Alli/" || echo "Could not list Pods-Alli directory"
else
    echo "❌ Pods-Alli.release.xcconfig NOT found!"
    echo "📋 Listing Pods directory:"
    ls -la Pods/ 2>/dev/null || echo "Pods directory not found"
    ls -la "Pods/Target Support Files/" 2>/dev/null || echo "Target Support Files not found"
    exit 1
fi

echo "✅ Post-clone setup complete!"
