import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import { isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabase';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import Voice from '@react-native-voice/voice';
import { useNavigation } from '@react-navigation/native';
import BarVisualizer from '../components/BarVisualizer';

type ChatRole = 'system' | 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  created_at?: string;
  pending?: boolean;
};

type Conversation = {
  id: string;
  title: string;
  updated_at: string;
};

const TABLE_CONVERSATIONS = 'alli_ai_conversations';
const TABLE_MESSAGES = 'alli_ai_messages';

const PORTKEY_API_URL = 'https://api.portkey.ai/v1/chat/completions';
const PORTKEY_API_KEY = process.env.EXPO_PUBLIC_PORTKEY_API_KEY;
const PORTKEY_CONFIG = process.env.EXPO_PUBLIC_PORTKEY_CONFIG;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(320, SCREEN_WIDTH * 0.85);

const QUICK_PROMPTS = [
  'What should I eat for breakfast?',
  'Help me plan a healthy meal',
  'How can I lose weight safely?',
  'What are good protein sources?',
];

function buildTitleFromFirstUserMessage(text: string) {
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > 40 ? `${t.slice(0, 40)}…` : t || 'New chat';
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString();
}

// Improved Markdown styles for better readability
const markdownStyles = StyleSheet.create({
  body: {
    color: '#374151',
    fontSize: 16,
    lineHeight: 26,
  },
  heading1: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
    marginBottom: 12,
    lineHeight: 30,
  },
  heading2: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 18,
    marginBottom: 10,
    lineHeight: 28,
  },
  heading3: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 26,
  },
  heading4: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 14,
    marginBottom: 6,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 14,
    lineHeight: 26,
  },
  strong: {
    fontWeight: '700',
    color: '#111827',
  },
  em: {
    fontStyle: 'italic',
    color: '#4B5563',
  },
  s: {
    textDecorationLine: 'line-through',
  },
  link: {
    color: '#B9A68D',
    textDecorationLine: 'underline',
  },
  blockquote: {
    backgroundColor: '#FEF9F3',
    borderLeftWidth: 4,
    borderLeftColor: '#B9A68D',
    paddingLeft: 14,
    paddingRight: 14,
    paddingVertical: 10,
    marginVertical: 12,
    borderRadius: 6,
  },
  code_inline: {
    backgroundColor: '#F3F4F6',
    color: '#B45309',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: '#1F2937',
    color: '#F9FAFB',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    padding: 14,
    borderRadius: 10,
    marginVertical: 12,
    lineHeight: 20,
  },
  fence: {
    backgroundColor: '#1F2937',
    color: '#F9FAFB',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    padding: 14,
    borderRadius: 10,
    marginVertical: 12,
    lineHeight: 20,
  },
  list_item: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet_list: {
    marginVertical: 10,
  },
  ordered_list: {
    marginVertical: 10,
  },
  bullet_list_icon: {
    color: '#B9A68D',
    fontSize: 8,
    marginRight: 10,
    marginTop: 9,
  },
  ordered_list_icon: {
    color: '#B9A68D',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 10,
    minWidth: 20,
  },
  bullet_list_content: {
    flex: 1,
  },
  ordered_list_content: {
    flex: 1,
  },
  // Table styles - simplified for better rendering
  table: {
    marginVertical: 14,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  thead: {
    backgroundColor: '#F9FAFB',
  },
  tbody: {
    backgroundColor: '#FFFFFF',
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  th: {
    flex: 1,
    padding: 12,
    fontWeight: '700',
    fontSize: 13,
    color: '#374151',
    backgroundColor: '#F9FAFB',
  },
  td: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  hr: {
    backgroundColor: '#E5E7EB',
    height: 1,
    marginVertical: 20,
  },
  image: {
    borderRadius: 10,
    marginVertical: 10,
  },
  textgroup: {
    marginVertical: 2,
  },
  hardbreak: {
    height: 10,
  },
  softbreak: {
    height: 6,
  },
});

function BarVisualizerScreen() {
  return <BarVisualizer />
}

// Typing indicator dots animation
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );
    };
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
  });

  return (
    <View style={styles.assistantMessageContainer}>
      <View style={styles.avatarRow}>
        <LinearGradient colors={['#B9A68D', '#8B7355']} style={styles.avatar}>
          <Text style={styles.avatarText}>A</Text>
        </LinearGradient>
        <Text style={styles.assistantLabel}>Alli</Text>
      </View>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, dotStyle(dot1)]} />
        <Animated.View style={[styles.typingDot, dotStyle(dot2)]} />
        <Animated.View style={[styles.typingDot, dotStyle(dot3)]} />
      </View>
    </View>
  );
}

// Copy button component
function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  return (
    <TouchableOpacity onPress={handleCopy} style={styles.copyButton}>
      <Ionicons
        name={copied ? 'checkmark-circle' : 'copy-outline'}
        size={18}
        color={copied ? '#10B981' : '#9CA3AF'}
      />
      <Text style={[styles.copyButtonText, copied && styles.copyButtonTextCopied]}>
        {copied ? 'Copied!' : 'Copy'}
      </Text>
    </TouchableOpacity>
  );
}

export default function AlliChatScreen() {
  const navigation = useNavigation<any>();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState('Alli');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const visibleMessages = useMemo(() => messages.filter(m => m.role !== 'system'), [messages]);

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  const toggleDrawer = (open: boolean) => {
    setDrawerOpen(open);
    Animated.spring(drawerAnim, {
      toValue: open ? 0 : -DRAWER_WIDTH,
      useNativeDriver: true,
      friction: 10,
    }).start();
  };

  const ensureSessionUserId = async (): Promise<string> => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new Error(error?.message || 'Not logged in');
    return data.user.id;
  };

  const loadConversations = async () => {
    try {
      setLoadingHistory(true);
      const userId = await ensureSessionUserId();
      const res = await supabase
        .from(TABLE_CONVERSATIONS)
        .select('id,title,updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (!res.error && res.data) {
        setConversations(res.data as Conversation[]);
      }
    } catch (e) {
      console.error('Failed to load conversations', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadOrCreateConversation = async (userId: string) => {
    const latest = await supabase
      .from(TABLE_CONVERSATIONS)
      .select('id,title,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    const row = latest.data?.[0];
    if (row?.id) return { id: row.id as string, title: (row.title as string) || 'Alli' };

    const created = await supabase
      .from(TABLE_CONVERSATIONS)
      .insert({ user_id: userId, title: 'New chat' })
      .select('id,title')
      .single();

    if (created.error || !created.data?.id) throw new Error(created.error?.message || 'Failed to create conversation');
    return { id: created.data.id as string, title: (created.data.title as string) || 'Alli' };
  };

  const loadMessages = async (convId: string) => {
    const res = await supabase
      .from(TABLE_MESSAGES)
      .select('id,role,content,created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (res.error) throw new Error(res.error.message);
    const data = (res.data || []).map((m: any) => ({
      id: String(m.id),
      role: m.role as ChatRole,
      content: String(m.content || ''),
      created_at: m.created_at as string | undefined,
    }));
    setMessages(data);
  };

  const switchConversation = async (conv: Conversation) => {
    try {
      toggleDrawer(false);
      setLoading(true);
      setConversationId(conv.id);
      setConversationTitle(conv.title === 'New chat' ? 'Alli' : conv.title);
      await loadMessages(conv.id);
      scrollToEnd();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = async () => {
    try {
      if (!isSupabaseConfigured) {
        Alert.alert('Supabase not configured', supabaseConfigError);
        return;
      }
      toggleDrawer(false);
      setLoading(true);
      const userId = await ensureSessionUserId();
      const created = await supabase
        .from(TABLE_CONVERSATIONS)
        .insert({ user_id: userId, title: 'New chat' })
        .select('id,title')
        .single();
      if (created.error || !created.data?.id) throw new Error(created.error?.message || 'Failed to create conversation');
      setConversationId(created.data.id as string);
      setConversationTitle('Alli');
      setMessages([]);
      setInput('');
      await loadConversations();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (convId: string) => {
    try {
      const userId = await ensureSessionUserId();
      await supabase.from(TABLE_MESSAGES).delete().eq('conversation_id', convId);
      await supabase.from(TABLE_CONVERSATIONS).delete().eq('id', convId).eq('user_id', userId);
      await loadConversations();
      if (convId === conversationId) {
        await startNewChat();
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!isSupabaseConfigured) {
          if (!mounted) return;
          setLoading(false);
          Alert.alert('Supabase not configured', supabaseConfigError);
          return;
        }
        const userId = await ensureSessionUserId();
        const conv = await loadOrCreateConversation(userId);
        if (!mounted) return;
        setConversationId(conv.id);
        setConversationTitle(conv.title === 'New chat' ? 'Alli' : conv.title);
        await loadMessages(conv.id);
        await loadConversations();
        if (!mounted) return;
        setLoading(false);
        scrollToEnd();
      } catch (e) {
        if (!mounted) return;
        setLoading(false);
        Alert.alert('Chat init failed', e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || sending) return;
    if (!conversationId) return;

    try {
      setSending(true);
      setInput('');

      const userId = await ensureSessionUserId();
      const optimisticUserId = `local-user-${Date.now()}`;
      const optimisticAssistantId = `local-assistant-${Date.now()}`;

      const nextMessages = [
        ...messages,
        { id: optimisticUserId, role: 'user' as const, content: text, pending: true },
        { id: optimisticAssistantId, role: 'assistant' as const, content: '…', pending: true },
      ];
      setMessages(nextMessages);
      scrollToEnd();

      const insertedUser = await supabase
        .from(TABLE_MESSAGES)
        .insert({ conversation_id: conversationId, user_id: userId, role: 'user', content: text })
        .select('id,role,content,created_at')
        .single();
      if (insertedUser.error) throw new Error(insertedUser.error.message);

      if (messages.length === 0) {
        const title = buildTitleFromFirstUserMessage(text);
        await supabase
          .from(TABLE_CONVERSATIONS)
          .update({ title })
          .eq('id', conversationId)
          .eq('user_id', userId);
        setConversationTitle(title === 'New chat' ? 'Alli' : title);
        await loadConversations();
      }

      const historyPayload = nextMessages
        .filter(m => !m.pending || m.role === 'user')
        .filter(m => m.content && m.content !== '…')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(PORTKEY_API_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-portkey-api-key': PORTKEY_API_KEY,
          'x-portkey-config': PORTKEY_CONFIG,
        },
        body: JSON.stringify({ messages: historyPayload }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error?.message || json?.error || `Chat request failed (${res.status})`);
      }

      const assistantText = String(json?.choices?.[0]?.message?.content || '').trim();
      if (!assistantText) throw new Error('Empty model response');

      const insertedAssistant = await supabase
        .from(TABLE_MESSAGES)
        .insert({ conversation_id: conversationId, user_id: userId, role: 'assistant', content: assistantText })
        .select('id,role,content,created_at')
        .single();
      if (insertedAssistant.error) throw new Error(insertedAssistant.error.message);

      setMessages(prev => {
        const withoutOptimistic = prev.filter(m => m.id !== optimisticUserId && m.id !== optimisticAssistantId);
        const u = insertedUser.data as any;
        const a = insertedAssistant.data as any;
        return [
          ...withoutOptimistic,
          { id: String(u.id), role: 'user', content: String(u.content), created_at: u.created_at },
          { id: String(a.id), role: 'assistant', content: String(a.content), created_at: a.created_at },
        ];
      });
      scrollToEnd();
    } catch (e) {
      Alert.alert('Send failed', e instanceof Error ? e.message : String(e));
      setMessages(prev => prev.filter(m => !m.pending));
    } finally {
      setSending(false);
    }
  };
  useEffect(() => {
    Voice.onSpeechStart = () => {
      setIsListening(true);
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
    };

    Voice.onSpeechResults = (e) => {
      if (e.value && e.value.length > 0) {
        setInput(e.value[0]);
      }
    };

    Voice.onSpeechError = (e) => {
      console.error('Voice error:', e);
      setIsListening(false);
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);
  const toggleVoiceInput = async () => {
    if (isListening) {
      try {
        await Voice.stop();
        setIsListening(false);
      } catch (e) {
        console.error(e);
        setIsListening(false);
      }
    } else {
      try {
        await Voice.start('en-US');
        setIsListening(true);
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Voice recognition failed');
      }
    }
  };
  // const startListening = async () => {
  //   try {
  //     await Voice.start('en-US');
  //   } catch (e) {
  //     console.error(e);
  //   }
  // };
  // // Start Recording
  // const startRecording = async () => {
  //   try {
  //     const permission = await Audio.requestPermissionsAsync();
  //     if (!permission.granted) {
  //       Alert.alert('Permission required', 'Microphone access is needed.');
  //       return;
  //     }

  //     await Audio.setAudioModeAsync({
  //       allowsRecordingIOS: true,
  //       playsInSilentModeIOS: true,
  //     });

  //     const recording = new Audio.Recording();
  //     await recording.prepareToRecordAsync(
  //       Audio.RecordingOptionsPresets.HIGH_QUALITY
  //     );
  //     await recording.startAsync();

  //     recordingRef.current = recording;
  //     setIsRecording(true);
  //   } catch (err) {
  //     Alert.alert('Error', 'Failed to start recording');
  //   }
  // };
  // // Stop REcording
  // const stopRecording = async () => {
  //   try {
  //     const recording = recordingRef.current;
  //     if (!recording) return;

  //     await recording.stopAndUnloadAsync();
  //     const uri = recording.getURI();
  //     setIsRecording(false);
  //     recordingRef.current = null;

  //     if (!uri) return;

  //     // 🔥 TEMP SIMPLE MODE:
  //     // You can integrate Whisper backend later.
  //     // For now we simulate voice → text
  //     Alert.prompt(
  //       'Voice captured',
  //       'Convert speech to text (temporary)',
  //       text => {
  //         if (text) sendMessage(text);
  //       }
  //     );
  //   } catch (err) {
  //     Alert.alert('Error', 'Failed to stop recording');
  //     setIsRecording(false);
  //   }
  // };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.role === 'user';
    const isPending = item.pending && item.content === '…';

    if (isPending && !isUser) {
      return <TypingIndicator />;
    }

    if (isUser) {
      return (
        <View style={styles.userMessageContainer}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    // Assistant message - full width with better formatting
    return (
      <View style={styles.assistantMessageContainer}>
        <View style={styles.avatarRow}>
          <LinearGradient colors={['#B9A68D', '#8B7355']} style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </LinearGradient>
          <Text style={styles.assistantLabel}>Alli</Text>
        </View>
        <View style={styles.assistantContent}>
          <Markdown style={markdownStyles}>{item.content}</Markdown>
        </View>
        <View style={styles.messageActions}>
          <CopyButton content={item.content} />
        </View>
      </View>
    );
  };

  const renderEmptyChat = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient colors={['#B9A68D', '#8B7355']} style={styles.emptyLogo}>
        <Text style={styles.emptyLogoText}>A</Text>
      </LinearGradient>
      <Text style={styles.emptyTitle}>Hi, I'm Alli!</Text>
      <Text style={styles.emptySubtitle}>Your personal nutrition assistant</Text>
      <Text style={styles.emptyDescription}>
        Ask me anything about nutrition, meal planning, or healthy eating habits.
      </Text>
      <View style={styles.promptsContainer}>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.promptButton}
            onPress={() => sendMessage(prompt)}
            disabled={sending}
          >
            <Text style={styles.promptText}>{prompt}</Text>
            <Ionicons name="arrow-forward" size={16} color="#B9A68D" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDrawerItem = ({ item }: { item: Conversation }) => {
    const isActive = item.id === conversationId;
    return (
      <TouchableOpacity
        style={[styles.drawerItem, isActive && styles.drawerItemActive]}
        onPress={() => switchConversation(item)}
        onLongPress={() => {
          Alert.alert('Delete Chat', 'Are you sure you want to delete this conversation?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteConversation(item.id) },
          ]);
        }}
      >
        <View style={styles.drawerItemIcon}>
          <Ionicons name="chatbubble-outline" size={18} color={isActive ? '#B9A68D' : '#6B7280'} />
        </View>
        <View style={styles.drawerItemContent}>
          <Text style={[styles.drawerItemTitle, isActive && styles.drawerItemTitleActive]} numberOfLines={1}>
            {item.title || 'New chat'}
          </Text>
          <Text style={styles.drawerItemDate}>{formatDate(item.updated_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B9A68D" />
          <Text style={styles.loadingText}>Loading chat…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Drawer overlay */}
      {drawerOpen && (
        <Pressable style={styles.overlay} onPress={() => toggleDrawer(false)} />
      )}

      {/* Drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerHeaderTitle}>Chat History</Text>
          <TouchableOpacity onPress={() => toggleDrawer(false)} style={styles.drawerCloseBtn}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.newChatButton} onPress={startNewChat}>
          <Ionicons name="add-circle-outline" size={22} color="#fff" />
          <Text style={styles.newChatButtonText}>New Chat</Text>
        </TouchableOpacity>
        {loadingHistory ? (
          <View style={styles.drawerLoading}>
            <ActivityIndicator color="#B9A68D" />
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(c) => c.id}
            renderItem={renderDrawerItem}
            contentContainerStyle={styles.drawerList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.drawerEmptyText}>No conversations yet</Text>
            }
          />
        )}
      </Animated.View>

      {/* Main content */}
      <View style={styles.main}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              toggleDrawer(!drawerOpen);
              if (!drawerOpen) loadConversations();
            }}
            style={styles.hamburgerBtn}
          >
            <Ionicons name="menu" size={26} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {conversationTitle || 'Alli'}
          </Text>
          <TouchableOpacity onPress={startNewChat} style={styles.newChatBtn}>
            <Ionicons name="create-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {visibleMessages.length === 0 ? (
            <ScrollView contentContainerStyle={styles.emptyScrollContainer}>
              {renderEmptyChat()}
            </ScrollView>
          ) : (
            <FlatList
              ref={listRef}
              data={visibleMessages}
              keyExtractor={(m) => m.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={scrollToEnd}
              onLayout={scrollToEnd}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Composer */}
          <View style={styles.composerContainer}>
            <View style={styles.composer}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Message Alli…"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                multiline
                editable={!sending}
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (Platform.OS !== 'web') sendMessage();
                }}
              />
              <TouchableOpacity
                onPress={() => sendMessage()}
                style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
                disabled={!input.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="arrow-up" size={20} color="#fff" />
                )}
              </TouchableOpacity>
              <TouchableOpacity

                onPress={() => navigation.navigate('BarVisualizer')}
                style={[styles.micBtn, isListening && styles.micBtnActive]}
              >
                <Image
                  source={require('../assets/voice.png')}
                  style={{ width: 24, height: 24, resizeMode: 'stretch' }}
                />

              </TouchableOpacity>


            </View>
            <Text style={styles.disclaimer}>
              Alli can make mistakes. Verify important nutrition info.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 15 },

  // Drawer
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  drawerHeaderTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  drawerCloseBtn: { padding: 4 },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
    paddingVertical: 12,
    backgroundColor: '#B9A68D',
    borderRadius: 12,
  },
  newChatButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  drawerList: { paddingHorizontal: 12, paddingBottom: 20 },
  drawerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  drawerEmptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontSize: 15 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  drawerItemActive: { backgroundColor: '#F3F4F6' },
  drawerItemIcon: { width: 32, alignItems: 'center' },
  drawerItemContent: { flex: 1, marginLeft: 8 },
  drawerItemTitle: { fontSize: 15, color: '#374151', fontWeight: '500' },
  drawerItemTitleActive: { color: '#B9A68D', fontWeight: '600' },
  drawerItemDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  // Main
  main: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    height: 60,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  hamburgerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  newChatBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },

  // Empty state
  emptyScrollContainer: { flexGrow: 1 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyLogoText: { fontSize: 36, fontWeight: '700', color: '#fff' },
  emptyTitle: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 16, color: '#6B7280', marginBottom: 12 },
  emptyDescription: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  promptsContainer: { width: '100%', gap: 10 },
  promptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  promptText: { flex: 1, fontSize: 15, color: '#374151' },

  // Messages
  messagesList: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },

  // User message - right aligned bubble
  userMessageContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  userBubble: {
    maxWidth: '85%',
    backgroundColor: '#B9A68D',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomRightRadius: 6,
  },
  userText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
  },

  // Assistant message - full width
  assistantMessageContainer: {
    marginBottom: 24,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  assistantLabel: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  assistantContent: {
    paddingLeft: 2,
  },
  messageActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingLeft: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  copyButtonText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  copyButtonTextCopied: {
    color: '#10B981',
  },

  // Typing indicator
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B9A68D',
  },

  // Composer
  composerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    fontSize: 16,
    color: '#111827',
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#B9A68D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#D1D5DB' },
  disclaimer: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 10,
  },
  micBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    // backgroundColor: '#6B7280',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: '#EF4444',
  },

});
