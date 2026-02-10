/**
 * Minimal OpenAI Realtime API Service
 * Direct integration for speech-to-speech bidirectional conversation
 */

import { Platform, AppState } from 'react-native';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import { pcm16AudioCapture } from './PCM16AudioCapture';

// Simplified callbacks - only what's essential
interface RealtimeCallbacks {
  onTranscript?: (text: string) => void; // Real-time transcription updates
  onResponse?: (text: string) => void; // AI response text (streaming)
  onError?: (error: string) => void;
}

export class RealtimeService {
  private ws: WebSocket | null = null;
  private callbacks: RealtimeCallbacks = {};
  private audioQueue: string[] = []; // Queue for audio playback
  private audioChunkQueue: string[] = []; // Queue for audio chunks waiting to be sent
  private isPlaying = false;
  private isRecording = false;
  // IMPORTANT:
  // - In development we default to a LAN proxy (works on your Wi‑Fi)
  // - In production/TestFlight this MUST be configured via one of:
  //   - EXPO_PUBLIC_REALTIME_PROXY_URL (preferred), OR
  //   - app.json -> expo.extra.realtimeProxyUrl
  //   Otherwise, users can't reach your laptop/LAN IP.
  private proxyUrl =
    (process.env.EXPO_PUBLIC_REALTIME_PROXY_URL as string | undefined) ||
    (Constants.expoConfig?.extra as any)?.realtimeProxyUrl ||
    (__DEV__ ? 'ws://192.168.4.29:8080/realtime' : '');
  private sessionCreated = false; // Track if OpenAI session is ready
  private isOpenAIConnected = false; // Track if OpenAI is actually connected (via connection_status)
  private audioChunksSent = 0; // Track how many audio chunks were actually sent (not dropped)

  setProxyUrl(url: string) {
    this.proxyUrl = url;
  }

  /**
   * Connect to proxy server (which connects to OpenAI Realtime API)
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    if (!this.proxyUrl) {
      const msg =
        'Realtime voice is not configured. Set EXPO_PUBLIC_REALTIME_PROXY_URL (or set expo.extra.realtimeProxyUrl in app.json) to your public wss://.../realtime endpoint.';
      console.warn(`⚠️ ${msg}`);
      this.callbacks.onError?.(msg);
      throw new Error(msg);
    }

    console.log('🔌 Connecting to proxy:', this.proxyUrl);
    
    this.ws = new WebSocket(this.proxyUrl);
    
    this.ws.onopen = () => {
      console.log('✅ Connected to proxy');
      this.sessionCreated = false; // Reset session flag on new connection
      this.isOpenAIConnected = false; // Reset OpenAI connection status
      this.audioChunksSent = 0; // Reset audio chunk counter
      this.audioChunkQueue = []; // Clear any queued chunks
      console.log('🔄 Session state reset - waiting for session.updated before sending audio');
      this.send({ type: 'connect' }); // Request OpenAI connection
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.callbacks.onError?.('Connection error');
    };

    this.ws.onclose = () => {
      console.log('🔌 Disconnected');
      this.sessionCreated = false; // Reset session flag on disconnect
      this.isOpenAIConnected = false; // Reset OpenAI connection status
      this.audioChunkQueue = []; // Clear queued chunks on disconnect
    };
  }

  /**
   * Set callbacks for UI updates
   */
  setCallbacks(callbacks: RealtimeCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Start recording and streaming audio to OpenAI
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    // Ensure connected
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
      // Wait for OpenAI connection AND session
      await this.waitForOpenAI();
      await this.waitForSession(); // CRITICAL: Wait for session before sending audio
    } else if (!this.sessionCreated) {
      // Already connected but session not ready
      await this.waitForSession();
    }

    // Clear any queued chunks from previous recording
    this.audioChunkQueue = [];

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
   * Stop recording and request AI response
   */
  async stopRecording(): Promise<void> {
    if (!this.isRecording) return;

    this.isRecording = false;

    if (Platform.OS === 'ios') {
      await pcm16AudioCapture.stopRecording();
    }

    // Wait for session to be created before requesting response
    if (!this.sessionCreated) {
      console.log('⏳ Waiting for session.created before requesting response...');
      await this.waitForSession();
    }

    // Only commit if we actually sent audio chunks
    // OpenAI rejects empty commits which causes server_error
    if (this.audioChunksSent > 0) {
      console.log(`📤 Committing audio buffer (${this.audioChunksSent} chunks sent)`);
      this.send({ type: 'input_audio_buffer.commit' });
      this.send({
        type: 'response.create',
        response: { modalities: ['text', 'audio'] }
      });
      this.audioChunksSent = 0; // Reset counter
      console.log('✅ Audio committed, response requested');
    } else {
      console.warn('⚠️ No audio chunks were sent (all dropped due to disconnections), skipping commit');
      console.warn('   This prevents server_error from empty buffer commit');
    }
  }

  /**
   * Send text message (alternative to voice)
   */
  async sendText(text: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
      await this.waitForOpenAI();
    }

    // Wait for session to be created before requesting response
    if (!this.sessionCreated) {
      console.log('⏳ Waiting for session.created before sending text...');
      await this.waitForSession();
    }

    this.send({ type: 'input_text_buffer.append', text });
    this.send({ type: 'input_text_buffer.commit' });
    this.send({
      type: 'response.create',
      response: { modalities: ['text', 'audio'] }
    });
  }

  /**
   * Handle incoming messages from OpenAI
   */
  private handleMessage(data: any): void {
    try {
      // Log raw data for debugging
      console.log('📥 Raw message received:', typeof data, data?.toString?.()?.substring(0, 100) || String(data).substring(0, 100));
      
      const msg = typeof data === 'string' ? JSON.parse(data) : data;
      const type = msg?.type;

      if (!type) {
        console.log('⚠️ Message with no type:', JSON.stringify(msg).substring(0, 200));
        console.log('   Full message:', JSON.stringify(msg));
        return;
      }

      // Log ALL message types for diagnostics
      console.log(`📥 Received message type: ${type}`);

      switch (type) {
        case 'connection_status':
          console.log('🔗 OpenAI connected:', msg.connected);
          this.isOpenAIConnected = msg.connected === true;
          if (!this.isOpenAIConnected) {
            console.warn('⚠️ OpenAI disconnected, stopping audio streaming');
            // Clear queued chunks if OpenAI disconnects
            this.audioChunkQueue = [];
          }
          break;

        case 'session.created':
          console.log('✅ Session created');
          console.log('   Session details:', JSON.stringify(msg).substring(0, 300));
          // Mark session as created, but wait for session.updated before sending audio
          // session.updated confirms our session.update (with audio format) was processed
          break;

        case 'session.updated':
          console.log('✅ Session updated');
          console.log('   Session details:', JSON.stringify(msg).substring(0, 300));
          this.sessionCreated = true; // Mark session as ready - can now send audio
          // Wait longer before flushing audio - OpenAI may need time to fully initialize
          // Community reports suggest waiting 500ms-1s after session.updated
          setTimeout(() => {
            if (this.isOpenAIConnected && this.sessionCreated) {
              console.log('📤 Session ready, flushing queued audio chunks...');
              this.flushAudioChunkQueue();
            } else {
              console.warn('⚠️ Cannot flush - OpenAI not connected or session not ready');
            }
          }, 1000); // Increased to 1s to ensure session is fully initialized
          break;

        case 'conversation.item.input_audio_transcription.delta':
          // Real-time transcription
          console.log('📝 Transcription delta:', msg.delta || msg.text || '');
          this.callbacks.onTranscript?.(msg.delta || msg.text || '');
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // Final transcription
          console.log('📝 Transcription completed:', msg.transcript || msg.text || '');
          this.callbacks.onTranscript?.(msg.transcript || msg.text || '');
          break;

        case 'response.text.delta':
          // Streaming AI response text
          console.log('💬 Response text delta:', (msg.delta || msg.text || '').substring(0, 50));
          this.callbacks.onResponse?.(msg.delta || msg.text || '');
          break;

        case 'response.audio.delta':
          // Streaming AI audio
          console.log('🔊 RESPONSE.AUDIO.DELTA RECEIVED!');
          console.log('   Audio data present:', !!msg.audio);
          console.log('   Audio data type:', typeof msg.audio);
          console.log('   Audio data length:', msg.audio ? String(msg.audio).length : 0);
          console.log('   Full message keys:', Object.keys(msg));
          console.log('   Message preview:', JSON.stringify(msg).substring(0, 200));
          
          if (msg.audio) {
            console.log('✅ Enqueueing audio chunk (length:', String(msg.audio).length, ')');
            this.enqueueAudio(msg.audio);
          } else {
            console.warn('⚠️ response.audio.delta has no audio field!');
            console.warn('   Message structure:', JSON.stringify(msg));
          }
          break;

        case 'response.audio_transcript.delta':
          console.log('📝 Audio transcript delta:', msg.delta || msg.text || '');
          break;

        case 'response.audio_transcript.done':
          console.log('✅ Audio transcript done');
          break;

        case 'response.created':
          console.log('🎬 Response created');
          console.log('   Response details:', JSON.stringify(msg).substring(0, 300));
          break;

        case 'response.output_item.added':
          console.log('➕ Response output item added');
          console.log('   Item details:', JSON.stringify(msg).substring(0, 300));
          break;

        case 'response.output_item.done':
          console.log('✅ Response output item done');
          console.log('   Item details:', JSON.stringify(msg).substring(0, 300));
          break;

        case 'response.done':
          console.log('✅ Response done');
          console.log('   Response details:', JSON.stringify(msg).substring(0, 300));
          break;

        case 'error':
          console.error('❌ OpenAI error:', msg.message || JSON.stringify(msg));
          this.callbacks.onError?.(msg.message || 'Realtime error');
          break;

        default:
          // Log unhandled message types for diagnostics
          console.log(`⚠️ Unhandled message type: ${type}`);
          console.log('   Message preview:', JSON.stringify(msg).substring(0, 300));
          break;
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      console.error('   Raw data:', typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200));
    }
  }

  /**
   * Send audio chunk to OpenAI (queues if session not ready)
   */
  private sendAudioChunk(base64Pcm: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not open, dropping audio chunk');
      return;
    }

    // Don't send if OpenAI is not connected
    if (!this.isOpenAIConnected) {
      console.warn('⚠️ OpenAI not connected, dropping audio chunk');
      return;
    }

    // Validate audio chunk
    if (!base64Pcm || base64Pcm.length === 0) {
      console.warn('⚠️ Empty audio chunk, dropping');
      return;
    }

    // If session not ready, queue the chunk
    if (!this.sessionCreated) {
      console.log('⏳ Session not ready, queueing audio chunk (queue length:', this.audioChunkQueue.length, ')');
      this.audioChunkQueue.push(base64Pcm);
      return;
    }

    // Session is ready and OpenAI is connected, send immediately
    // Validate base64 format (should only contain valid base64 characters)
    if (!/^[A-Za-z0-9+/=]+$/.test(base64Pcm)) {
      console.error('❌ Invalid base64 audio chunk format');
      return;
    }
    
    // Log chunk size for debugging (base64 is ~33% larger than raw)
    const rawSize = Math.floor(base64Pcm.length * 0.75);
    const frameCount = rawSize / 2; // 16-bit = 2 bytes per sample
    const durationMs = (frameCount / 24000) * 1000; // 24kHz sample rate
    
    console.log(`📤 Sending audio chunk: ${base64Pcm.length} bytes base64 (~${rawSize} bytes raw, ~${frameCount} frames, ~${durationMs.toFixed(1)}ms)`);
    
    this.send({
      type: 'input_audio_buffer.append',
      audio: base64Pcm
    });
    this.audioChunksSent++; // Track that we actually sent audio
  }

  /**
   * Flush queued audio chunks now that session is ready
   * Send with small delays to avoid overwhelming the server
   */
  private flushAudioChunkQueue(): void {
    if (this.audioChunkQueue.length === 0) {
      return;
    }

    if (!this.isOpenAIConnected) {
      console.warn('⚠️ Cannot flush audio chunks - OpenAI not connected');
      return;
    }

    console.log('📤 Flushing', this.audioChunkQueue.length, 'queued audio chunks');
    
    // Send chunks with small delays to avoid overwhelming OpenAI
    let delay = 0;
    const chunks = [...this.audioChunkQueue]; // Copy array
    this.audioChunkQueue = []; // Clear queue
    
    chunks.forEach((chunk, index) => {
      setTimeout(() => {
        if (this.isOpenAIConnected && this.sessionCreated) {
          this.send({
            type: 'input_audio_buffer.append',
            audio: chunk
          });
          this.audioChunksSent++;
          if (index === chunks.length - 1) {
            console.log('✅ All queued audio chunks sent');
          }
        }
      }, delay);
      delay += 10; // 10ms delay between chunks
    });
  }

  /**
   * Queue audio chunk for playback
   */
  private enqueueAudio(base64Pcm: string): void {
    console.log('📦 Enqueueing audio chunk');
    console.log('   Queue length before:', this.audioQueue.length);
    console.log('   Currently playing:', this.isPlaying);
    console.log('   Audio data length:', base64Pcm ? String(base64Pcm).length : 0);
    
    this.audioQueue.push(base64Pcm);
    console.log('   Queue length after:', this.audioQueue.length);
    
    if (!this.isPlaying) {
      console.log('🎵 Starting playback (queue not playing)');
      this.playNext();
    } else {
      console.log('⏸️ Queue already playing, chunk queued');
    }
  }

  /**
   * Play next audio chunk in queue (gapless playback)
   */
  private async playNext(): Promise<void> {
    console.log('▶️ playNext() called');
    console.log('   Queue length:', this.audioQueue.length);
    console.log('   Currently playing:', this.isPlaying);
    
    if (this.audioQueue.length === 0) {
      console.log('⏹️ Queue empty, stopping playback');
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const base64Pcm = this.audioQueue.shift()!;
    console.log('🎵 Playing audio chunk');
    console.log('   PCM data length:', base64Pcm ? String(base64Pcm).length : 0);
    console.log('   Remaining in queue:', this.audioQueue.length);
    
    try {
      console.log('🔄 Converting PCM16 to WAV...');
      const wavData = this.pcm16ToWav(base64Pcm);
      console.log('✅ WAV conversion complete');
      console.log('   WAV data length:', wavData ? String(wavData).length : 0);
      
      console.log('🔊 Creating Audio.Sound...');
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/wav;base64,${wavData}` },
        { shouldPlay: true }
      );
      console.log('✅ Audio.Sound created and playing');

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            console.log('✅ Audio chunk finished playing');
            sound.unloadAsync();
            this.playNext(); // Play next chunk
          } else if (status.isPlaying) {
            console.log('▶️ Audio is playing (position:', status.positionMillis, 'ms)');
          }
        } else {
          console.log('⚠️ Audio status not loaded:', status);
        }
      });
    } catch (error) {
      console.error('❌ Audio playback error:', error);
      console.error('   Error details:', JSON.stringify(error));
      this.isPlaying = false;
    }
  }

  /**
   * Convert PCM16 base64 to WAV format for expo-av
   */
  private pcm16ToWav(base64Pcm: string): string {
    const pcmData = Buffer.from(base64Pcm, 'base64');
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length;
    const fileSize = 36 + dataSize;

    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(fileSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmData]).toString('base64');
  }

  /**
   * Wait for OpenAI connection to be ready
   */
  private async waitForOpenAI(): Promise<void> {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        // Simple check - in production, track connection_status
        if (this.ws?.readyState === WebSocket.OPEN) {
          clearInterval(check);
          setTimeout(resolve, 1000); // Give time for session.created
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        resolve(); // Timeout after 5s
      }, 5000);
    });
  }

  /**
   * Wait for OpenAI session to be created
   */
  private async waitForSession(): Promise<void> {
    if (this.sessionCreated) {
      return; // Already have session
    }

    console.log('⏳ Waiting for session.created...');
    return new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (this.sessionCreated) {
          clearInterval(check);
          console.log('✅ Session ready!');
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(check);
        if (!this.sessionCreated) {
          console.warn('⚠️ Timeout waiting for session.created, proceeding anyway');
          // Proceed anyway - might work
          resolve();
        } else {
          resolve();
        }
      }, 10000); // Wait up to 10 seconds
    });
  }

  /**
   * Wait for app to become active
   */
  private async waitForActive(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          sub.remove();
          resolve();
        }
      });
      setTimeout(() => {
        sub.remove();
        reject(new Error('App did not become active'));
      }, 3000);
    });
  }

  /**
   * Send message to proxy/OpenAI
   */
  private send(obj: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup(): Promise<void> {
    if (this.isRecording) await this.stopRecording();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();

