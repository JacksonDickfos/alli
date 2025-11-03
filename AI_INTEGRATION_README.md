# AI Voice Integration Setup Guide

## 🎯 Overview
The Alli Nutrition app now includes conversational AI with voice-to-text and text-to-speech capabilities. Users can tap the Alli image to speak questions and receive spoken responses.

## 🛠️ Setup Instructions

### 1. Environment Variables
Create a `.env` file in your project root with:
```
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
```

Get your OpenAI API key from: https://platform.openai.com/api-keys

### 2. Database Setup
Run the SQL schema in `supabase-schema.sql` in your Supabase SQL editor to create the conversations and messages tables.

### 3. Dependencies Installed
- `@react-native-voice/voice` - Voice-to-text functionality
- `react-native-tts` - Text-to-speech functionality  
- `axios` - HTTP requests to OpenAI API

## 🎤 Features Implemented

### Voice Interaction
- **Tap to Talk**: Users tap the Alli image to start voice recording
- **30-second limit**: Maximum recording time with automatic timeout
- **Visual feedback**: Pulsing animation and color changes during recording/speaking
- **Permission handling**: Microphone permissions requested on app startup

### AI Integration
- **OpenAI GPT-4o**: Powered by the latest OpenAI model
- **Conversation context**: Maintains last 15 messages for context
- **Persistent storage**: Conversations saved to Supabase database
- **Error handling**: Graceful fallbacks for network/API issues

### User Experience
- **Dual response**: Both text display and spoken audio
- **State indicators**: Clear visual feedback for recording/speaking states
- **Error recovery**: User-friendly error messages and retry options

## 🔧 Technical Architecture

### Services
- `ConversationManager.ts` - Handles conversation persistence and context
- `OpenAIService.ts` - Manages OpenAI API calls with retry logic
- `VoiceService.ts` - Voice-to-text and text-to-speech functionality

### Database Schema
- `conversations` table - Stores conversation metadata
- `messages` table - Stores individual messages with role (user/assistant)
- Row-level security policies for user data isolation

### Error Handling
- **Network issues**: Exponential backoff retry with user-friendly messages
- **API rate limits**: Queue management and wait notifications
- **Voice failures**: Fallback to text input with clear error messages
- **Permission denied**: Graceful handling with permission request flow

## 🚀 Usage Flow

1. **User taps Alli image** → Voice recording starts with visual feedback
2. **User speaks question** → Voice-to-text converts speech to text
3. **Text sent to OpenAI** → GPT-4o generates contextual response
4. **Response displayed** → Text shown in chat + spoken via TTS
5. **Conversation saved** → Messages stored in Supabase for future context

## 🔒 Security & Privacy

- **User isolation**: Row-level security ensures users only see their conversations
- **API key protection**: Environment variables keep OpenAI key secure
- **Data persistence**: Conversations stored securely in Supabase
- **Permission handling**: Microphone access only when needed

## 📱 Platform Support

- **iOS**: Full voice recognition and TTS support
- **Android**: Full voice recognition and TTS support
- **Permissions**: Automatic microphone permission requests
- **Fallbacks**: Text input always available as backup

The AI voice integration is now fully functional and ready for use! 🎉
