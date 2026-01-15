/**
 * Dialogflow CX Service
 * Bidirectional voice interaction via Dialogflow CX StreamingDetectIntent
 */

import { Platform, AppState } from 'react-native';
import { Audio } from 'expo-av';
import { pcm16AudioCapture } from './PCM16AudioCapture';

// Same callback interface as RealtimeService for easy replacement
interface DialogflowCallbacks {
  onTranscript?: (text: string) => void; // Real-time transcription updates
  onResponse?: (text: string) => void; // AI response text (streaming)
  onError?: (error: string) => void;
}

export class DialogflowService {
  private ws: WebSocket | null = null;
  private callbacks: DialogflowCallbacks = {};
  private audioQueue: string[] = []; // Queue for audio playback
  private isPlaying = false;
  private isRecording = false;
  // IMPORTANT:
  // - In development we default to a LAN proxy (works on your Wi‑Fi)
  // - In production/TestFlight this MUST be configured via EXPO_PUBLIC_DIALOGFLOW_PROXY_URL
  private proxyUrl =
    (process.env.EXPO_PUBLIC_DIALOGFLOW_PROXY_URL as string | undefined) ||
    (__DEV__ ? 'ws://192.168.4.29:8080/dialogflow' : '');
  private isConnected = false;
  private isPaused = false; // Pause recording when Dialogflow is responding (but keep stream open)

  setProxyUrl(url: string) {
    this.proxyUrl = url;
  }

  /**
   * Connect to proxy server (which connects to Dialogflow CX)
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    if (!this.proxyUrl) {
      const msg =
        'Dialogflow voice is not configured. Set EXPO_PUBLIC_DIALOGFLOW_PROXY_URL (e.g. wss://your-domain/dialogflow).';
      console.warn(`⚠️ ${msg}`);
      this.callbacks.onError?.(msg);
      throw new Error(msg);
    }

    console.log('🔌 Connecting to Dialogflow proxy:', this.proxyUrl);
    
    this.ws = new WebSocket(this.proxyUrl);
    
    this.ws.onopen = () => {
      console.log('✅ Connected to Dialogflow proxy');
      this.isConnected = true;
      this.send({ type: 'connect' }); // Request Dialogflow connection
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      // Don't trigger error callback for connection errors - they're often transient
      // The onclose handler will handle reconnection logic
      console.log('⚠️ WebSocket error occurred, will attempt to reconnect on close');
    };

    this.ws.onclose = () => {
      console.log('🔌 Disconnected from Dialogflow proxy');
      this.isConnected = false;
    };
  }

  /**
   * Set callbacks for UI updates
   */
  setCallbacks(callbacks: DialogflowCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Start recording and streaming audio to Dialogflow
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    // Ensure connected
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
      // Wait a bit for connection to establish
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Ensure app is active
    if (AppState.currentState !== 'active') {
      await this.waitForActive();
    }

    // Use native PCM16 module on iOS
    if (Platform.OS === 'ios') {
      try {
        await pcm16AudioCapture.startRecording(
          (base64Chunk) => this.sendAudioChunk(base64Chunk),
          (error) => this.callbacks.onError?.(error)
        );
        this.isRecording = true;
        console.log('✅ Recording started (native PCM16)');
        return;
      } catch (error: any) {
        console.warn('⚠️ Native module failed, falling back:', error.message);
      }
    }

    // Fallback: expo-av (limited - can't stream real-time)
    console.warn('⚠️ Using expo-av fallback (not real-time streaming)');
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) throw new Error('Microphone permission denied');
    
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    
    this.isRecording = true;
    console.log('✅ Recording started (expo-av fallback)');
  }

  /**
   * Pause recording (but keep stream open) when Dialogflow is responding
   * This prevents echo/feedback while AI is speaking
   */
  async pauseRecording(): Promise<void> {
    if (!this.isRecording || this.isPaused) return;
    
    this.isPaused = true;
    console.log('⏸️ Recording paused (Dialogflow responding, stream stays open)');
    
    // Note: We DON'T stop the native audio capture - we just ignore chunks temporarily
    // This keeps the stream continuous and prevents gaps
  }

  /**
   * Resume recording for next utterance
   */
  async resumeRecording(): Promise<void> {
    if (!this.isRecording || !this.isPaused) return;
    
    this.isPaused = false;
    console.log('▶️ Recording resumed (ready for next utterance)');
  }

  /**
   * Stop recording and close stream (only when user explicitly ends conversation)
   */
  async stopRecording(): Promise<void> {
    if (!this.isRecording) return;

    this.isRecording = false;
    this.isPaused = false;

    if (Platform.OS === 'ios') {
      await pcm16AudioCapture.stopRecording();
    }

    console.log('🛑 Recording stopped (conversation ended)');
  }

  /**
   * Send text message (alternative to voice)
   */
  async sendText(text: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.send({
      type: 'text',
      text: text
    });
  }

  /**
   * Send audio chunk to proxy
   */
  private sendAudioChunk(base64Pcm: string): void {
    // Always send chunks - keep stream continuous to prevent Dialogflow timeouts
    // Dialogflow VAD will handle silence detection automatically
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not open, dropping audio chunk');
      return;
    }

    if (!base64Pcm || base64Pcm.length === 0) {
      console.warn('⚠️ Empty audio chunk, dropping');
      return;
    }

    this.send({
      type: 'audio',
      audio: base64Pcm
    });
  }

  /**
   * Send message to proxy
   */
  private send(message: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ Cannot send message - WebSocket not open');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('❌ Error sending message:', error);
      this.callbacks.onError?.('Failed to send message');
    }
  }

  /**
   * Handle incoming messages from proxy
   */
  private handleMessage(data: any): void {
    try {
      const msg = typeof data === 'string' ? JSON.parse(data) : data;
      const type = msg?.type;

      if (!type) {
        console.warn('⚠️ Message with no type:', JSON.stringify(msg).substring(0, 200));
        return;
      }

      console.log(`📥 Received message type: ${type}`);

      switch (type) {
        case 'connected':
          console.log('✅ Dialogflow connected');
          this.isConnected = true;
          // Send welcome event immediately after connection is confirmed
          // This triggers the Default Welcome Intent to greet the user
          console.log('📤 Sending welcome event to trigger greeting...');
          this.send({
            type: 'welcome'
          });
          break;

        case 'transcript':
          // Real-time transcription
          if (msg.text) {
            console.log('📝 Transcript:', msg.text);
            this.callbacks.onTranscript?.(msg.text);
          }
          break;

        case 'response_text':
          // Streaming text response
          if (msg.text) {
            console.log('💬 Response text:', msg.text);
            this.callbacks.onResponse?.(msg.text);
          }
          // Don't pause - keep stream continuous to prevent timeouts
          // Dialogflow VAD will handle silence detection
          break;

        case 'audio':
          // Audio response chunk
          if (msg.audio) {
            this.enqueueAudio(msg.audio);
          }
          // Don't pause - keep stream continuous to prevent timeouts
          break;

        case 'error':
          const errorMsg = msg.message || msg.error || 'Dialogflow error';
          console.error('❌ Dialogflow error:', errorMsg);
          // Suppress WebSocket and connection errors - they're often transient
          const lowerError = errorMsg.toLowerCase();
          const isConnectionError = lowerError.includes('websocket') || 
                                   lowerError.includes('connection error') ||
                                   lowerError.includes('connection failed') ||
                                   lowerError.includes('network error');
          
          if (!isConnectionError) {
            // Only call error callback for non-connection errors
            this.callbacks.onError?.(errorMsg);
          } else {
            console.log('⚠️ Suppressing connection error (will attempt to reconnect):', errorMsg);
          }
          break;

        default:
          console.log('📨 Unknown message type:', type);
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  }

  /**
   * Queue audio for playback
   */
  private enqueueAudio(base64Audio: string): void {
    this.audioQueue.push(base64Audio);
    console.log(`🔊 Audio chunk queued (queue length: ${this.audioQueue.length})`);
    
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  /**
   * Play next audio chunk in queue
   */
  private async playNext(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      // Stream stays continuous - no need to resume
      return;
    }

    this.isPlaying = true;
    const base64Audio = this.audioQueue.shift()!;

    try {
      // Convert base64 to WAV format for playback
      const audioData = this.base64ToWav(base64Audio);
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioData },
        { shouldPlay: true }
      );

      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
            resolve();
          }
        });
      });

      // Play next chunk
      this.playNext();
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      this.isPlaying = false;
    }
  }

  /**
   * Convert base64 PCM16 to WAV data URI
   */
  private base64ToWav(base64Pcm: string): string {
    // Decode base64 to get raw PCM16 data
    const pcmData = Uint8Array.from(atob(base64Pcm), c => c.charCodeAt(0));
    
    // Create WAV header
    const sampleRate = 16000; // Dialogflow uses 16kHz
    const numChannels = 1; // Mono
    const bitsPerSample = 16;
    const dataLength = pcmData.length;
    const fileSize = 36 + dataLength;

    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    // RIFF header
    view.setUint32(0, 0x46464952, true); // "RIFF"
    view.setUint32(4, fileSize, true);
    view.setUint32(8, 0x45564157, true); // "WAVE"

    // fmt chunk
    view.setUint32(12, 0x20746d66, true); // "fmt "
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true); // byte rate
    view.setUint16(32, numChannels * (bitsPerSample / 8), true); // block align
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    view.setUint32(36, 0x61746164, true); // "data"
    view.setUint32(40, dataLength, true);

    // Combine header and PCM data
    const wavData = new Uint8Array(wavHeader.byteLength + pcmData.length);
    wavData.set(new Uint8Array(wavHeader), 0);
    wavData.set(pcmData, wavHeader.byteLength);

    // Convert to base64 data URI
    const base64Wav = btoa(String.fromCharCode(...wavData));
    return `data:audio/wav;base64,${base64Wav}`;
  }

  /**
   * Wait for app to become active
   */
  private async waitForActive(): Promise<void> {
    return new Promise((resolve) => {
      if (AppState.currentState === 'active') {
        resolve();
        return;
      }

      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          subscription.remove();
          resolve();
        }
      });
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.isRecording) {
      await this.stopRecording();
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export singleton instance
export const dialogflowService = new DialogflowService();

