import { OPENAI_API_KEY } from '../env';

// Use React Native's native WebSocket (built into React Native)
// No import needed - WebSocket is a global in React Native

interface RealtimeCallbacks {
  onTranscript: (text: string) => void;
  onAIResponse: (text: string) => void;
  onError: (error: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

class OpenAIRealtimeService {
  private websocket: any = null; // Use any to avoid type issues with React Native WebSocket
  private callbacks: RealtimeCallbacks | null = null;
  private isConnected: boolean = false;
  private isOpenAIConnected: boolean = false; // Track if proxy has connected to OpenAI
  private conversationId: string | null = null;
  private isRecording: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  constructor() {
    console.log('🤖 OpenAI Realtime Service initialized');
    
    // Verify WebSocket is available
    if (typeof WebSocket === 'undefined') {
      console.error('❌ WebSocket is not available in this environment');
    } else {
      console.log('✅ WebSocket is available');
    }
  }

  async connect(callbacks: RealtimeCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.reconnectAttempts = 0;

    // Check if WebSocket is available
    if (typeof WebSocket === 'undefined') {
      const error = 'WebSocket is not available in this environment';
      console.error('❌', error);
      this.callbacks?.onError?.(error);
      throw new Error(error);
    }

    try {
      // Connect to our proxy server
      const PROXY_URL = 'ws://192.168.4.29:3001/realtime';
      console.log('🔌 Connecting to proxy server:', PROXY_URL);
      
      // Use native React Native WebSocket
      this.websocket = new (WebSocket as any)(PROXY_URL);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 15000); // Increased timeout to 15 seconds

        this.websocket!.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ Connected to proxy server');
          this.isConnected = true;
          // Don't set fully connected yet - wait for OpenAI connection
          this.callbacks?.onConnectionChange?.(false);
          
          // Send connection request to proxy (this will trigger OpenAI connection)
          this.sendMessage({
            type: 'connect'
          });
          
          // Wait for OpenAI connection confirmation before resolving
          // The connection_status message will come from proxy when OpenAI connects
          // We'll send session config after receiving connection_status: true
          resolve();
        };

        this.websocket!.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ WebSocket error:', error);
          this.callbacks?.onError?.('Connection error');
          reject(error);
        };

        this.websocket!.onclose = (event) => {
          console.log('🔌 Disconnected from proxy server:', event.code, event.reason || 'No reason provided');
          console.log('Close event details:', JSON.stringify(event, null, 2));
          this.isConnected = false;
          this.callbacks?.onConnectionChange?.(false);
          
          // Log close code meanings
          if (event.code === 1000) {
            console.log('✅ Normal closure');
          } else if (event.code === 1001) {
            console.log('⚠️ Going away');
          } else if (event.code === 1006) {
            console.log('❌ Abnormal closure - connection lost');
          } else {
            console.log('❌ Close code:', event.code);
          }
        };

        this.websocket!.onmessage = (event) => {
          this.handleMessage(event);
        };
      });

      // Wait for session to be created by OpenAI, then send session config
      // OpenAI creates the session automatically on connection
      // We'll send the config after receiving session.created

    } catch (error: any) {
      console.error('❌ Error connecting to OpenAI Realtime:', error);
      this.callbacks?.onError?.(error.message || 'Failed to connect');
      throw error;
    }
  }

  private sendSessionConfig(): void {
    if (!this.isConnected || !this.websocket) {
      console.log('⚠️ Cannot send session config - not connected');
      return;
    }

    console.log('📋 Sending session configuration...');
    
    this.sendMessage({
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: `You are Alli, a friendly and knowledgeable nutrition assistant. Here's how you should behave:

PERSONALITY:
- Warm, encouraging, and supportive
- Professional but approachable
- Enthusiastic about helping with nutrition and health
- Use a conversational, friendly tone

EXPERTISE:
- Nutrition science and meal planning
- Weight management and healthy eating
- Food tracking and macro/micro nutrients
- Exercise and lifestyle advice
- Cooking tips and recipe suggestions

COMMUNICATION STYLE:
- Keep responses concise but helpful (2-3 sentences max)
- Use encouraging language
- Ask follow-up questions when appropriate
- Provide actionable advice
- Be positive and motivating

VOICE SETTINGS:
- Use a warm, friendly female voice
- Speak clearly and at a moderate pace
- Sound enthusiastic but not overly excited
- Maintain a professional yet approachable tone

Remember: You're helping users achieve their health and nutrition goals through personalized, supportive guidance.`,
        voice: 'nova',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200
        },
        tools: [],
        tool_choice: 'auto',
        temperature: 0.8,
        max_response_output_tokens: 4096
      }
    });
  }

  private handleMessage(event: any): void {
    try {
      // Skip empty, invalid, or problematic messages
      if (!event.data) {
        console.log('⚠️ Skipping empty event.data');
        return;
      }

      // Handle both string and object data
      let data: any;
      
      if (typeof event.data === 'string') {
        // If it's a string, check if it's empty
        if (!event.data || 
            event.data === '{}' || 
            event.data === '' || 
            event.data === 'null' ||
            event.data === 'undefined' ||
            event.data.trim() === '') {
          console.log('⚠️ Skipping empty/invalid string message');
          return;
        }
        // Parse the string
        try {
          data = JSON.parse(event.data);
        } catch (e) {
          console.log('⚠️ Failed to parse message string:', event.data);
          return;
        }
      } else if (typeof event.data === 'object' && event.data !== null) {
        // If it's already an object, use it directly
        // Check if it's an empty object
        try {
          const keys = Object.keys(event.data);
          if (keys.length === 0) {
            console.log('⚠️ Skipping empty object message');
            return;
          }
        } catch (e) {
          console.log('⚠️ Could not check object keys:', e);
          return;
        }
        data = event.data;
      } else {
        console.log('⚠️ Skipping invalid message type:', typeof event.data);
        return;
      }
      
      console.log('📨 OpenAI Realtime message:', data.type || 'unknown');

      switch (data.type) {
        case 'connection_status':
          console.log('🔗 Connection status:', data.connected);
          this.isOpenAIConnected = data.connected;
          // Only consider fully connected when both proxy and OpenAI are connected
          const fullyConnected = this.isConnected && this.isOpenAIConnected;
          if (fullyConnected) {
            console.log('✅ Fully connected to OpenAI Realtime');
            // Wait for session.created before configuring
          }
          this.callbacks?.onConnectionChange?.(fullyConnected);
          break;

        case 'session.created':
          this.conversationId = data.id || data.session?.id;
          console.log('✅ Session created:', this.conversationId);
          
          // Now that session is created, send our configuration
          // Wait a bit to ensure session is ready
          setTimeout(() => {
            this.sendSessionConfig();
          }, 300);
          break;

        case 'session.updated':
          console.log('✅ Session updated successfully');
          console.log('Session details:', JSON.stringify(data.session || data, null, 2));
          break;
        
        case 'error':
        case 'session.update.error':
          console.error('❌ Session update error:', data);
          this.callbacks?.onError?.(data.error?.message || 'Session update failed');
          break;

        case 'conversation.item.input_audio_buffer.committed':
          console.log('🎤 Audio input committed');
          break;

        case 'conversation.item.input_audio_buffer.transcribed':
        case 'input_audio_buffer.transcribed':
          const transcript = data.transcript || data.item?.transcript || data.delta;
          if (transcript) {
            console.log('📝 Transcript received:', transcript);
            this.callbacks?.onTranscript?.(transcript);
          }
          break;

        case 'conversation.item.assistant_utterance':
        case 'response.audio_transcript.delta':
          // Handle both full text and delta updates
          let responseText = data.text || data.delta || data.item?.text;
          if (responseText) {
            console.log('🤖 AI Response received:', responseText);
            this.callbacks?.onAIResponse?.(responseText);
          }
          break;
        
        case 'response.audio_transcript.done':
          // Final response text
          if (data.transcript) {
            console.log('🤖 AI Response complete:', data.transcript);
            this.callbacks?.onAIResponse?.(data.transcript);
          }
          break;

        case 'conversation.item.error':
          console.error('❌ Conversation error:', data.error);
          this.callbacks?.onError?.(data.error?.message || 'Conversation error');
          break;

        case 'error':
          console.error('❌ Service error:', data.error);
          this.callbacks?.onError?.(data.error || 'Service error');
          break;

        default:
          console.log('❓ Unknown message type:', data.type);
          break;
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
      console.log('Raw message data:', event.data);
      console.log('Message type:', typeof event.data);
      console.log('Message length:', event.data?.length);
    }
  }

  private sendMessage(message: any): void {
    if (this.websocket && this.isConnected) {
      try {
        const messageStr = JSON.stringify(message);
        console.log('📤 Sending message:', message.type || 'unknown');
        this.websocket.send(messageStr);
      } catch (error) {
        console.error('❌ Error sending message:', error);
      }
    } else {
      console.log('⚠️ Cannot send message - not connected');
    }
  }

  async startRecording(): Promise<void> {
    if (!this.isConnected || !this.websocket) {
      console.log('⚠️ Not connected to proxy, attempting to reconnect...');
      try {
        if (this.callbacks) {
          await this.connect(this.callbacks);
          // Wait for connection to stabilize
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        this.callbacks?.onError?.('Failed to connect to proxy server');
        return;
      }
    }

    // Wait for OpenAI connection through proxy (with timeout)
    if (!this.isOpenAIConnected) {
      console.log('⏳ Waiting for OpenAI connection...');
      let attempts = 0;
      const maxWaitAttempts = 10; // 5 seconds total
      
      while (!this.isOpenAIConnected && attempts < maxWaitAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (!this.isOpenAIConnected) {
        this.callbacks?.onError?.('OpenAI connection timeout. Please check your API key and try again.');
        return;
      }
    }

    if (!this.isConnected || !this.websocket || !this.isOpenAIConnected) {
      this.callbacks?.onError?.('Not connected to OpenAI Realtime');
      return;
    }

    try {
      console.log('🎤 Starting audio recording...');
      
      // Start audio input
      this.sendMessage({
        type: 'conversation.item.create',
        item: {
          type: 'input_audio_buffer',
          audio_buffer: {
            format: 'pcm16'
          }
        }
      });

      // Send a welcome message to start the conversation
      this.sendMessage({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'input_text',
              text: 'Hi! I\'m Alli, your nutrition assistant. How can I help you with your health and nutrition goals today?'
            }
          ]
        }
      });

      this.isRecording = true;
      console.log('✅ Started recording with OpenAI Realtime');
    } catch (error: any) {
      console.error('❌ Error starting recording:', error);
      this.callbacks?.onError?.(error.message || 'Failed to start recording');
    }
  }

  async stopRecording(): Promise<void> {
    if (!this.isConnected || !this.websocket) {
      console.log('⚠️ Not connected, cannot stop recording');
      return;
    }

    try {
      console.log('🛑 Stopping audio recording...');
      
      // Stop audio input
      this.sendMessage({
        type: 'conversation.item.create',
        item: {
          type: 'input_audio_buffer.done'
        }
      });

      this.isRecording = false;
      console.log('✅ Stopped recording with OpenAI Realtime');
    } catch (error: any) {
      console.error('❌ Error stopping recording:', error);
      this.callbacks?.onError?.(error.message || 'Failed to stop recording');
    }
  }

  async sendTextMessage(text: string): Promise<void> {
    if (!this.isConnected || !this.websocket) {
      console.log('⚠️ Not connected, cannot send text message');
      return;
    }

    try {
      console.log('📝 Sending text message:', text);
      
      this.sendMessage({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: text
            }
          ]
        }
      });
    } catch (error: any) {
      console.error('❌ Error sending text message:', error);
      this.callbacks?.onError?.(error.message || 'Failed to send text message');
    }
  }

  async sendAudioData(audioData: ArrayBuffer): Promise<void> {
    if (!this.isConnected || !this.websocket) {
      console.log('⚠️ Not connected, cannot send audio data');
      return;
    }

    try {
      console.log('🎵 Sending audio data:', audioData.byteLength, 'bytes');
      
      // Convert ArrayBuffer to base64
      const base64 = btoa(String.fromCharCode(...new Uint8Array(audioData)));
      
      this.sendMessage({
        type: 'conversation.item.input_audio_buffer.append',
        audio_buffer: {
          format: 'pcm16',
          data: base64
        }
      });
    } catch (error: any) {
      console.error('❌ Error sending audio data:', error);
      this.callbacks?.onError?.(error.message || 'Failed to send audio data');
    }
  }

  disconnect(): void {
    console.log('🔌 Disconnecting from OpenAI Realtime...');
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.isConnected = false;
    this.isOpenAIConnected = false;
    this.isRecording = false;
    this.conversationId = null;
    this.callbacks?.onConnectionChange?.(false);
  }
}

export const openAIRealtimeService = new OpenAIRealtimeService();