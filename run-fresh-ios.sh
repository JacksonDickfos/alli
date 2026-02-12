#!/bin/bash
# Run this first. Then in a SECOND terminal run: npx expo run:ios
cd "$(dirname "$0")"
echo ">>> Killing anything on port 8081..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
sleep 2
echo ">>> Clearing caches..."
rm -rf node_modules/.cache .expo 2>/dev/null || true
echo ">>> Starting Metro on 8081. LEAVE THIS RUNNING. In another terminal run: npx expo run:ios"
npx expo start --clear --port 8081
