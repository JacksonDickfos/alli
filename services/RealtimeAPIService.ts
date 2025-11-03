// OpenAI Realtime API WebSocket Service
// This enables bidirectional audio streaming with OpenAI's latest conversational models

const REALTIME_API_URL = 'wss://api.openai.com/v1/realtime';
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

interface RealtimeMessage {
  type: 'input_audio_buffer' | 'conversation.item.created' | 'response.audio.delta' | 'response.done' | 'error' | 'session.created' | 'response.audio_transcript.delta';
  data?: any;
  item?: any;
  delta?: string;
}

interface AudioChunk {
  audio: string; // Base64 encoded audio data
}

type EventCallback = (data?: any) => void;

export class RealtimeAPIService {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private conversationId: string | null = null;
  private audioBuffer: string = '';
  private listeners: Map<string, EventCallback[]> = new Map();

  constructor() {}

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!OPENAI_API_KEY) {
        reject(new Error('OpenAI API key not found'));
        return;
      }

      // Connect to OpenAI Realtime API
      // Use API key in URL since RN WebSocket doesn't support headers
      const apiKey = OPENAI_API_KEY || '';
      const wsUrl = `${REALTIME_API_URL}?model=gpt-4o-realtime-preview-2024-10-01&api_key=${apiKey}`;
      
      // Create WebSocket connection
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Realtime API WebSocket connected');
        
        // Send initial configuration with API key
        try {
          this.ws?.send(JSON.stringify({
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: 'You are Alli, a friendly nutrition AI.',
              voice: 'alloy',
              temperature: 0.8,
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
            },
          }));
        } catch (error) {
          console.error('Error sending initial config:', error);
          this.emit('error', error);
        }
        
        this.emit('connected');
        resolve();
      };

      this.ws.onmessage = (event) => {
        const message: RealtimeMessage = JSON.parse(event.data);
        this.handleMessage(message);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.emit('disconnected');
      };
    });
  }

  private handleMessage(message: RealtimeMessage): void {
    switch (message.type) {
      case 'session.created':
        this.sessionId = message.data?.session?.id || null;
        this.conversationId = message.data?.session?.id || null;
        console.log('Session created:', this.sessionId);
        this.emit('sessionCreated', this.sessionId);
        break;

      case 'response.audio.delta':
        // Audio delta from AI response
        if (message.delta) {
          this.audioBuffer += message.delta;
          this.emit('audioChunk', message.delta);
        }
        break;

      case 'response.audio_transcript.delta':
        // Text transcript as AI is speaking
        if (message.delta) {
          this.emit('textDelta', message.delta);
        }
        break;

      case 'response.done':
        // Response complete
        this.emit('responseDone');
        break;

      case 'conversation.item.created':
        // New conversation item (user or AI message)
        this.emit('conversationItem', message.item);
        break;

      case 'error':
        console.error('Realtime API error:', message.data);
        this.emit('error', message.data);
        break;

      default:
        console.log('Unhandled message type:', message.type);
    }
  }

  // Send audio buffer to OpenAI
  sendAudio(audioData: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    const message: AudioChunk = {
      audio: audioData, // Base64 encoded PCM audio
    };

    this.ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: audioData,
    }));
  }

  // Send text message (fallback or after voice input)
  sendTextMessage(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'input_audio_buffer.flush',
    }));

    // Add a function call or direct message
    this.ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: text,
      },
    }));
  }

  // Start response generation
  startResponse(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'response.create',
    }));
  }

  // Stop response (when interrupting AI)
  stopResponse(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'response.stop',
    }));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const realtimeAPIService = new RealtimeAPIService();

