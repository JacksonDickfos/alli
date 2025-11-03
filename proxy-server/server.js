require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ 
  server,
  path: '/realtime'
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in .env file');
  process.exit(1);
}

console.log('Proxy server starting...');

wss.on('connection', (clientWs) => {
  console.log('✅ Client connected to proxy');
  
  let openaiWs = null;
  let isConnected = false;

  // Send initial connection status (not connected to OpenAI yet)
  if (clientWs.readyState === WebSocket.OPEN) {
    clientWs.send(JSON.stringify({
      type: 'connection_status',
      connected: false
    }));
  }

  const connectToOpenAI = () => {
    if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
      console.log('Already connected to OpenAI Realtime API');
      return;
    }

    console.log('Connecting to OpenAI Realtime API...');
    
    // OpenAI Realtime API WebSocket endpoint
    // Note: Headers need to be passed in options object correctly for 'ws' library
    const openaiRealtimeUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';

    try {
      openaiWs = new WebSocket(openaiRealtimeUrl, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      // Add error handler immediately in case connection fails
      openaiWs.on('error', (error) => {
        console.error('❌ OpenAI WebSocket connection error:', error.message);
        console.error('Error details:', error);
        isConnected = false;
        
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'connection_status',
            connected: false
          }));
          clientWs.send(JSON.stringify({
            type: 'error',
            error: `Failed to connect to OpenAI: ${error.message}`
          }));
        }
      });
    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          error: `WebSocket creation failed: ${error.message}`
        }));
      }
      return;
    }

    openaiWs.on('open', () => {
      console.log('✅ Connected to OpenAI Realtime API');
      isConnected = true;
      
      // Send connection status to client
      if (clientWs.readyState === WebSocket.OPEN) {
        const statusMsg = JSON.stringify({
          type: 'connection_status',
          connected: true
        });
        console.log('📤 Sending connection_status: true to client');
        clientWs.send(statusMsg);
      } else {
        console.log('⚠️ Client WebSocket not open, cannot send connection status');
      }
    });

    openaiWs.on('message', (data) => {
      try {
        // Only forward valid, non-empty messages
        if (data && data.toString().trim() !== '') {
          const messageStr = data.toString();
          
          // Skip empty objects and invalid JSON
          if (messageStr !== '{}' && 
              messageStr !== 'null' && 
              messageStr !== 'undefined' &&
              messageStr.length > 2) {
            
            // Validate it's proper JSON
            try {
              const parsed = JSON.parse(messageStr);
              if (parsed && typeof parsed === 'object') {
                const msgType = parsed.type || 'unknown';
                console.log('📤 Forwarding to client:', msgType);
                
                // Log errors with full details
                if (msgType === 'error') {
                  console.error('❌ OpenAI error:', JSON.stringify(parsed, null, 2));
                }
                
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(data);
                } else {
                  console.log('⚠️ Client WebSocket not open, cannot forward:', msgType);
                }
              }
            } catch (parseError) {
              console.log('⚠️ Skipping invalid JSON from OpenAI:', messageStr.substring(0, 100));
            }
          }
        }
      } catch (error) {
        console.error('Error processing OpenAI message:', error);
      }
    });

    // Error handler moved above - set immediately after WebSocket creation

    openaiWs.on('close', (code, reason) => {
      console.log('🔌 Disconnected from OpenAI Realtime API:', code, reason?.toString());
      isConnected = false;
      
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'connection_status',
          connected: false
        }));
      }
    });
  };

  // Handle messages from React Native client
  clientWs.on('message', (data) => {
    try {
      // Skip empty messages
      if (!data || data.toString().trim() === '') {
        console.log('⚠️ Skipping empty client message');
        return;
      }
      
      const messageStr = data.toString();
      console.log('📥 Received from client:', messageStr.substring(0, 100));
      
      const message = JSON.parse(messageStr);
      
      // If it's a connection request, connect to OpenAI
      if (message.type === 'connect') {
        console.log('🔄 Client requested connection to OpenAI');
        connectToOpenAI();
        return;
      }
      
      // Forward all other messages to OpenAI
      if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
        console.log('📤 Forwarding to OpenAI:', message.type || 'unknown');
        openaiWs.send(data);
      } else {
        console.log('⚠️ OpenAI not connected (state:', openaiWs?.readyState, '), cannot forward message');
        console.log('Attempting to reconnect to OpenAI...');
        connectToOpenAI();
      }
    } catch (error) {
      console.error('❌ Error handling client message:', error);
      console.log('Raw client message:', data?.toString()?.substring(0, 100));
    }
  });

  clientWs.on('close', () => {
    console.log('🔌 Client disconnected from proxy');
    if (openaiWs) {
      openaiWs.close();
    }
  });

  clientWs.on('error', (error) => {
    console.error('❌ Client WebSocket error:', error);
    if (openaiWs) {
      openaiWs.close();
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connections: wss.clients.size
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Proxy server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://192.168.4.29:${PORT}/realtime`);
  console.log(`🌐 Listening on all interfaces (0.0.0.0:${PORT})`);
  console.log(`🔑 Using OpenAI API Key: ${OPENAI_API_KEY.substring(0, 10)}...`);
});

module.exports = { app, server };