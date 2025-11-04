import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../contexts/AppContext';
import { simpleVoiceService } from '../services/SimpleVoiceService';
import { realtimeVoiceService } from '../services/RealtimeVoiceService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'text' | 'suggestion' | 'tip';
}

interface AlliScreenProps {
  navigation: any;
}

export default function AlliScreen({ navigation }: AlliScreenProps) {
  // Feature flag: enable realtime for testing
  const USE_REALTIME = true;
  const voiceService = USE_REALTIME ? realtimeVoiceService : simpleVoiceService;
  const { state, getTodaysTotals } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showChat, setShowChat] = useState(false); // Chat hidden by default - voice-first UX
  const scrollViewRef = useRef<ScrollView>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const micPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const todaysTotals = getTodaysTotals();
  const goals = state.nutritionGoals;

  useEffect(() => {
    // Don't add welcome message automatically - voice-first experience
    // User will hear Alli speak, they don't need to see a welcome message
    // Message will be added when chat is opened for the first time
  }, []);

  // Setup voice service callbacks - run once on mount
  useEffect(() => {
    // Connect realtime on mount if enabled
    if (USE_REALTIME) {
      // Physical iPhone on same Wi‑Fi
      const wsUrl = 'ws://192.168.4.29:8080/realtime';
      console.log('📱 AlliScreen: Connecting to realtime with URL:', wsUrl);
      realtimeVoiceService.connect({ url: wsUrl }).catch((err) => {
        console.error('❌ AlliScreen: Failed to connect to realtime:', err);
      });
      realtimeVoiceService.setCallbacks({
        onAIResponse: (text: string) => {
          // Always update messages - UI handles visibility
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && !lastMessage.isUser) {
              return prev.map(msg => msg.id === lastMessage.id ? { ...msg, text } : msg);
            } else {
              return [...prev, { id: String(Date.now()+1), text, isUser: false, timestamp: new Date(), type: 'text' }];
            }
          });
        },
        onError: (m: string) => {
          console.log('Realtime error:', m);
        }
      });
    }
    return () => { voiceService.cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, currentTranscript]);

  // Animation for microphone button when listening
  useEffect(() => {
    if (isListening) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(micPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      micPulse.setValue(1);
    }
  }, [isListening, micPulse]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    const question = inputText.trim();
    setInputText('');
    setIsProcessing(true);

    try {
      // Process the text message through voice service (will get AI response and speak it)
      if (USE_REALTIME) {
        await realtimeVoiceService.sendText(question);
      } else {
        await simpleVoiceService.processTranscript(question);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to get response. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMicPress = async () => {
    if (isListening) {
      // Stop listening
      await voiceService.stopListening();
      setIsListening(false);
      setCurrentTranscript('');
    } else if (isSpeaking) {
      // Stop speaking if currently speaking
      await voiceService.stopSpeaking();
    } else {
      // Start listening
      setIsProcessing(true);
      setCurrentTranscript('');
      
      await voiceService.startListening({
        onTranscriptStart: () => {
          setIsListening(true);
          setIsProcessing(false);
        },
        onTranscriptUpdate: (text: string) => {
          setCurrentTranscript(text);
        },
        onTranscriptComplete: async (text: string) => {
          setIsListening(false);
          setCurrentTranscript('');
          
          if (!text.trim()) {
            setIsProcessing(false);
            return;
          }

          // Add user message (always add, even if chat is hidden - will show when opened)
          const userMessage: Message = {
            id: Date.now().toString(),
            text: text,
            isUser: true,
            timestamp: new Date(),
            type: 'text',
          };
          setMessages(prev => [...prev, userMessage]);
          
          setIsProcessing(true);
          // Process transcript and get AI response
          if (USE_REALTIME) { await realtimeVoiceService.sendText(text); } else { await simpleVoiceService.processTranscript(text); }
          setIsProcessing(false);
        },
        onAIResponse: (text: string) => {
          // Only update messages if chat is visible
          // When hidden, we're voice-only - just speak, don't show text
          if (showChat) {
            setMessages(prev => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && !lastMessage.isUser) {
                // Update existing AI message
                return prev.map(msg => 
                  msg.id === lastMessage.id 
                    ? { ...msg, text: text }
                    : msg
                );
              } else {
                // Create new AI message
                return [...prev, {
                  id: (Date.now() + 1).toString(),
                  text: text,
                  isUser: false,
                  timestamp: new Date(),
                  type: 'text',
                }];
              }
            });
          } else {
            // Chat hidden - still store messages for when user opens chat
            // But don't update state to avoid re-renders
            setMessages(prev => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && !lastMessage.isUser) {
                // Update existing message silently (for when chat opens)
                return prev.map(msg => 
                  msg.id === lastMessage.id 
                    ? { ...msg, text: text }
                    : msg
                );
              } else {
                // Create new message silently
                return [...prev, {
                  id: (Date.now() + 1).toString(),
                  text: text,
                  isUser: false,
                  timestamp: new Date(),
                  type: 'text',
                }];
              }
            });
          }
          // Note: TTS happens in SimpleVoiceService, so speaking happens regardless
        },
        onSpeakingStart: () => {
          setIsSpeaking(true);
        },
        onSpeakingComplete: () => {
          setIsSpeaking(false);
        },
        onError: (error: string) => {
          console.error('Voice error:', error);
          Alert.alert('Voice Error', error);
          setIsListening(false);
          setIsProcessing(false);
          setIsSpeaking(false);
          setCurrentTranscript('');
        },
      });
    }
  };

  const handleEndPress = async () => {
    if (isListening) {
      await voiceService.stopListening();
      setIsListening(false);
      setCurrentTranscript('');
    }
    if (isSpeaking) {
      await voiceService.stopSpeaking();
      setIsSpeaking(false);
    }
    setIsProcessing(false);
  };


  const sendQuickMessage = (message: string) => {
    setInputText(message);
    sendMessage();
  };

  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.isUser ? styles.userMessage : styles.aiMessage,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          message.isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            message.isUser ? styles.userMessageText : styles.aiMessageText,
          ]}
        >
          {message.text}
        </Text>
        <Text
          style={[
            styles.timestamp,
            message.isUser ? styles.userTimestamp : styles.aiTimestamp,
          ]}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  const renderQuickSuggestions = () => {
    const suggestions = [
      "What should my meal plan be?",
      "How do I lose weight?",
      "Give me meal ideas",
      "What else can you do for me?",
      "How smart are you?",
    ];

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Quick Questions:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsScrollContent}
        >
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionButton}
              onPress={() => sendQuickMessage(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Centered pulsating Alli avatar */}
        <View style={styles.centerHeroContainer}>
          <Animated.View
            style={{
              transform: [
                {
                  scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
                },
              ],
            }}
          >
            <LinearGradient
              colors={['#0090A3', '#6E006A', '#4F0232']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pulseRing}
            >
              <View style={styles.pulseInner}>
                <Image source={require('../assets/Chick2.png')} style={styles.heroImage} />
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Voice control buttons */}
          <View style={styles.voiceButtonsContainer}>
            {/* Chat Toggle Button - Left side of microphone */}
            <TouchableOpacity
              style={[
                styles.voiceButton,
                styles.chatToggleButtonInline,
                showChat && styles.chatToggleButtonActive,
              ]}
              onPress={() => setShowChat(!showChat)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={showChat ? "chatbubbles" : "chatbubble-outline"}
                size={28}
                color={showChat ? "white" : "#0090A3"}
              />
              {!showChat && messages.length > 0 && (
                <View style={styles.chatBadgeInline}>
                  <Text style={styles.chatBadgeText}>{messages.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Microphone Button */}
            <TouchableOpacity
              onPress={handleMicPress}
              activeOpacity={0.8}
              style={[
                styles.voiceButton,
                styles.micButton,
                isListening && styles.micButtonActive,
                (isSpeaking || isProcessing) && styles.micButtonDisabled,
              ]}
              disabled={isSpeaking || isProcessing}
              onPressIn={(e) => {
                // Prevent default behavior that might trigger system dialogs incorrectly
                e?.preventDefault?.();
              }}
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      scale: isListening
                        ? micPulse.interpolate({ inputRange: [1, 1.2], outputRange: [1, 1.15] })
                        : 1,
                    },
                  ],
                }}
              >
                <Ionicons
                  name={isListening ? "mic" : "mic-outline"}
                  size={32}
                  color={isListening ? "white" : "#0090A3"}
                />
              </Animated.View>
            </TouchableOpacity>

            {/* End/Stop Button - Only show when listening or speaking */}
            {(isListening || isSpeaking) && (
              <TouchableOpacity
                onPress={handleEndPress}
                activeOpacity={0.8}
                style={[styles.voiceButton, styles.endButton]}
              >
                <Ionicons name="close" size={32} color="white" />
              </TouchableOpacity>
            )}
          </View>

          {/* Status text */}
          {isListening && (
            <Text style={styles.statusText}>
              {currentTranscript || "Listening..."}
            </Text>
          )}
          {isProcessing && !isListening && (
            <Text style={styles.statusText}>Processing...</Text>
          )}
          {isSpeaking && (
            <Text style={styles.statusText}>Alli is speaking...</Text>
          )}
        </View>

        {/* Chat Interface - Only visible when showChat is true */}
        {showChat && (
          <>
            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map(renderMessage)}
            </ScrollView>

            {/* Quick Suggestions */}
            {messages.length <= 1 && renderQuickSuggestions()}

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask Alli anything about nutrition..."
                placeholderTextColor="#999"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !inputText.trim() && styles.sendButtonDisabled,
                ]}
                onPress={sendMessage}
                disabled={!inputText.trim()}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() ? '#B9A68D' : '#ccc'}
                />
              </TouchableOpacity>
            </View>
          </>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#CDC4B7',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  centerHeroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  voiceButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  chatToggleButtonInline: {
    backgroundColor: '#E6E1D8',
    borderWidth: 2,
    borderColor: '#0090A3',
  },
  chatToggleButtonActive: {
    backgroundColor: '#6E006A',
    borderColor: '#6E006A',
  },
  chatBadgeInline: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  voiceButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  micButton: {
    backgroundColor: '#E6E1D8',
    borderWidth: 2,
    borderColor: '#0090A3',
  },
  micButtonActive: {
    backgroundColor: '#0090A3',
    borderColor: '#0090A3',
  },
  micButtonDisabled: {
    opacity: 0.5,
  },
  endButton: {
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  statusText: {
    marginTop: 12,
    fontSize: 16,
    color: '#0090A3',
    fontWeight: '600',
    textAlign: 'center',
    minHeight: 24,
  },
  pulseRing: {
    width: Dimensions.get('window').width * 0.6,
    height: Dimensions.get('window').width * 0.6,
    borderRadius: Dimensions.get('window').width * 0.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseInner: {
    width: '94%',
    height: '94%',
    borderRadius: Dimensions.get('window').width * 0.28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: Dimensions.get('window').width * 0.28,
    resizeMode: 'cover',
  },
  recordingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 107, 107, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Dimensions.get('window').width * 0.28,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 120, // Add extra padding to account for input and navigation bar
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#0090A3',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#E6E1D8',
    borderBottomLeftRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: '#2A2A2A',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  aiTimestamp: {
    color: '#999',
  },
  suggestionsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0090A3',
    marginBottom: 12,
  },
  suggestionsScrollContent: {
    paddingRight: 20,
  },
  suggestionButton: {
    backgroundColor: '#E6E1D8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#0090A3',
    fontWeight: '500',
  },
  chatBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#E6E1D8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 100, // Add extra padding to account for navigation bar
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },
});