#!/bin/bash
npx expo export --platform web
cp web/index.html dist/index.html
cp web/manifest.json dist/manifest.json
echo "PWA build complete"
