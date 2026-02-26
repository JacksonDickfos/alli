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
  Easing,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { parseMealPlanFromMessage, MEAL_PLAN_SYSTEM_PROMPT } from '../lib/mealPlanUtils';
import { ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Room,
  RoomEvent,
  LocalAudioTrack,
  RemoteAudioTrack,
  createLocalAudioTrack,
} from 'livekit-client';
import {
  AudioSession,
  registerGlobals,
  AndroidAudioTypePresets,
} from '@livekit/react-native';

registerGlobals();

const LIVEKIT_URL = process.env.EXPO_PUBLIC_LIVEKIT_URL || 'wss://alli-h8mq663x.livekit.cloud';
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://165.227.28.126:8005/start_call2';
const NOVITA_API_URL = process.env.EXPO_PUBLIC_NOVITA_API_URL;
const NOVITA_API_KEY = process.env.EXPO_PUBLIC_NOVITA_API_KEY;
const NOVITA_MODEL = process.env.EXPO_PUBLIC_NOVITA_MODEL;
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const RAG_FALLBACK_URL = process.env.EXPO_PUBLIC_RAG_FALLBACK_URL;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type: 'text';
  pending?: boolean;
}

// ─── Typing Indicator ────────────────────────────────────────────────────────
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
  });

  return (
    <View style={styles.typingBubble}>
      <Animated.View style={[styles.typingDot, dotStyle(dot1)]} />
      <Animated.View style={[styles.typingDot, dotStyle(dot2)]} />
      <Animated.View style={[styles.typingDot, dotStyle(dot3)]} />
    </View>
  );
}

// ─── Typewriter ──────────────────────────────────────────────────────────────
function Typewriter({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) { setDisplayed(prev => prev + text.charAt(i)); i++; }
      else clearInterval(timer);
    }, 15);
    return () => clearInterval(timer);
  }, [text]);
  return <Text style={[styles.messageText, styles.aiMessageText]}>{displayed}</Text>;
}

// ─── Add to Meal Plan Button ─────────────────────────────────────────────────
function AddToMealPlanButton({ content }: { content: string }) {
  const { createMealPlanFromChat } = useApp();
  const navigation = useNavigation<any>();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const mealPlan = React.useMemo(() => parseMealPlanFromMessage(content), [content]);
  if (!mealPlan || mealPlan.length === 0) return null;

  const handlePress = async () => {
    if (added || adding) return;
    setAdding(true);
    try {
      const result = await createMealPlanFromChat(mealPlan);
      if (result.success) {
        setAdded(true);
        Alert.alert(
          '✅ Meal Plan Added!',
          `${mealPlan.length} day${mealPlan.length > 1 ? 's' : ''} added to your Meal Plan.`,
          [
            { text: 'OK', style: 'cancel' },
            { text: 'View Plan', onPress: () => navigation.navigate('Plan') },
          ]
        );
      } else {
        Alert.alert('Error', (result as any).error?.message || 'Failed to add meal plan.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.addPlanBtn, added && styles.addPlanBtnAdded]}
      onPress={handlePress}
      disabled={adding || added}
      activeOpacity={0.85}
    >
      {adding ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Ionicons
            name={added ? 'checkmark-circle' : 'calendar-outline'}
            size={18}
            color="#fff"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.addPlanBtnText}>
            {added ? 'Added to Meal Plan ✓' : 'Add to Your Meal Plan'}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── RAG response extractor ───────────────────────────────────────────────────
// THE FIX: reads body as raw text first (never silently fails like .json() does),
// then intelligently parses JSON and checks every known field name.
async function extractRagResponse(ragRes: Response): Promise<string> {
  // Step 1 — always read as text. This never throws unlike .json()
  const rawText = await ragRes.text();
  console.log('🔍 RAG raw body (first 400):', rawText.slice(0, 400));

  const trimmed = rawText.trim();
  if (!trimmed) return '';

  // Step 2 — if not JSON-shaped, return as plain text directly
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    console.log('✅ RAG plain text response');
    return trimmed;
  }

  // Step 3 — parse JSON
  let j: any;
  try {
    j = JSON.parse(trimmed);
  } catch {
    console.warn('⚠️ RAG looked like JSON but failed to parse — returning raw');
    return trimmed;
  }

  // Step 4 — unwrap array e.g. [{ ... }]
  if (Array.isArray(j) && j.length > 0) j = j[0];

  console.log('🔍 RAG parsed keys:', Object.keys(j ?? {}));

  // Step 5 — already a bare string
  if (typeof j === 'string') return j.trim();

  // Step 6 — check every field name across all known RAG/LLM API shapes
  const candidates: Array<string | undefined> = [
    j?.output,
    j?.response,
    j?.text,
    j?.message,
    j?.answer,
    j?.result,
    j?.content,
    j?.reply,
    j?.generated_text,
    j?.completion,
    j?.bot,
    j?.assistant,
    // OpenAI-compatible
    j?.choices?.[0]?.message?.content,
    j?.choices?.[0]?.text,
    // nested under data
    j?.data?.output,
    j?.data?.response,
    j?.data?.text,
    j?.data?.message,
    j?.data?.answer,
    j?.data?.result,
    j?.data?.content,
    j?.data?.reply,
  ];

  for (const c of candidates) {
    if (c && typeof c === 'string' && c.trim().length > 0) {
      return c.trim();
    }
  }

  // Step 7 — nothing matched; log the full object so the correct key is visible
  console.warn('⚠️ RAG: no known field matched. Full object:', JSON.stringify(j));
  return '';
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
interface AlliScreenProps { navigation: any; }
type AgentState = 'connecting' | 'initializing' | 'listening' | 'speaking' | 'thinking';

export default function AlliScreen({ navigation }: AlliScreenProps) {
  const { state, getTodaysTotals } = useApp();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [localTrack, setLocalTrack] = useState<LocalAudioTrack | null>(null);
  const [agentState, setAgentState] = useState<AgentState>('listening');
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentUserText, setCurrentUserText] = useState('');
  const [currentAgentText, setCurrentAgentText] = useState('');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const audioLevelSmoothRef = useRef(0);
  const lastSpeakingTime = useRef(Date.now());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, currentUserText, currentAgentText]);

  useEffect(() => {
    const interval = setInterval(() => {
      const timeSince = Date.now() - lastSpeakingTime.current;
      if (timeSince > 200 && audioLevelSmoothRef.current > 0.01) {
        audioLevelSmoothRef.current *= 0.85;
        setAudioLevel(audioLevelSmoothRef.current);
        if (audioLevelSmoothRef.current < 0.01) {
          audioLevelSmoothRef.current = 0;
          setAudioLevel(0);
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      if (room) room.disconnect();
    };
  }, [room]);

  // ─── Chat ─────────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const question = inputText.trim();
    setInputText('');
    setIsProcessing(true);

    const optimisticUser: Message = {
      id: `u-${Date.now()}`,
      text: question,
      isUser: true,
      timestamp: new Date(),
      type: 'text',
    };
    const optimisticAI: Message = {
      id: `a-${Date.now() + 1}`,
      text: '...',
      isUser: false,
      timestamp: new Date(),
      type: 'text',
      pending: true,
    };
    setMessages(prev => [...prev, optimisticUser, optimisticAI]);

    try {
      const systemPrompt = `You are Alli, a highly knowledgeable nutrition specialist assistant with extensive expertise in nutritional science research and clinical studies.

Your expertise:
- Nutritional science and evidence-based dietary guidelines
- Macro and micronutrients (vitamins, minerals, proteins, fats, carbohydrates)
- Food composition, nutritional values, and bioavailability
- Clinical nutrition research and scientific literature
- Peer-reviewed journals and research papers in nutrition science
- Current nutritional guidelines from authoritative sources (WHO, USDA, FDA, European Food Safety Authority)
- Dietary recommendations for various health goals and medical conditions
- Nutritional biochemistry and metabolism

Your knowledge base includes:
- Leading nutrition and medical journals (The American Journal of Clinical Nutrition, Journal of Nutrition, The New England Journal of Medicine, JAMA, Clinical Nutrition, European Journal of Clinical Nutrition)
- Food composition databases (USDA FoodData Central, FAO Regional Food Composition Tables)
- Nutrient reference values from multiple countries (US, Canada, Australia, New Zealand, UK, EU)
- Evidence-based nutritional interventions and their outcomes
- Recent research findings and systematic reviews in nutrition

Your personality:
- Professional yet approachable and friendly
- Patient and empathetic
- Clear in explaining complex nutritional and scientific concepts
- Non-judgmental about dietary choices
- Supportive and encouraging
- Committed to evidence-based practice

Guidelines:
- Listen carefully to the user's nutrition-related questions or concerns
- Provide accurate, evidence-based nutritional information backed by scientific research
- Reference scientific studies and research findings when relevant
- Explain nutritional concepts in simple, understandable terms while maintaining scientific accuracy
- Ask clarifying questions about dietary preferences, allergies, health conditions, or specific goals when relevant
- Offer practical, actionable nutrition advice grounded in current research
- Distinguish between well-established scientific consensus and emerging research
- Always remind users that you're providing general nutrition information based on scientific literature, and they should consult healthcare professionals for personalized medical advice
- Be respectful of different dietary preferences and cultural food practices
- Stay current with the latest nutritional research and guidelines

Your goal is to help users make informed decisions about their nutrition and dietary choices through friendly, expert guidance supported by scientific evidence and research.

${MEAL_PLAN_SYSTEM_PROMPT}`;

      const messagesToSend = [
        { role: 'system' as const, content: systemPrompt },
        ...messages
          .filter(m => !m.pending)
          .map(m => ({
            role: m.isUser ? 'user' as const : 'assistant' as const,
            content: m.isUser ? m.text : m.text.replace(/```json[\s\S]*?```/g, '').trim(),
          })),
        { role: 'user' as const, content: question },
      ];

      let assistantText = '';

      // ── 1. Novita ──────────────────────────────────────────────────────────
      try {
        const controller = new AbortController();
        const isMealPlan =
          question.toLowerCase().includes('plan') ||
          question.toLowerCase().includes('diet');
        const tid = setTimeout(() => {
          console.log('⏰ Novita timeout');
          controller.abort();
        }, isMealPlan ? 45_000 : 20_000);

        const res = await fetch(NOVITA_API_URL as string, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${NOVITA_API_KEY?.trim()}`,
          },
          body: JSON.stringify({
            model: NOVITA_MODEL,
            messages: messagesToSend,
            temperature: 0.3,
            max_tokens: 1500,
            reasoning: { enabled: false },
          }),
          signal: controller.signal,
        });
        clearTimeout(tid);

        if (res.ok) {
          const json = await res.json();
          assistantText = String(json?.choices?.[0]?.message?.content || '').trim();
          if (assistantText) console.log('✅ Novita OK. Length:', assistantText.length);
        } else {
          console.log('❌ Novita HTTP error:', res.status);
        }
      } catch (e: any) {
        console.log('❌ Novita failed:', e.message);
      }
      // ── 2. OpenAI Fallback ──────────────────────────────────────────────────
      if (!assistantText && OPENAI_API_KEY) {
        try {
          console.log('🔄 Falling back to OpenAI...');
          const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY.trim()}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: messagesToSend,
              temperature: 0.7,
            }),
          });

          if (openAiRes.ok) {
            const data = await openAiRes.json();
            assistantText = data?.choices?.[0]?.message?.content?.trim() || '';
            console.log('✅ OpenAI responded. Length:', assistantText.length);
          } else {
            console.log('❌ OpenAI HTTP error:', openAiRes.status);
          }
        } catch (e) {
          console.error('❌ OpenAI request failed:', e);
        }
      }

      // ── 3. Commit or error ─────────────────────────────────────────────────
      if (assistantText) {
        setMessages(prev => [
          ...prev.filter(m => m.id !== optimisticAI.id),
          {
            id: String(Date.now() + 1),
            text: assistantText,
            isUser: false,
            timestamp: new Date(),
            type: 'text',
          },
        ]);
      } else {
        throw new Error('No response received. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setMessages(prev => prev.filter(m => m.id !== optimisticAI.id));
    } finally {
      setIsProcessing(false);
    }
  };

  const sendQuickMessage = (msg: string) => {
    setInputText(msg);
    setTimeout(() => sendMessage(), 100);
  };

  // ─── Voice ────────────────────────────────────────────────────────────────
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const setupAudioSession = async () => {
    try {
      await AudioSession.configureAudio({
        android: { preferredOutputList: ['speaker'], audioTypeOptions: AndroidAudioTypePresets.communication },
        ios: { defaultOutput: 'speaker' },
      });
      await AudioSession.startAudioSession();
    } catch (e) { console.error('AudioSession error:', e); }
  };

  const stopAudioSession = async () => {
    try { await AudioSession.stopAudioSession(); } catch { }
  };

  const connectToRoom = async (token: string, serverUrl?: string) => {
    try {
      setAgentState('connecting');
      setConnectionError(null);
      await setupAudioSession();

      connectionTimeoutRef.current = setTimeout(() => {
        setConnectionError('Connection timeout');
        setAgentState('listening');
        handleDisconnect();
      }, 15000);

      const r = new Room({ adaptiveStream: true, dynacast: true });

      r.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === 'audio') (track as RemoteAudioTrack).setVolume(1.0);
      });

      r.on(RoomEvent.TranscriptionReceived, (transcriptions, participant) => {
        transcriptions.forEach(t => {
          const isAgent = participant?.identity !== r.localParticipant.identity;
          if (isAgent) {
            setCurrentAgentText(t.text);
            if (t.final) {
              setMessages(prev => [...prev, {
                id: String(Date.now() + 1), text: t.text,
                isUser: false, timestamp: new Date(), type: 'text',
              }]);
              setCurrentAgentText('');
            }
          } else {
            setCurrentUserText(t.text);
            if (t.final) {
              setMessages(prev => [...prev, {
                id: Date.now().toString(), text: t.text,
                isUser: true, timestamp: new Date(), type: 'text',
              }]);
              setCurrentUserText('');
            }
          }
        });
      });

      r.on(RoomEvent.DataReceived, (payload) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          if (data.type === 'meal_plan' || data.days) {
            setMessages(prev => [...prev, {
              id: `data-${Date.now()}`,
              text: `Here is your meal plan!\n\n\`\`\`json\n${JSON.stringify(data)}\n\`\`\``,
              isUser: false, timestamp: new Date(), type: 'text',
            }]);
          }
        } catch { }
      });

      r.on(RoomEvent.Connected, () => {
        if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
        setConnected(true); setAgentState('initializing'); setConnectionError(null);
        setTimeout(() => { setAgentState('listening'); setAudioLevel(0); }, 1000);
      });

      r.on(RoomEvent.Disconnected, (reason) => {
        if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
        setConnected(false); setAgentState('listening');
        setAudioLevel(0); audioLevelSmoothRef.current = 0;
        if (reason) setConnectionError(`Disconnected: ${reason}`);
      });

      r.on(RoomEvent.ConnectionStateChanged, (s) => console.log('🔌 Connection state:', s));

      const track = await createLocalAudioTrack({
        echoCancellation: true, noiseSuppression: true, autoGainControl: true,
      });
      setLocalTrack(track);
      await r.connect(serverUrl || LIVEKIT_URL, token);
      await r.localParticipant.publishTrack(track);
      setRoom(r);
    } catch (err: any) {
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      setConnectionError(err.message);
      Alert.alert('Connection Error', err.message);
      setAgentState('listening'); setAudioLevel(0);
      await stopAudioSession();
    }
  };

  const handleConnect = async () => {
    if (!await requestPermissions()) {
      Alert.alert('Permission Required', 'Microphone permission is required for voice chat');
      return;
    }
    setAgentState('connecting'); setConnectionError(null);
    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: '123', roomName: `room-123-${Date.now()}` }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.data?.token) throw new Error('No token received');
      await connectToRoom(data.data.token, data.data.url);
    } catch (err: any) {
      setConnectionError(err.message);
      Alert.alert('Connection Error', err.message);
      setAgentState('listening'); setAudioLevel(0);
    }
  };

  const handleDisconnect = async () => {
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    if (room) {
      if (localTrack) { localTrack.stop(); setLocalTrack(null); }
      room.disconnect(); setRoom(null);
    }
    setConnected(false); setAgentState('listening');
    setAudioLevel(0); audioLevelSmoothRef.current = 0;
    await stopAudioSession();
  };

  const handleMuteToggle = async () => {
    if (localTrack) {
      muted ? await localTrack.unmute() : await localTrack.mute();
      setMuted(!muted);
    }
  };

  const getStateText = () => {
    switch (agentState) {
      case 'connecting': return 'Connecting...';
      case 'initializing': return 'Initializing...';
      case 'listening': return 'Listening...';
      case 'thinking': return 'Processing...';
      case 'speaking': return 'Alli is speaking...';
      default: return '';
    }
  };

  // ─── Render Message ───────────────────────────────────────────────────────
  const renderMessage = (message: Message, isLast: boolean) => {
    if (message.pending && !message.isUser) {
      return (
        <View key={message.id} style={[styles.messageContainer, styles.aiMessage]}>
          <TypingIndicator />
        </View>
      );
    }

    const displayText = message.text
      .replace(/```json[\s\S]*?```/g, '')
      .trim() || '...';

    const timeStr = message.timestamp instanceof Date
      ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Recently';

    return (
      <View key={message.id} style={[styles.messageContainer, message.isUser ? styles.userMessage : styles.aiMessage]}>
        <View style={[styles.messageBubble, message.isUser ? styles.userBubble : styles.aiBubble]}>
          {isLast && !message.isUser
            ? <Typewriter text={displayText} />
            : <Text style={[styles.messageText, message.isUser ? styles.userMessageText : styles.aiMessageText]}>
              {displayText}
            </Text>
          }
          <Text style={[styles.timestamp, message.isUser ? styles.userTimestamp : styles.aiTimestamp]}>
            {timeStr}
          </Text>
        </View>

        {!message.isUser && (
          <AddToMealPlanButton content={message.text} />
        )}
      </View>
    );
  };

  const renderQuickSuggestions = () => (
    <View style={styles.suggestionsContainer}>
      <Text style={styles.suggestionsTitle}>Quick Questions:</Text>
      <ScrollView horizontal={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScrollContent}>
        {[
          'What should my meal plan be?',
          'How do I lose weight?',
          'Give me meal ideas',
          'What can you help me with?',
        ].map((s, i) => (
          <TouchableOpacity key={i} style={styles.suggestionButton} onPress={() => sendQuickMessage(s)}>
            <Text style={styles.suggestionText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.centerHeroContainer, { opacity: fadeAnim }]}>
          <View style={styles.pulseRing}>
            <View style={styles.pulseInner}>
              <Image
                source={require('../assets/Chick2copy.png')}
                style={styles.heroImage}
              />
            </View>
          </View>
        </Animated.View>

        <View style={styles.voiceButtonsContainer}>
          <TouchableOpacity
            style={[styles.voiceButton, styles.chatToggleButtonInline, showChat && styles.chatToggleButtonActive]}
            onPress={() => setShowChat(!showChat)}
            activeOpacity={0.8}
          >
            {!showChat && messages.length > 0 && (
              <View style={styles.chatBadgeInline}>
                <Text style={styles.chatBadgeText}>{messages.length}</Text>
              </View>
            )}
            <Ionicons
              name={showChat ? 'chatbubbles' : 'chatbubbles-outline'}
              size={26}
              color={showChat ? '#fff' : '#0090A3'}
            />
          </TouchableOpacity>

          {!connected ? (
            <TouchableOpacity style={[styles.voiceButton, styles.micButton]} onPress={handleConnect} activeOpacity={0.8}>
              <Ionicons name="mic-outline" size={28} color="#0090A3" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.voiceButton, styles.endButton]} onPress={handleDisconnect} activeOpacity={0.8}>
              <Ionicons name="stop-circle-outline" size={28} color="#fff" />
            </TouchableOpacity>
          )}

          {connected && (
            <TouchableOpacity
              style={[styles.voiceButton, styles.muteButton, muted && styles.mutedButton]}
              onPress={handleMuteToggle}
              activeOpacity={0.8}
            >
              <Ionicons name={muted ? 'mic-off-outline' : 'mic-outline'} size={22} color={muted ? '#FF6B6B' : '#0090A3'} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.statusText}>
          {currentUserText || currentAgentText || getStateText()}
        </Text>

        {showChat && (
          <>
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.length === 0
                ? <Text style={styles.emptyText}>Ask Alli anything about nutrition!</Text>
                : messages.map((m, i) => renderMessage(m, i === messages.length - 1))
              }
              {messages.length <= 1 && renderQuickSuggestions()}
            </ScrollView>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask Alli anything about nutrition..."
                placeholderTextColor="#999"
                multiline
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!inputText.trim() || isProcessing) && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim() || isProcessing}
              >
                <Ionicons name="send" size={20} color={inputText.trim() && !isProcessing ? '#0090A3' : '#ccc'} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#CDC4B7' },
  keyboardAvoidingView: { flex: 1 },

  centerHeroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 16,
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
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  voiceButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  voiceButton: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5,
  },
  chatToggleButtonInline: { backgroundColor: '#E6E1D8', borderWidth: 2, borderColor: '#0090A3' },
  chatToggleButtonActive: { backgroundColor: '#6E006A', borderColor: '#6E006A' },
  chatBadgeInline: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#FF6B6B', borderRadius: 10,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  chatBadgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  micButton: { backgroundColor: '#E6E1D8', borderWidth: 2, borderColor: '#0090A3' },
  endButton: { backgroundColor: '#FF6B6B', borderWidth: 2, borderColor: '#FF6B6B' },
  muteButton: {
    backgroundColor: '#E6E1D8', borderWidth: 2, borderColor: '#0090A3',
    width: 56, height: 56, borderRadius: 28,
  },
  mutedButton: { backgroundColor: '#FEE2E2', borderColor: '#FF6B6B' },

  statusText: {
    marginTop: 12, fontSize: 16, color: '#0090A3',
    fontWeight: '600', textAlign: 'center', minHeight: 24,
  },

  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 120 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },

  messageContainer: { marginBottom: 16 },
  userMessage: { alignItems: 'flex-end' },
  aiMessage: { alignItems: 'flex-start' },

  messageBubble: { maxWidth: '85%', padding: 12, borderRadius: 16 },
  userBubble: { backgroundColor: '#0090A3', borderBottomRightRadius: 4 },
  aiBubble: {
    backgroundColor: '#E6E1D8',
    borderBottomLeftRadius: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },

  messageText: { fontSize: 15, lineHeight: 22 },
  userMessageText: { color: '#fff' },
  aiMessageText: { color: '#2A2A2A' },
  timestamp: { fontSize: 11, marginTop: 4 },
  userTimestamp: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  aiTimestamp: { color: '#999' },

  addPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0090A3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
    ...Platform.select({
      ios: { shadowColor: '#0090A3', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  addPlanBtnAdded: { backgroundColor: '#059669' },
  addPlanBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },

  suggestionsContainer: { padding: 16, paddingTop: 0 },
  suggestionsTitle: { fontSize: 15, fontWeight: '600', color: '#0090A3', marginBottom: 10 },
  suggestionsScrollContent: { paddingRight: 16 },
  suggestionButton: {
    backgroundColor: '#E6E1D8', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#ddd',
  },
  suggestionText: { fontSize: 13, color: '#0090A3', fontWeight: '500' },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#E6E1D8',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 15,
    maxHeight: 100,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F8F9FA', alignItems: 'center', justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#F0F0F0' },

  typingBubble: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    backgroundColor: '#E6E1D8', borderRadius: 16, borderBottomLeftRadius: 4,
    minHeight: 46, minWidth: 60, justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6E006A', marginHorizontal: 3 },
});