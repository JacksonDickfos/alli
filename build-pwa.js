const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building PWA...');

// Run expo export
execSync('npx expo export --platform web', { stdio: 'inherit' });

// Copy our custom HTML template
const customHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Alli Nutrition App</title>
    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json" />
    <!-- iOS PWA meta -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Alli" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <link rel="apple-touch-icon" href="/logo.png" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="theme-color" content="#B9A68D" />
    <style id="expo-reset">
      html, body { height: 100%; }
      body { overflow: hidden; background: #fff; }
      #root { display: flex; height: 100%; flex: 1; }
    </style>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script src="/_expo/static/js/web/index-d26b0afb848e19593cc2ec3e7c34ef2f.js"></script>
  </body>
</html>`;

// Write custom HTML
fs.writeFileSync('dist/index.html', customHtml);

// Copy manifest
const manifest = {
  "name": "Alli Nutrition App",
  "short_name": "Alli",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#B9A68D",
  "icons": [
    {
      "src": "/logo.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/logo.png", 
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
};

fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));

console.log('PWA build complete!');
