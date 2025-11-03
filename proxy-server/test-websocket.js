const WebSocket = require('ws');

const testConnection = () => {
  console.log('Testing WebSocket connection to proxy server...');
  
  const ws = new WebSocket('ws://192.168.4.29:3001/realtime');
  
  ws.on('open', () => {
    console.log('✅ WebSocket connection successful!');
    ws.send(JSON.stringify({ type: 'connect' }));
  });
  
  ws.on('message', (data) => {
    console.log('📨 Received message:', data.toString());
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
  });
  
  // Close after 5 seconds
  setTimeout(() => {
    ws.close();
    process.exit(0);
  }, 5000);
};

testConnection();
