#!/bin/bash

# Turbo Answer - Android App Bundle (AAB) Build Script
# This script builds a production-ready AAB for Google Play Store

echo "🚀 Building Turbo Answer Android App Bundle (AAB)"
echo "================================================"

# Step 1: Build the web assets
echo "📦 Building React frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

# Step 2: Sync Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync android

if [ $? -ne 0 ]; then
    echo "❌ Capacitor sync failed!"
    exit 1
fi

# Step 3: Navigate to Android directory
cd android

# Step 4: Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean

# Step 5: Build the AAB
echo "🔨 Building Android App Bundle..."
./gradlew bundleRelease

if [ $? -ne 0 ]; then
    echo "❌ AAB build failed!"
    exit 1
fi

# Step 6: Show results
echo ""
echo "✅ AAB Build Successful!"
echo "========================"
echo ""
echo "📱 AAB Location: android/app/build/outputs/bundle/release/app-release.aab"
echo "📊 Build Info:"
ls -lh app/build/outputs/bundle/release/app-release.aab

echo ""
echo "🎯 Next Steps:"
echo "1. Test the AAB using bundletool"
echo "2. Upload to Google Play Console"
echo "3. Submit for review"
echo ""
echo "💡 To test locally:"
echo "   bundletool build-apks --bundle=app/build/outputs/bundle/release/app-release.aab --output=test.apks"
echo ""