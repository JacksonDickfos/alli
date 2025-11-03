// Simple Voice Service - Native iOS + OpenAI Chat API + OpenAI TTS
// Turn-based conversation (no streaming/WebSocket complexity)

import { Platform } from 'react-native';
import Voice from '@react-native-voice/voice';
import { openAIService } from './OpenAIService';
import { conversationManager } from './ConversationManager';
import { Audio } from 'expo-av';

interface VoiceCallbacks {
  onTranscriptStart?: () => void;
  onTranscriptUpdate?: (text: string) => void;
  onTranscriptComplete?: (text: string) => void;
  onAIResponse?: (text: string) => void;
  onError?: (error: string) => void;
  onSpeakingStart?: () => void;
  onSpeakingComplete?: () => void;
}

export class SimpleVoiceService {
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private isProcessing: boolean = false; // Prevents concurrent transcript processing
  private callbacks: VoiceCallbacks = {};
  private soundObject: Audio.Sound | null = null;
  private voiceVoice: string = 'nova'; // Default to warm, friendly voice
  private lastProcessedTranscript: string = ''; // Prevents duplicate processing
  private processDebounceTimer: NodeJS.Timeout | null = null;
  private ttsQueue: string[] = []; // Queue for chunked TTS
  private isGeneratingSpeech: boolean = false; // Prevents concurrent TTS generation
  private accumulatedTTSBuffer: string = ''; // Accumulates text for TTS
  private speechSilenceTimer: NodeJS.Timeout | null = null; // Waits for user to finish speaking

  constructor() {
    this.setupVoiceListeners();
  }

  setVoice(voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'): void {
    this.voiceVoice = voice;
  }

  private setupVoiceListeners(): void {
    // Remove any existing listeners first to avoid duplicates
    Voice.removeAllListeners();

    Voice.onSpeechStart = () => {
      console.log('🎤 Speech recognition started');
      this.callbacks.onTranscriptStart?.();
    };

    Voice.onSpeechPartialResults = (e) => {
      if (e.value && e.value.length > 0) {
        const transcript = e.value[0];
        console.log('📝 Partial transcript:', transcript);
        this.callbacks.onTranscriptUpdate?.(transcript);
      }
    };

    Voice.onSpeechResults = (e) => {
      if (e.value && e.value.length > 0) {
        const transcript = e.value[0];
        console.log('✅ Final transcript:', transcript);
        
        // Wait for silence before processing - user might still be speaking
        // Clear any existing timer
        if (this.speechSilenceTimer) {
          clearTimeout(this.speechSilenceTimer);
        }
        
        // Wait 1.5 seconds of silence before processing transcript
        // This ensures user has finished speaking
        this.speechSilenceTimer = setTimeout(() => {
          console.log('✅ Processing transcript after silence:', transcript);
          this.callbacks.onTranscriptComplete?.(transcript);
          this.speechSilenceTimer = null;
        }, 1500); // 1.5 seconds of silence = user finished speaking
      }
    };

    Voice.onSpeechError = (e) => {
      console.error('❌ Speech recognition error:', e);
      this.isListening = false;
      
      // Handle specific error types
      let errorMessage = 'Speech recognition failed';
      if (e.error) {
        if (e.error.code === '7') {
          errorMessage = 'Speech recognition is not available. Please use a physical device or check simulator settings.';
        } else if (e.error.code === '9') {
          errorMessage = 'Speech recognition permission denied. Please enable it in Settings.';
        } else {
          errorMessage = e.error.message || `Speech recognition error: ${e.error.code}`;
        }
      }
      
      this.callbacks.onError?.(errorMessage);
    };

    Voice.onSpeechEnd = () => {
      console.log('🔚 Speech recognition ended');
      
      // If we have a silence timer, process the transcript now
      // (user has stopped speaking, speech recognition detected silence)
      if (this.speechSilenceTimer) {
        // Clear the timer and process immediately since speech ended
        clearTimeout(this.speechSilenceTimer);
        this.speechSilenceTimer = null;
        
        // Get the last transcript if available
        // Note: This might be called before onSpeechResults, so we need to handle that
        // We'll rely on onSpeechResults timer for now
      }
      
      this.isListening = false;
    };

    Voice.onSpeechVolumeChanged = (e) => {
      // Optional: Can use this for visual feedback
      // console.log('Volume:', e.value);
    };
  }

  private isSimulator(): boolean {
    // Try to detect iOS Simulator
    // On simulator, we should disable voice to prevent crashes
    if (Platform.OS !== 'ios') {
      return false;
    }
    
    // Check common simulator indicators
    // Note: This is best-effort detection
    try {
      // Simulator typically has limitations
      // We'll be conservative and check device model or use try-catch
      return false; // Let the actual API call determine, but catch errors gracefully
    } catch {
      return true;
    }
  }

  private async checkVoiceAvailability(): Promise<{ available: boolean; isSimulator: boolean; message?: string }> {
    // CRITICAL: Wrap everything in try-catch to prevent app crashes
    // Even checking Voice.isAvailable() can trigger permission checks that crash if Info.plist is wrong
    
    try {
      // First, verify Voice module exists
      if (typeof Voice === 'undefined' || Voice === null) {
        return {
          available: false,
          isSimulator: true,
          message: 'Voice recognition module is not available. Please rebuild the app.'
        };
      }

      // Wrap isAvailable() check in try-catch - this can crash on simulator with missing permissions
      let isAvailable = false;
      try {
        // This call can trigger a system permission check that crashes if Info.plist is wrong
        // So we wrap it carefully with a timeout
        const availabilityPromise = Voice.isAvailable();
        const timeoutPromise = new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Availability check timeout')), 2000)
        );
        
        isAvailable = await Promise.race([
          availabilityPromise,
          timeoutPromise
        ]) as boolean;
      } catch (availabilityError: any) {
        // If this throws, it's likely because:
        // 1. Simulator doesn't support it properly
        // 2. Missing Info.plist entry (but we added it, so need rebuild)
        // 3. Permission was denied at system level
        
        console.warn('Voice.isAvailable() check failed:', availabilityError);
        
        const errorStr = availabilityError?.toString() || '';
        if (errorStr.includes('TCC') || errorStr.includes('usage description')) {
          return {
            available: false,
            isSimulator: true,
            message: 'Voice recognition requires app rebuild. The permissions have been added, but you need to rebuild: cd ios && pod install && cd .. && npm run ios'
          };
        }
        
        return {
          available: false,
          isSimulator: true,
          message: 'Voice recognition is not available on iOS Simulator. Please test on a physical iPhone for voice features.'
        };
      }
      
      if (!isAvailable) {
        return {
          available: false,
          isSimulator: true,
          message: 'Voice recognition is not available. This feature works best on a physical iOS device.'
        };
      }

      return { available: true, isSimulator: false };
    } catch (error: any) {
      // Catch-all for any unexpected errors
      console.warn('Voice availability check failed:', error);
      const errorStr = error?.toString() || '';
      
      if (errorStr.includes('TCC') || errorStr.includes('usage description')) {
        return {
          available: false,
          isSimulator: true,
          message: 'Please rebuild the app: The permissions were added but require a rebuild. Run: cd ios && pod install && cd .. && npm run ios'
        };
      }
      
      return {
        available: false,
        isSimulator: true,
        message: 'Voice recognition may not work on iOS Simulator. Please test on a physical device for the best experience.'
      };
    }
  }

  async startListening(callbacks: VoiceCallbacks): Promise<void> {
    if (this.isListening) {
      console.log('⚠️ Already listening');
      return;
    }

    if (this.isSpeaking) {
      console.log('⚠️ Currently speaking, cannot listen');
      return;
    }

    if (this.isProcessing) {
      console.log('⚠️ Currently processing a transcript, cannot listen');
      return;
    }

    // Reset duplicate detection when starting a new listening session
    this.lastProcessedTranscript = '';
    this.callbacks = callbacks;

    try {
      // Check availability BEFORE attempting to use Voice API
      // This prevents crashes on simulator
      const availability = await this.checkVoiceAvailability();
      
      if (!availability.available) {
        const message = availability.message || 'Voice recognition is not available.';
        console.warn('⚠️', message);
        this.callbacks.onError?.(message);
        return; // Exit early instead of crashing
      }

      // Start listening - this will request permissions if needed
      // Wrap in try-catch to handle any remaining edge cases
      try {
        this.isListening = true;
        await Voice.start('en-US');
        console.log('✅ Started listening');
      } catch (startError: any) {
        this.isListening = false;
        
        // Parse error codes
        const errorCode = startError?.code || startError?.error?.code;
        const errorMessage = startError?.message || startError?.error?.message || '';
        
        // Check for specific error types
        if (errorCode === '9' || errorMessage.includes('permission') || errorMessage.includes('denied')) {
          throw new Error('Microphone or speech recognition permission denied. Please enable access in Settings > Alli > Microphone and Speech Recognition.');
        }
        
        if (errorCode === '7' || errorMessage.includes('not available')) {
          throw new Error('Speech recognition is not available. This feature requires a physical iOS device.');
        }
        
        if (errorMessage.includes('TCC') || errorMessage.includes('usage description')) {
          throw new Error('Voice recognition requires proper permissions. Please rebuild the app after the recent updates.');
        }
        
        // Generic error
        throw new Error(errorMessage || 'Failed to start voice recognition. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error starting voice recognition:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      this.isListening = false;
      
      // Provide user-friendly error message
      const errorMessage = error?.message || 'Failed to start listening. Please check microphone and speech recognition permissions in Settings and try again.';
      this.callbacks.onError?.(errorMessage);
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    // Clear any pending speech silence timer
    if (this.speechSilenceTimer) {
      clearTimeout(this.speechSilenceTimer);
      this.speechSilenceTimer = null;
    }

    try {
      await Voice.stop();
      this.isListening = false;
      console.log('🛑 Stopped listening');
    } catch (error: any) {
      console.error('❌ Error stopping voice recognition:', error);
      this.isListening = false;
    }
  }

  async processTranscript(text: string): Promise<void> {
    // Normalize text for comparison
    const normalizedText = text.trim().toLowerCase();
    
    // Skip if empty, already processing, or duplicate
    if (!normalizedText) {
      console.log('⚠️ Empty transcript, skipping');
      return;
    }

    if (this.isProcessing) {
      console.log('⚠️ Already processing a transcript, skipping:', text.substring(0, 50));
      return;
    }

    // Prevent duplicate processing of the same transcript
    if (this.lastProcessedTranscript === normalizedText) {
      console.log('⚠️ Duplicate transcript detected, skipping:', text.substring(0, 50));
      return;
    }

    // Clear any existing debounce timer
    if (this.processDebounceTimer) {
      clearTimeout(this.processDebounceTimer);
      this.processDebounceTimer = null;
    }

    // CRITICAL: Stop listening BEFORE processing to prevent feedback loop
    if (this.isListening) {
      console.log('🛑 Stopping listening before processing transcript');
      await this.stopListening();
    }

    this.isProcessing = true;
    this.lastProcessedTranscript = normalizedText;

    try {
      console.log('🤖 Sending to OpenAI:', text);

      // Get AI response using streaming for better UX
      let fullResponse = '';
      let ttsStarted = false;
      const TTS_START_THRESHOLD = 50; // Start TTS after 50 characters (good balance - fast but enough for fluent start)
      let accumulatedForTTS = '';
      
      await openAIService.sendMessageStreaming(text, {
        onDelta: (delta: string) => {
          // Update response in real-time as it streams
          fullResponse += delta;
          accumulatedForTTS += delta;
          this.callbacks.onAIResponse?.(fullResponse);
          
          // Start TTS when we have enough text for a fluent start
          // But wait for complete response before speaking to avoid chunking pauses
          if (!ttsStarted && accumulatedForTTS.length >= TTS_START_THRESHOLD) {
            ttsStarted = true;
            console.log('🎙️ Ready to start TTS, waiting for complete response for fluent speech...');
            // Don't start yet - wait for complete response to avoid chunking
          }
        },
        onComplete: async (completeResponse: string) => {
          fullResponse = completeResponse;
          console.log('✅ AI response complete:', fullResponse);
          
          // Always speak the complete response in one go for fluent speech
          // This eliminates pauses from chunking
          await this.speakResponse(fullResponse);
          
          // Clear last processed after successful completion
          this.lastProcessedTranscript = '';
        },
        onError: async (error: string) => {
          console.error('❌ OpenAI error:', error);
          
          // Handle rate limiting specially
          if (error.includes('429') || error.includes('rate limit')) {
            this.callbacks.onError?.('Too many requests. Please wait a moment and try again.');
            // Reset after rate limit error so user can retry
            setTimeout(() => {
              this.lastProcessedTranscript = '';
            }, 5000);
          } else {
            this.callbacks.onError?.(error);
          }
          
          // Reset processing state on error
          this.isProcessing = false;
        },
      });
    } catch (error: any) {
      console.error('❌ Error processing transcript:', error);
      this.isProcessing = false;
      this.lastProcessedTranscript = '';
      
      // Handle rate limiting
      if (error?.response?.status === 429 || error?.message?.includes('429')) {
        this.callbacks.onError?.('Too many requests. Please wait a moment and try again.');
      } else {
        this.callbacks.onError?.(error.message || 'Failed to get AI response');
      }
    }
  }

  private async queueTTSChunk(text: string): Promise<void> {
    if (!text.trim()) return;
    
    // Queue the chunk for TTS
    this.ttsQueue.push(text.trim());
    console.log('📝 Queued TTS chunk:', text.substring(0, 50));
    
    // Start processing queue if not already processing
    if (!this.isGeneratingSpeech) {
      this.processTTSQueue().catch((err: any) => {
        console.error('❌ Error processing TTS queue:', err);
      });
    }
  }

  private async processTTSQueue(): Promise<void> {
    if (this.isGeneratingSpeech || this.ttsQueue.length === 0) {
      return;
    }

    this.isGeneratingSpeech = true;

    try {
      while (this.ttsQueue.length > 0) {
        const chunk = this.ttsQueue.shift();
        if (chunk) {
          const hasMore = this.ttsQueue.length > 0;
          try {
            await this.speakResponseChunked(chunk, hasMore);
          } catch (error) {
            console.error('❌ Error speaking chunk:', error);
            // Continue with next chunk even if one fails
          }
        }
      }
    } finally {
      this.isGeneratingSpeech = false;
    }
  }

  private async speakResponseChunked(text: string, hasMore: boolean): Promise<void> {
    if (!text.trim()) {
      return;
    }

    try {
      // CRITICAL: Ensure we're not listening while speaking (prevent feedback loop)
      if (this.isListening) {
        console.log('🛑 Stopping listening before speaking');
        await this.stopListening();
      }

      // Generate speech using OpenAI TTS
      console.log('🔊 Generating speech chunk:', text.substring(0, 50));
      const audioUrl = await openAIService.generateSpeech(text, this.voiceVoice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer');

      if (!audioUrl) {
        console.error('❌ Failed to generate speech chunk');
        return;
      }

      // Play the audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      // Update speaking state
      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.callbacks.onSpeakingStart?.();
      }

      // Wait for playback to complete
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Playback timeout'));
        }, 30000); // 30 second timeout per chunk

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              clearTimeout(timeout);
              resolve();
            }
          } else {
            clearTimeout(timeout);
            reject(new Error('Playback failed to load'));
          }
        });
      });

      // Cleanup this chunk
      await sound.unloadAsync();
      
      // If this was the last chunk, mark speaking as complete
      if (!hasMore) {
        this.isSpeaking = false;
        this.isProcessing = false;
        this.callbacks.onSpeakingComplete?.();
        console.log('✅ Finished speaking all chunks');
      }
    } catch (error: any) {
      console.error('❌ Error speaking chunk:', error);
      
      // Handle specific error types
      if (error?.response?.status === 429) {
        // Rate limit - wait a bit and continue
        console.log('⏳ Rate limited, waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else if (error?.response?.status === 500) {
        // Server error - skip this chunk
        console.log('⚠️ Server error, skipping chunk');
      }
      
      // If this was the last chunk, still mark as complete
      if (!hasMore) {
        this.isSpeaking = false;
        this.isProcessing = false;
        this.callbacks.onSpeakingComplete?.();
      }
    }
  }

  private async speakResponse(text: string): Promise<void> {
    if (!text.trim()) {
      this.isProcessing = false;
      return;
    }

    try {
      // CRITICAL: Ensure we're not listening while speaking (prevent feedback loop)
      if (this.isListening) {
        console.log('🛑 Stopping listening before speaking');
        await this.stopListening();
      }

      // Stop any current speech
      if (this.soundObject) {
        await this.soundObject.unloadAsync();
        this.soundObject = null;
      }

      // Generate speech using OpenAI TTS
      console.log('🔊 Generating speech with voice:', this.voiceVoice);
      const audioUrl = await openAIService.generateSpeech(text, this.voiceVoice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer');

      if (!audioUrl) {
        console.error('❌ Failed to generate speech');
        this.isProcessing = false;
        this.callbacks.onError?.('Failed to generate speech');
        return;
      }

      // Play the audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      this.soundObject = sound;
      this.isSpeaking = true;
      this.callbacks.onSpeakingStart?.();

      // Wait for playback to complete
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Playback timeout'));
        }, 60000); // 60 second timeout

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              clearTimeout(timeout);
              resolve();
            }
          } else {
            // Status is not loaded, might be error
            clearTimeout(timeout);
            reject(new Error('Playback failed to load'));
          }
        });
      });

      // Cleanup
      await sound.unloadAsync();
      this.soundObject = null;
      this.isSpeaking = false;
      this.isProcessing = false; // Mark processing as complete
      this.callbacks.onSpeakingComplete?.();
      
      console.log('✅ Finished speaking');
    } catch (error: any) {
      console.error('❌ Error speaking:', error);
      this.isSpeaking = false;
      this.isProcessing = false;
      
      if (this.soundObject) {
        try {
          await this.soundObject.unloadAsync();
        } catch (e) {
          // Ignore cleanup errors
        }
        this.soundObject = null;
      }
      
      // Handle specific error types
      let errorMessage = 'Failed to play speech';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment.';
      } else if (error?.response?.status === 500) {
        errorMessage = 'Speech generation temporarily unavailable. Please try again.';
      }
      
      this.callbacks.onError?.(errorMessage);
    }
  }

  async stopSpeaking(): Promise<void> {
    // Stop processing if we're stopping speech
    this.isProcessing = false;
    
    if (this.soundObject) {
      try {
        await this.soundObject.stopAsync();
        await this.soundObject.unloadAsync();
        this.soundObject = null;
        this.isSpeaking = false;
        this.callbacks.onSpeakingComplete?.();
        console.log('🛑 Stopped speaking');
      } catch (error) {
        console.error('❌ Error stopping speech:', error);
      }
    }
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  async cleanup(): Promise<void> {
    await this.stopListening();
    await this.stopSpeaking();
    Voice.destroy().then(Voice.removeAllListeners);
  }
}

export const simpleVoiceService = new SimpleVoiceService();

