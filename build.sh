#!/bin/bash

# LeetCommit Chrome Extension Build Script
# This script packages the extension for Chrome Web Store submission

set -e  # Exit on error

echo "🚀 LeetCommit Build Script"
echo "=========================="
echo ""

# Get version from manifest.json
VERSION=$(grep -o '"version": "[^"]*' manifest.json | grep -o '[^"]*$')
echo "📦 Version: $VERSION"
echo ""

# Define output directory and filename
OUTPUT_DIR="dist"
OUTPUT_FILE="leetcommit-v${VERSION}.zip"

# Create dist directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Remove old build if exists
if [ -f "$OUTPUT_DIR/$OUTPUT_FILE" ]; then
    echo "🗑️  Removing old build: $OUTPUT_FILE"
    rm "$OUTPUT_DIR/$OUTPUT_FILE"
fi

echo "📁 Creating package..."
echo ""

# Create zip file with only necessary files
zip -r "$OUTPUT_DIR/$OUTPUT_FILE" \
    manifest.json \
    assets/ \
    src/ \
    PRIVACY_POLICY.md \
    README.md \
    -x "*.DS_Store" \
    -x "*/__pycache__/*" \
    -x "*/node_modules/*" \
    -x "*/.git/*" \
    -x "*.md" \
    -x "!PRIVACY_POLICY.md" \
    -x "!README.md"

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 Package: $OUTPUT_DIR/$OUTPUT_FILE"
echo "📊 Size: $(du -h "$OUTPUT_DIR/$OUTPUT_FILE" | cut -f1)"
echo ""
echo "🎯 Next steps:"
echo "   1. Test the extension by loading $OUTPUT_DIR/$OUTPUT_FILE"
echo "   2. Upload to Chrome Web Store"
echo "   3. Update RELEASE_CHECKLIST.md"
echo ""
