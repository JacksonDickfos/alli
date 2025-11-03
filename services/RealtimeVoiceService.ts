import { Platform } from 'react-native';
import { Audio } from 'expo-av';

type VoidFn = () => void;

interface RealtimeCallbacks {
  onTranscriptStart?: VoidFn;
  onTranscriptUpdate?: (text: string) => void;
  onTranscriptComplete?: (text: string) => void;
  onAIResponse?: (text: string) => void; // streaming text deltas
  onSpeakingStart?: VoidFn;
  onSpeakingComplete?: VoidFn;
  onError?: (message: string) => void;
}

// Minimal scaffold for OpenAI Realtime WebSocket client.
// Phase 1: connection + text streaming handlers (no audio yet)
export class RealtimeVoiceService {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private callbacks: RealtimeCallbacks = {};
  // Simple audio queue for gapless playback of streamed chunks
  private audioQueue: string[] = [];
  private isPlayingAudio: boolean = false;

  // Connect to local proxy that bridges to OpenAI Realtime API
  async connect(options?: { url?: string }): Promise<void> {
    if (this.ws) return;
    const url = options?.url || 'ws://localhost:8080/realtime';
    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        this.isConnected = true;
        // Ask proxy to connect to OpenAI Realtime
        this.send({ type: 'connect' });
      };
      this.ws.onclose = () => {
        this.isConnected = false;
        this.ws = null;
      };
      this.ws.onerror = () => {
        this.callbacks.onError?.('Realtime connection error');
      };
      this.ws.onmessage = (event: any) => {
        this.handleMessage(event?.data);
      };
    } catch (e: any) {
      this.callbacks.onError?.(e?.message || 'Failed to connect to realtime service');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  setCallbacks(callbacks: RealtimeCallbacks): void {
    this.callbacks = callbacks || {};
  }

  // Start/stop listening are placeholders until mic streaming is added
  async startListening(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
    if (this.isListening) return;
    this.isListening = true;
    this.callbacks.onTranscriptStart?.();
    // Phase 2 will stream mic audio; for now we rely on text entry or stubs
  }

  async stopListening(): Promise<void> {
    this.isListening = false;
  }

  // Send a text message (fallback while mic streaming is not implemented)
  async sendText(userText: string): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
    const payload = { type: 'input_text', text: userText };
    this.send(payload);
    // Ask for a response with audio immediately after text input
    this.send({ type: 'response.create' });
  }

  // Will be used when audio streaming arrives from server
  private async handleMessage(raw: any): Promise<void> {
    try {
      const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      switch (msg?.type) {
        case 'session.created': {
          // Configure session for audio in/out
          this.send({
            type: 'session.update',
            session: {
              // Ask for audio output in wav for simple playback
              output_audio_format: 'wav',
              modalities: ['text', 'audio'],
            },
          });
          break;
        }
        case 'response.delta': {
          // Streaming text token
          if (typeof msg?.text === 'string') {
            this.callbacks.onAIResponse?.(msg.text);
          }
          break;
        }
        case 'response.audio.delta': {
          // Base64 audio chunk (wav)
          const base64 = msg?.audio;
          if (typeof base64 === 'string' && base64.length > 0) {
            this.enqueueAudioChunk(`data:audio/wav;base64,${base64}`);
          }
          break;
        }
        case 'response.completed': {
          // Full text available
          if (typeof msg?.text === 'string') {
            this.callbacks.onAIResponse?.(msg.text);
          }
          break;
        }
        case 'error': {
          this.callbacks.onError?.(msg?.message || 'Realtime error');
          break;
        }
        // Audio events will be handled here in Phase 2
        default:
          break;
      }
    } catch (e) {
      // Ignore non-JSON frames
    }
  }

  private send(obj: unknown): void {
    if (!this.ws || this.ws.readyState !== 1) return;
    try {
      this.ws.send(JSON.stringify(obj));
    } catch {}
  }

  // Placeholders to align with SimpleVoiceService API
  async stopSpeaking(): Promise<void> {
    this.isSpeaking = false;
  }

  async cleanup(): Promise<void> {
    try { await this.stopListening(); } catch {}
    try { await this.stopSpeaking(); } catch {}
    this.disconnect();
  }

  // ---- Streaming audio playback (gapless) ----
  private enqueueAudioChunk(uri: string) {
    this.audioQueue.push(uri);
    if (!this.isPlayingAudio) {
      this.playNextChunk().catch(() => {});
    }
  }

  private async playNextChunk(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlayingAudio = false;
      this.callbacks.onSpeakingComplete?.();
      return;
    }
    this.isPlayingAudio = true;
    const uri = this.audioQueue.shift() as string;
    try {
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.callbacks.onSpeakingStart?.();
      }
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('audio timeout')), 45000);
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status?.isLoaded && status?.didJustFinish) {
            clearTimeout(timeout);
            resolve();
          } else if (!status?.isLoaded && status?.error) {
            clearTimeout(timeout);
            reject(new Error(status.error));
          }
        });
      });
      await sound.unloadAsync();
    } catch {
      // Skip bad chunk
    } finally {
      await this.playNextChunk();
    }
  }

  // ---- Mic streaming (scaffold) ----
  // For full-duplex, we’ll capture 16k mono PCM and send frames:
  // this.send({ type: 'input_audio_buffer.append', audio: base64Pcm });
  // this.send({ type: 'input_audio_buffer.commit' });
  // this.send({ type: 'response.create' });
}

export const realtimeVoiceService = new RealtimeVoiceService();


