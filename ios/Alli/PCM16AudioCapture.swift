import Foundation
import AVFoundation
import React

@objc(PCM16AudioCapture)
class PCM16AudioCapture: RCTEventEmitter {
  private var audioEngine: AVAudioEngine?
  private var inputNode: AVAudioInputNode?
  private var isRecording = false
  private let sampleRate: Double = 16000 // Dialogflow CX uses 16kHz
  private let channels: UInt32 = 1 // Mono
  
  override func supportedEvents() -> [String]! {
    return ["onAudioChunk", "onError"]
  }
  
  @objc
  func requestPermissions(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    AVAudioSession.sharedInstance().requestRecordPermission { granted in
      DispatchQueue.main.async {
        if granted {
          resolve(true)
        } else {
          reject("PERMISSION_DENIED", "Microphone permission denied", nil)
        }
      }
    }
  }
  
  @objc
  func startRecording(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if isRecording {
      reject("ALREADY_RECORDING", "Already recording", nil)
      return
    }
    
    // Request permissions if needed
    AVAudioSession.sharedInstance().requestRecordPermission { [weak self] granted in
      guard let self = self else { return }
      
      guard granted else {
        reject("PERMISSION_DENIED", "Microphone permission denied", nil)
        return
      }
      
      do {
        // Configure audio session for recording + playback (duplex)
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
        try audioSession.setActive(true)
        
        // Create audio engine
        self.audioEngine = AVAudioEngine()
        guard let engine = self.audioEngine else {
          reject("INIT_FAILED", "Failed to create audio engine", nil)
          return
        }
        
        // Get input node
        self.inputNode = engine.inputNode
        guard let inputNode = self.inputNode else {
          reject("NO_INPUT", "No audio input available", nil)
          return
        }
        
        // Configure input format: 16kHz, mono, 16-bit PCM
        let inputFormat = inputNode.inputFormat(forBus: 0)
        let targetFormat = AVAudioFormat(
          commonFormat: .pcmFormatInt16,
          sampleRate: self.sampleRate,
          channels: self.channels,
          interleaved: false
        )
        
        guard let format = targetFormat else {
          reject("FORMAT_ERROR", "Failed to create target audio format", nil)
          return
        }
        
        // Install tap to capture audio buffers
        let bufferSize: AVAudioFrameCount = 4096 // ~256ms at 16kHz
        
        inputNode.installTap(onBus: 0, bufferSize: bufferSize, format: inputFormat) { [weak self] (buffer, time) in
          guard let self = self, self.isRecording else { return }
          
          // Convert buffer to target format (16kHz, mono, PCM16)
          guard let converter = AVAudioConverter(from: inputFormat, to: format) else {
            return
          }
          
          // Calculate output frame capacity
          let ratio = self.sampleRate / inputFormat.sampleRate
          let outputFrameCapacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio)
          
          guard let outputBuffer = AVAudioPCMBuffer(
            pcmFormat: format,
            frameCapacity: max(outputFrameCapacity, 1024)
          ) else {
            return
          }
          
          // Convert
          var error: NSError?
          var inputProvided = false
          
          let inputBlock: AVAudioConverterInputBlock = { _, outStatus in
            if !inputProvided {
              inputProvided = true
              outStatus.pointee = .haveData
              return buffer
            } else {
              outStatus.pointee = .noDataNow
              return nil
            }
          }
          
          let status = converter.convert(to: outputBuffer, error: &error, withInputFrom: inputBlock)
          
          if status == .error {
            if let error = error {
              self.sendEvent(withName: "onError", body: ["message": error.localizedDescription])
            }
            return
          }
          
          // Extract PCM16 data
          guard let channelData = outputBuffer.int16ChannelData else { return }
          let channelDataValue = channelData.pointee
          let frameLength = Int(outputBuffer.frameLength)
          
          if frameLength == 0 {
            return
          }
          
          // DIAGNOSTIC: Check if audio is real (not silence)
          var maxAmplitude: Int16 = 0
          var minAmplitude: Int16 = 0
          var sumSquares: Int64 = 0
          for i in 0..<frameLength {
            let sample = channelDataValue[i]
            if sample > maxAmplitude { maxAmplitude = sample }
            if sample < minAmplitude { minAmplitude = sample }
            sumSquares += Int64(sample) * Int64(sample)
          }
          let rms = sqrt(Double(sumSquares) / Double(frameLength)) // Root Mean Square (audio energy)
          let peakToPeak = Int(maxAmplitude) - Int(minAmplitude)
          
          // Log first chunk and periodically to verify audio is real
          if self.isRecording {
            print("🎤 Audio chunk: \(frameLength) frames, RMS: \(Int(rms)), Peak-to-peak: \(peakToPeak), Max: \(maxAmplitude), Min: \(minAmplitude)")
            
            // Warn if audio appears to be silence
            if rms < 100 && peakToPeak < 200 {
              print("⚠️ WARNING: Audio appears to be silence (RMS: \(Int(rms)), Peak-to-peak: \(peakToPeak))")
            }
          }
          
          // Convert to base64
          let data = Data(bytes: channelDataValue, count: frameLength * MemoryLayout<Int16>.size)
          let base64 = data.base64EncodedString()
          
          // Send to JavaScript
          self.sendEvent(withName: "onAudioChunk", body: ["audio": base64])
        }
        
        // Start engine
        try engine.start()
        self.isRecording = true
        
        resolve(true)
        
      } catch {
        self.cleanup()
        reject("START_FAILED", "Failed to start recording: \(error.localizedDescription)", error)
      }
    }
  }
  
  @objc
  func stopRecording(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard isRecording else {
      resolve(false)
      return
    }
    
    cleanup()
    resolve(true)
  }
  
  private func cleanup() {
    isRecording = false
    
    inputNode?.removeTap(onBus: 0)
    inputNode = nil
    
    audioEngine?.stop()
    audioEngine = nil
    
    // Reset audio session
    try? AVAudioSession.sharedInstance().setActive(false)
  }
  
  override class func requiresMainQueueSetup() -> Bool {
    return false
  }
}

