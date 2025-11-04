import { Platform, AppState } from 'react-native';
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
  private savedUrl: string = 'ws://localhost:8080/realtime'; // Store the URL for reconnect
  
  // Audio capture for realtime streaming
  private recording: Audio.Recording | null = null;
  private isOpenAIConnected: boolean = false;
  private sessionConfigured: boolean = false;

  // Connect to local proxy that bridges to OpenAI Realtime API
  async connect(options?: { url?: string }): Promise<void> {
    // Disconnect existing connection if any
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
    const url = options?.url || this.savedUrl || 'ws://localhost:8080/realtime';
    this.savedUrl = url; // Save for future reconnects
    console.log('🔌 Connecting to realtime proxy:', url);
    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected to proxy');
        this.isConnected = true;
        // Ask proxy to connect to OpenAI Realtime
        this.send({ type: 'connect' });
        this.isOpenAIConnected = false; // Reset until we get connection_status
      };
      this.ws.onclose = () => {
        this.isConnected = false;
        this.ws = null;
      };
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
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

  // Start mic capture and stream to OpenAI Realtime
  async startListening(): Promise<void> {
    if (this.isListening) return;
    
    if (!this.isConnected) {
      await this.connect();
    }
    
    // Wait for connection and OpenAI handshake (including session.created)
    if (!this.isOpenAIConnected || !this.sessionConfigured) {
      console.log('⏳ Waiting for OpenAI connection and session...');
      console.log('   Current state: isOpenAIConnected=', this.isOpenAIConnected, 'sessionConfigured=', this.sessionConfigured);
      await new Promise<void>((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.isOpenAIConnected && this.sessionConfigured) {
            clearInterval(checkInterval);
            console.log('✅ OpenAI ready - connection and session configured');
            resolve();
          }
        }, 100);
        // Timeout after 5 seconds - if connected but no session.created, proceed anyway
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!this.isOpenAIConnected) {
            reject(new Error('OpenAI connection timeout'));
          } else if (!this.sessionConfigured) {
            console.warn('⚠️ session.created not received, but proceeding anyway (may work with defaults)');
            this.sessionConfigured = true; // Proceed anyway - might work
            resolve();
          } else {
            resolve();
          }
        }, 5000);
      });
    }

    try {
      // Ensure app is in foreground before starting recording
      if (AppState.currentState !== 'active') {
        console.log('⏳ App not active, waiting for foreground...');
        // Wait for app to become active (with timeout)
        await new Promise<void>((resolve, reject) => {
          const subscription = AppState.addEventListener('change', (nextAppState: string) => {
            if (nextAppState === 'active') {
              clearTimeout(timeout);
              subscription.remove();
              resolve();
            }
          });
          
          const timeout = setTimeout(() => {
            subscription.remove();
            reject(new Error('App did not become active in time'));
          }, 3000);
          
          // If already active, resolve immediately
          if (AppState.currentState === 'active') {
            clearTimeout(timeout);
            subscription.remove();
            resolve();
          }
        });
      }

      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Microphone permission denied');
      }

      // Configure audio session for recording + playback (duplex)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Small delay to ensure audio session is fully activated
      await new Promise(resolve => setTimeout(resolve, 200));

      // Start recording with optimized settings for real-time streaming
      // Note: expo-av doesn't directly support PCM16 at 16kHz in real-time
      // For now, we'll use a workaround: record short chunks and process them
      console.log('🎤 Starting microphone recording...');
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          // Status updates happen frequently - we can use this to simulate streaming
          if (status.isRecording && status.metering !== undefined) {
            // metering indicates audio activity, but we can't extract PCM from this
            // This is a limitation - we'll need native module for true real-time PCM
          }
        },
        100 // Update every 100ms
      );

      this.recording = recording;
      this.isListening = true;
      this.callbacks.onTranscriptStart?.();
      
      // Start the audio streaming process
      this.startAudioStreaming();

      // Don't send response.create yet - we need to send audio input first
      // response.create will be sent when we have audio data or when user stops speaking
      console.log('✅ Ready to send audio - waiting for audio input before requesting response');
      
      console.log('✅ Microphone recording started');
    } catch (error: any) {
      console.error('❌ Error starting mic capture:', error);
      this.isListening = false;
      throw new Error(error?.message || 'Failed to start microphone');
    }
  }

  private audioStreamingInterval: NodeJS.Timeout | null = null;
  private audioChunkBuffer: string = ''; // Accumulate base64 PCM chunks

  private startAudioStreaming(): void {
    // IMPORTANT: This is a workaround implementation.
    // expo-av Recording doesn't expose raw PCM16 chunks in real-time.
    // For true real-time PCM streaming, we'd need a native module.
    
    // NOTE: We cannot send empty commits - OpenAI rejects them with server errors.
    // We need actual audio data before committing. Since we can't extract PCM from
    // expo-av in real-time, we'll need to wait until we have a native solution.
    
    // For now:
    // 1. Record audio using expo-av
    // 2. When recording stops, extract audio and send it
    // 3. Don't send commits until we have actual audio data
    
    console.log('🎙️ Audio streaming active (recording started)');
    console.log('⚠️ Note: Cannot send real-time audio chunks yet - need native PCM extraction');
    console.log('⚠️ Will send audio when recording stops');
    
    // Don't send periodic commits - they cause errors without audio data
    // We'll send audio + commit when recording stops
  }

  private stopAudioStreaming(): void {
    if (this.audioStreamingInterval) {
      clearInterval(this.audioStreamingInterval);
      this.audioStreamingInterval = null;
    }
    this.audioChunkBuffer = '';
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) return;

    this.isListening = false;
    this.stopAudioStreaming();

    try {
      // Stop recording
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        const uri = this.recording.getURI();
        this.recording = null;
        
        // TODO: Extract PCM16 from recorded audio file at `uri`
        // Convert to base64 and send via input_audio_buffer.append
        // Then send input_audio_buffer.commit
        // Then send response.create to get AI response
        
        console.log('🛑 Stopped mic capture - audio file:', uri);
        console.log('⚠️ TODO: Extract PCM16 and send to OpenAI');
        
        // For now, just send response.create to test if connection works
        // (This will fail without audio, but tests the flow)
        if (this.isOpenAIConnected) {
          this.send({ type: 'response.create' });
          console.log('📤 Sent response.create (will fail without audio data)');
        }
      }
    } catch (error) {
      console.error('Error stopping mic:', error);
    }
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
      const msgType = msg?.type || 'unknown';
      
      // Handle empty/heartbeat messages
      if (msgType === 'unknown' || (typeof msg === 'object' && Object.keys(msg).length === 0)) {
        // OpenAI sends empty {} as heartbeat/ping - ignore silently
        return;
      }
      
      // Also handle messages that are just empty strings or null
      if (!msg || (typeof msg === 'object' && !msg.type && Object.keys(msg).length === 0)) {
        return;
      }
      
      // Log all message types for debugging (limit to first 200 chars to see full structure)
      if (msgType !== 'response.text.delta' && msgType !== 'response.audio.delta') {
        console.log('📥 Received message type:', msgType);
        console.log('   Full message:', JSON.stringify(msg).substring(0, 200));
      }
      
      switch (msgType) {
        case 'connection_status': {
          this.isOpenAIConnected = msg.connected === true;
          console.log('🔗 OpenAI connection status:', this.isOpenAIConnected);
          // Don't configure session here - wait for session.created
          break;
        }
        case 'session.created': {
          const sessionId = msg?.session_id || msg?.id || 'unknown';
          console.log('✅ OpenAI session created - session ID:', sessionId);
          // Try skipping session.update initially - session may have default config that works
          // If we need customization, we can add it later
          this.sessionConfigured = true;
          console.log('✅ Session ready - skipping session.update for now (testing connection stability)');
          break;
        }
        case 'session.updated': {
          console.log('✅ Session updated successfully');
          break;
        }
        case 'response.text.delta': {
          // Streaming text token from transcription or response
          if (typeof msg?.delta === 'string') {
            this.callbacks.onAIResponse?.(msg.delta);
          } else if (typeof msg?.text === 'string') {
            this.callbacks.onAIResponse?.(msg.text);
          }
          break;
        }
        case 'response.delta': {
          // Streaming text token (alternative format)
          if (typeof msg?.text === 'string') {
            this.callbacks.onAIResponse?.(msg.text);
          } else if (typeof msg?.delta === 'string') {
            this.callbacks.onAIResponse?.(msg.delta);
          }
          break;
        }
        case 'input_audio_buffer.speech_started': {
          console.log('🎤 Speech started - user is speaking');
          this.callbacks.onTranscriptStart?.();
          break;
        }
        case 'input_audio_buffer.speech_stopped': {
          console.log('🔇 Speech stopped');
          break;
        }
        case 'input_audio_buffer.committed': {
          console.log('✅ Audio buffer committed');
          break;
        }
        case 'response.audio.delta': {
          // Base64 audio chunk (PCM16)
          const base64 = msg?.audio || msg?.delta;
          if (typeof base64 === 'string' && base64.length > 0) {
            // OpenAI sends PCM16 (16kHz, mono, 16-bit signed)
            // Convert to WAV format for expo-av playback
            this.enqueueAudioChunk(base64);
          }
          break;
        }
        case 'response.completed': {
          // Full text available
          if (typeof msg?.text === 'string') {
            this.callbacks.onAIResponse?.(msg.text);
          }
          this.callbacks.onTranscriptComplete?.('');
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
    this.stopAudioStreaming();
    try { await this.stopListening(); } catch {}
    try { await this.stopSpeaking(); } catch {}
    this.disconnect();
  }

  // ---- Streaming audio playback (gapless) ----
  private enqueueAudioChunk(base64Pcm: string) {
    this.audioQueue.push(base64Pcm);
    if (!this.isPlayingAudio) {
      this.playNextChunk().catch(() => {});
    }
  }

  // Convert PCM16 base64 to WAV format for expo-av playback
  private pcm16ToWav(base64Pcm: string): string {
    // Decode base64 PCM16 data
    const pcmData = Buffer.from(base64Pcm, 'base64');
    const sampleRate = 24000; // OpenAI Realtime uses 24kHz
    const numChannels = 1; // Mono
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length;
    const fileSize = 36 + dataSize;

    // Create WAV header
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(fileSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // fmt chunk size
    header.writeUInt16LE(1, 20); // audio format (PCM)
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    // Combine header + PCM data
    const wavBuffer = Buffer.concat([header, pcmData]);
    const wavBase64 = wavBuffer.toString('base64');
    return `data:audio/wav;base64,${wavBase64}`;
  }

  private async playNextChunk(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlayingAudio = false;
      if (this.isSpeaking) {
        this.isSpeaking = false;
        this.callbacks.onSpeakingComplete?.();
      }
      return;
    }
    this.isPlayingAudio = true;
    const base64Pcm = this.audioQueue.shift() as string;
    try {
      // Convert PCM16 to WAV for expo-av
      const wavUri = this.pcm16ToWav(base64Pcm);
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: wavUri },
        { shouldPlay: true, volume: 1.0 }
      );
      
      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.callbacks.onSpeakingStart?.();
      }
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('audio timeout'));
        }, 10000); // Shorter timeout for chunks
        
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status?.isLoaded) {
            if (status.didJustFinish) {
              clearTimeout(timeout);
              resolve();
            } else if (status.error) {
              clearTimeout(timeout);
              reject(new Error(status.error));
            }
          } else if (status?.error) {
            clearTimeout(timeout);
            reject(new Error(status.error));
          }
        });
      });
      
      await sound.unloadAsync();
    } catch (error) {
      console.error('Error playing audio chunk:', error);
      // Continue with next chunk even if one fails
    } finally {
      // Process next chunk immediately for gapless playback
      setImmediate(() => this.playNextChunk());
    }
  }

  // ---- Mic streaming (scaffold) ----
  // For full-duplex, we’ll capture 16k mono PCM and send frames:
  // this.send({ type: 'input_audio_buffer.append', audio: base64Pcm });
  // this.send({ type: 'input_audio_buffer.commit' });
  // this.send({ type: 'response.create' });
}

export const realtimeVoiceService = new RealtimeVoiceService();


