// services/OpenAIStreamingService.ts
import { Platform } from 'react-native';

interface StreamingCallbacks {
  onTranscript?: (text: string) => void;
  onAIResponse?: (text: string) => void;
  onError?: (error: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

class OpenAIStreamingService {
  private callbacks: StreamingCallbacks = {};
  private isConnected: boolean = false;
  private isRecording: boolean = false;
  private abortController: AbortController | null = null;

  constructor() {
    console.log('OpenAI Streaming Service initialized');
  }

  async connect(callbacks: StreamingCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.isConnected = true;
    this.callbacks.onConnectionChange?.(true);
    console.log('Connected to OpenAI Streaming Service');
  }

  async startRecording(): Promise<void> {
    if (!this.isConnected) {
      this.callbacks.onError?.('Not connected to OpenAI Streaming Service');
      return;
    }

    this.isRecording = true;
    console.log('Started recording with OpenAI Streaming Service');
  }

  async stopRecording(): Promise<void> {
    if (!this.isConnected) {
      this.callbacks.onError?.('Not connected to OpenAI Streaming Service');
      return;
    }

    this.isRecording = false;
    console.log('Stopped recording with OpenAI Streaming Service');
  }

  async sendAudioData(audioData: ArrayBuffer): Promise<void> {
    if (!this.isConnected || !this.isRecording) {
      return;
    }

    try {
      // Convert audio to base64 for transmission
      const base64Audio = this.arrayBufferToBase64(audioData);
      
      // For now, simulate transcription (in real implementation, you'd send to OpenAI)
      setTimeout(() => {
        const mockTranscript = "Hello, this is a test transcription";
        this.callbacks.onTranscript?.(mockTranscript);
        
        // Simulate AI response
        setTimeout(() => {
          const mockResponse = "Hello! I'm Alli, your nutrition assistant. How can I help you today?";
          this.callbacks.onAIResponse?.(mockResponse);
        }, 1000);
      }, 500);
      
    } catch (error: any) {
      console.error('Error processing audio data:', error);
      this.callbacks.onError?.(error.message || 'Failed to process audio data');
    }
  }

  async sendTextMessage(message: string): Promise<void> {
    if (!this.isConnected) {
      this.callbacks.onError?.('Not connected to OpenAI Streaming Service');
      return;
    }

    try {
      const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (!OPENAI_API_KEY) {
        this.callbacks.onError?.('OpenAI API key not found');
        return;
      }

      // Create abort controller for this request
      this.abortController = new AbortController();

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
              content: 'You are Alli, a friendly nutrition assistant. Keep responses concise and helpful.'
            },
            {
              role: 'user',
              content: message
            }
          ],
          stream: true,
          max_tokens: 500,
          temperature: 0.8,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      let fullResponse = '';
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                console.log('Streaming complete');
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  this.callbacks.onAIResponse?.(content);
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      console.error('Error sending text message:', error);
      this.callbacks.onError?.(error.message || 'Failed to send message');
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  disconnect(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isConnected = false;
    this.isRecording = false;
    this.callbacks.onConnectionChange?.(false);
    console.log('Disconnected from OpenAI Streaming Service');
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getRecordingStatus(): boolean {
    return this.isRecording;
  }
}

export const openAIStreamingService = new OpenAIStreamingService();
