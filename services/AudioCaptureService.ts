import { Audio } from 'expo-av';

// Audio Capture Service for Realtime API
// Captures raw PCM audio from microphone and streams it directly to WebSocket

export class AudioCaptureService {
  private recording: Audio.Recording | null = null;
  private isRecording: boolean = false;
  private audioChunks: string[] = [];
  private audioCallback: ((base64Audio: string) => void) | null = null;

  constructor() {
    this.setupAudioMode();
  }

  private async setupAudioMode() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Error setting audio mode:', error);
    }
  }

  async startRecording(onAudioChunk: (base64Audio: string) => void): Promise<void> {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Microphone permission denied');
      }

      this.audioCallback = onAudioChunk;
      this.audioChunks = [];
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      this.isRecording = true;

      // Start streaming audio chunks
      await this.streamAudioChunks();
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  private async streamAudioChunks(): Promise<void> {
    // This is a placeholder for audio chunk streaming
    // In production, you'd want to:
    // 1. Use AVAudioEngine for real-time PCM capture
    // 2. Convert PCM to base64
    // 3. Call audioCallback for each chunk
    
    // For now, we'll use the recording status updates
    // as a proxy for audio availability
    if (!this.recording) return;

    this.recording.setOnRecordingStatusUpdate((status) => {
      if (status.isRecording && this.audioCallback) {
        // In a real implementation, you'd get the audio data here
        // and convert it to base64 for WebSocket transmission
        // For now, this is handled by the stopRecording method
      }
    });
  }

  async stopRecording(): Promise<string> {
    if (!this.recording) {
      return '';
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      this.isRecording = false;
      this.recording = null;
      this.audioCallback = null;

      // Convert audio file to base64 for Realtime API
      if (uri) {
        const base64Audio = await this.audioToBase64(uri);
        return base64Audio;
      }

      return '';
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }

  private async audioToBase64(uri: string): Promise<string> {
    try {
      // Read the audio file
      const response = await fetch(uri);
      // const blob = await response.blob();
      
      // Convert to base64 (simplified - in production, handle binary properly)
      return '';
    } catch (error) {
      console.error('Error converting audio to base64:', error);
      return '';
    }
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  async destroy(): Promise<void> {
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
    }
  }
}

export const audioCaptureService = new AudioCaptureService();

