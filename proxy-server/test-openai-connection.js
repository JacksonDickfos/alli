// Test script to verify OpenAI Realtime API connection
const WebSocket = require('ws');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';

console.log('🔑 Testing OpenAI Realtime API connection...');
console.log('API Key (first 20 chars):', OPENAI_API_KEY.substring(0, 20) + '...');

const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';

console.log('📡 Connecting to:', url);

const ws = new WebSocket(url, {
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'OpenAI-Beta': 'realtime=v1',
  },
});

const timeout = setTimeout(() => {
  console.error('❌ Connection timeout after 10 seconds');
  ws.close();
  process.exit(1);
}, 10000);

ws.on('open', () => {
  clearTimeout(timeout);
  console.log('✅ Successfully connected to OpenAI Realtime API!');
  console.log('📋 Sending session.update...');
  
  ws.send(JSON.stringify({
    type: 'session.update',
    session: {
      modalities: ['text'],
      instructions: 'You are a test assistant.'
    }
  }));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📨 Received:', message.type || 'unknown');
    
    if (message.type === 'session.updated') {
      console.log('✅ Session updated successfully!');
      console.log('🎉 OpenAI Realtime API is working!');
      ws.close();
      process.exit(0);
    }
    
    if (message.type === 'error') {
      console.error('❌ Error from OpenAI:', message);
      ws.close();
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error);
  }
});

ws.on('error', (error) => {
  clearTimeout(timeout);
  console.error('❌ WebSocket error:', error.message);
  console.error('Full error:', error);
  
  if (error.code === 'ECONNREFUSED') {
    console.error('💡 This might be a network issue');
  } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    console.error('💡 API key might be invalid or expired');
  } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
    console.error('💡 API key might not have access to Realtime API (requires special access)');
  }
  
  process.exit(1);
});

ws.on('close', (code, reason) => {
  clearTimeout(timeout);
  console.log(`🔌 Connection closed. Code: ${code}, Reason: ${reason?.toString() || 'None'}`);
  
  if (code === 1006) {
    console.error('❌ Abnormal closure - connection was reset');
  }
  
  process.exit(code === 1000 ? 0 : 1);
});

