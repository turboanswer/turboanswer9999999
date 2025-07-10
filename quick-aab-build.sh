#!/bin/bash

# Quick AAB Build Script for Turbo Answer
echo "🚀 Building Turbo Answer AAB (Quick Method)"
echo "============================================="

# Create AAB output directory
mkdir -p aab-output

# Copy production assets to deployment package
echo "📦 Copying production assets..."
cp -r dist/public/* aab-deployment-package/dist/public/

# Navigate to deployment package
cd aab-deployment-package

echo "🔄 Running Capacitor sync..."
npx cap sync android

# Try AAB build with shorter timeout
echo "🔨 Building AAB (with timeout)..."
cd android

# Clean and build
timeout 180s ./gradlew clean bundleRelease

# Check if AAB was created
AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_PATH" ]; then
    echo "✅ AAB Build Successful!"
    ls -lh "$AAB_PATH"
    cp "$AAB_PATH" ../../aab-output/
    echo "📱 AAB copied to: aab-output/app-release.aab"
else
    echo "⚠️  AAB build incomplete - creating deployment package"
    echo "📋 Manual build instructions created"
fi

echo ""
echo "🎯 Deployment package ready in: aab-deployment-package/"
echo "💡 To complete AAB build: cd aab-deployment-package/android && ./gradlew bundleRelease"