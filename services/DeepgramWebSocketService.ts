// Deepgram WebSocket Service for React Native
// Direct WebSocket implementation compatible with React Native

import { conversationManager } from './ConversationManager';

const DEEPGRAM_API_KEY = process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY || '';

interface VoiceCallbacks {
  onTranscript?: (text: string) => void;
  onAIResponse?: (text: string, audioUrl: string) => void;
  onError?: (error: string) => void;
}

export class DeepgramWebSocketService {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private callbacks: VoiceCallbacks = {};

  constructor() {
    console.log('Deepgram WebSocket Service initialized');
  }

  async connect(callbacks: VoiceCallbacks): Promise<void> {
    if (!DEEPGRAM_API_KEY) {
      callbacks.onError?.('Deepgram API key not found');
      return;
    }

    this.callbacks = callbacks;

    try {
      // Connect to Deepgram WebSocket API
      // Note: React Native WebSocket doesn't support custom headers
      // We'll try without authentication first to see the exact error
      const url = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&punctuate=true&encoding=linear16&sample_rate=16000`;
      
      console.log('Connecting to Deepgram WebSocket...');
      console.log('API Key present:', !!DEEPGRAM_API_KEY);
      
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('Deepgram WebSocket connected successfully');
        this.isConnected = true;
        
        // Send a keepalive message to maintain connection
        this.ws.send(JSON.stringify({ type: 'KeepAlive' }));
      };

      this.ws.onerror = (error) => {
        console.error('Deepgram WebSocket error details:', error);
        console.error('WebSocket readyState:', this.ws?.readyState);
        console.error('WebSocket URL:', this.ws?.url);
        this.callbacks.onError?.('WebSocket connection error');
      };

      this.ws.onclose = (event) => {
        console.log('Deepgram WebSocket closed:', event.code, event.reason);
        this.isConnected = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Deepgram message:', data);
          
          // Handle transcript
          if (data.type === 'Results' && data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
            const transcript = data.channel.alternatives[0].transcript;
            if (transcript) {
              console.log('Deepgram transcript:', transcript);
              this.callbacks.onTranscript?.(transcript);
              
              // Send final transcript to OpenAI
              if (data.is_final) {
                this.sendToOpenAI(transcript);
              }
            }
          }
        } catch (error: any) {
          console.error('Error parsing Deepgram message:', error, event.data);
        }
      };

    } catch (error: any) {
      console.error('Failed to connect to Deepgram:', error);
      this.callbacks.onError?.(error.message || 'Failed to connect');
    }
  }

  private async sendToOpenAI(transcript: string): Promise<void> {
    const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      this.callbacks.onError?.('OpenAI API key not found');
      return;
    }

    // Save user message to conversation history
    await conversationManager.addMessage('user', transcript);

    // Get conversation history for context
    const conversation = await conversationManager.getCurrentConversation();
    const contextMessages = conversation.messages.slice(-15).map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are Alli, a friendly nutrition AI assistant. Keep responses concise and conversational.',
            },
            ...contextMessages,
          ],
          temperature: 0.7,
          max_tokens: 150,
        }),
      });

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || '';
      
      // Save to conversation history
      await conversationManager.addMessage('assistant', aiResponse);
      
      // Generate speech
      const audioUrl = await this.generateSpeech(aiResponse);
      this.callbacks.onAIResponse?.(aiResponse, audioUrl);
    } catch (error: any) {
      console.error('Error sending to OpenAI:', error);
      this.callbacks.onError?.(error.message || 'Failed to get AI response');
    }
  }

  private async generateSpeech(text: string): Promise<string> {
    const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!OPENAI_API_KEY) return '';

    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: 'nova',
        }),
      });

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error generating speech:', error);
      return '';
    }
  }

  sendAudio(audioData: ArrayBuffer): void {
    if (!this.isConnected || !this.ws) {
      console.error('WebSocket not connected');
      return;
    }

    // Send audio data to Deepgram
    // Note: In a full implementation, you'd send PCM audio here
    // For now, this is a placeholder for the audio streaming logic
  }

  async sendAudioFile(uri: string): Promise<void> {
    if (!this.ws) {
      console.error('WebSocket not initialized, cannot send audio file');
      this.callbacks.onError?.('WebSocket not initialized');
      return;
    }

    if (this.ws.readyState !== WebSocket.OPEN && this.ws.readyState !== WebSocket.CONNECTING) {
      console.error('WebSocket not open, state:', this.ws.readyState);
      this.callbacks.onError?.('WebSocket not connected');
      return;
    }

    try {
      console.log('Reading audio file from URI:', uri);
      
      // Read the audio file as an ArrayBuffer
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      
      console.log('Audio file size:', arrayBuffer.byteLength, 'bytes');
      
      // Send raw PCM audio data to Deepgram
      this.ws.send(arrayBuffer);
      
      console.log('Sent audio file to Deepgram');
      
      // Send 'stream_finished' message to indicate end of audio
      setTimeout(() => {
        if (this.ws && this.isConnected) {
          this.ws.send(JSON.stringify({ type: 'CloseStream' }));
        }
      }, 100);
    } catch (error: any) {
      console.error('Error sending audio file to Deepgram:', error);
      this.callbacks.onError?.(error.message || 'Failed to send audio file');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  isAvailable(): boolean {
    return !!DEEPGRAM_API_KEY;
  }
}

export const deepgramWebSocketService = new DeepgramWebSocketService();

