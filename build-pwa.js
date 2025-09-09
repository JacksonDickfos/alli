const fs = require('fs');
const path = require('path');

// Copy our custom files to web-build
const customFiles = [
  'icon-192.png',
  'icon-512.png', 
  'manifest.json',
  'index.html'
];

// Ensure web-build exists
if (!fs.existsSync('web-build')) {
  fs.mkdirSync('web-build');
}

// Copy custom files
customFiles.forEach(file => {
  if (fs.existsSync(`dist/${file}`)) {
    fs.copyFileSync(`dist/${file}`, `web-build/${file}`);
    console.log(`Copied ${file} to web-build/`);
  }
});

// Update the HTML file to include proper PWA meta tags
const htmlPath = 'web-build/index.html';
if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // Add PWA meta tags before closing head tag
  const pwaMeta = `
  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.json">
  
  <!-- Icons -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
  <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">
  <link rel="apple-touch-icon" href="/icon-192.png">
  
  <!-- PWA Meta Tags -->
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Alli">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#B9A68D">`;
  
  // Insert before closing head tag
  html = html.replace('</head>', pwaMeta + '\n</head>');
  
  fs.writeFileSync(htmlPath, html);
  console.log('Updated HTML with PWA meta tags');
}

console.log('PWA build complete!');
