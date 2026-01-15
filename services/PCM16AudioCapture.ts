import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { PCM16AudioCapture } = NativeModules;

interface PCM16AudioCaptureModule {
  requestPermissions(): Promise<boolean>;
  startRecording(): Promise<boolean>;
  stopRecording(): Promise<boolean>;
}

const PCM16AudioCaptureModule: PCM16AudioCaptureModule = PCM16AudioCapture || {
  requestPermissions: () => Promise.reject(new Error('PCM16AudioCapture not available')),
  startRecording: () => Promise.reject(new Error('PCM16AudioCapture not available')),
  stopRecording: () => Promise.reject(new Error('PCM16AudioCapture not available')),
};

const eventEmitter = new NativeEventEmitter(PCM16AudioCapture || undefined);

export interface AudioChunkEvent {
  audio: string; // Base64 encoded PCM16 data
}

export interface ErrorEvent {
  message: string;
}

export class PCM16AudioCaptureService {
  private audioChunkListener: ((event: AudioChunkEvent) => void) | null = null;
  private errorListener: ((event: ErrorEvent) => void) | null = null;
  private isRecording = false;

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      throw new Error('PCM16AudioCapture is only available on iOS');
    }
    return await PCM16AudioCaptureModule.requestPermissions();
  }

  async startRecording(
    onAudioChunk: (chunk: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    if (Platform.OS !== 'ios') {
      throw new Error('PCM16AudioCapture is only available on iOS');
    }

    // Set up event listeners
    this.audioChunkListener = eventEmitter.addListener(
      'onAudioChunk',
      (event: AudioChunkEvent) => {
        onAudioChunk(event.audio);
      }
    );

    this.errorListener = eventEmitter.addListener(
      'onError',
      (event: ErrorEvent) => {
        onError(event.message);
      }
    );

    // Request permissions and start recording
    await PCM16AudioCaptureModule.requestPermissions();
    await PCM16AudioCaptureModule.startRecording();
    
    this.isRecording = true;
  }

  async stopRecording(): Promise<void> {
    if (!this.isRecording) {
      return;
    }

    await PCM16AudioCaptureModule.stopRecording();
    
    // Remove listeners
    if (this.audioChunkListener) {
      this.audioChunkListener.remove();
      this.audioChunkListener = null;
    }
    
    if (this.errorListener) {
      this.errorListener.remove();
      this.errorListener = null;
    }
    
    this.isRecording = false;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }
}

export const pcm16AudioCapture = new PCM16AudioCaptureService();



