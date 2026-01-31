import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Alert,
    Platform,
    PermissionsAndroid,
    Dimensions,
    Easing,
    NativeModules,
    NativeEventEmitter,
    ScrollView,
} from 'react-native';
import {
    Room,
    createLocalAudioTrack,
    RoomEvent,
    LocalAudioTrack,
    RemoteAudioTrack,
} from 'livekit-client';
import { registerGlobals, AudioSession } from '@livekit/react-native';

registerGlobals();

const LIVEKIT_URL = 'wss://alli-h8mq663x.livekit.cloud';
const BACKEND_URL = 'http://62.72.35.123:8003/start_call2';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type AgentState = 'connecting' | 'initializing' | 'listening' | 'speaking' | 'thinking';

interface TranscriptItem {
    id: string;
    speaker: 'user' | 'agent';
    text: string;
    timestamp: number;
}

// Audio Device Detection Hook
const useAudioDeviceDetection = () => {
    const [currentDevice, setCurrentDevice] = useState<'speaker' | 'earpiece' | 'headphones' | 'bluetooth'>('speaker');
    const [isHeadsetPlugged, setIsHeadsetPlugged] = useState(false);

    useEffect(() => {
        let eventEmitter: NativeEventEmitter | null = null;
        let subscription: any = null;

        const setupAudioDeviceListener = async () => {
            try {
                if (Platform.OS === 'android') {
                    const checkAudioDevice = async () => {
                        try {
                            const devices = await AudioSession.getAvailableOutputs();
                            if (devices.includes('bluetooth')) {
                                setCurrentDevice('bluetooth');
                                setIsHeadsetPlugged(true);
                            } else if (devices.includes('headphones') || devices.includes('wiredHeadset')) {
                                setCurrentDevice('headphones');
                                setIsHeadsetPlugged(true);
                            } else if (devices.includes('earpiece')) {
                                setCurrentDevice('earpiece');
                                setIsHeadsetPlugged(false);
                            } else {
                                setCurrentDevice('speaker');
                                setIsHeadsetPlugged(false);
                            }
                        } catch (error) {
                            setCurrentDevice('speaker');
                            setIsHeadsetPlugged(false);
                        }
                    };

                    await checkAudioDevice();
                    const audioEventEmitter = new NativeEventEmitter(NativeModules.AudioDeviceModule || {});
                    subscription = audioEventEmitter.addListener('onAudioDeviceChanged', checkAudioDevice);
                    const interval = setInterval(checkAudioDevice, 2000);

                    return () => clearInterval(interval);
                } else if (Platform.OS === 'ios') {
                    const checkIOSAudioRoute = async () => {
                        try {
                            const currentRoute = await AudioSession.getCurrentRoute();
                            if (currentRoute.includes('Bluetooth')) {
                                setCurrentDevice('bluetooth');
                                setIsHeadsetPlugged(true);
                            } else if (currentRoute.includes('Headphones') || currentRoute.includes('Headset')) {
                                setCurrentDevice('headphones');
                                setIsHeadsetPlugged(true);
                            } else if (currentRoute.includes('Receiver')) {
                                setCurrentDevice('earpiece');
                                setIsHeadsetPlugged(false);
                            } else {
                                setCurrentDevice('speaker');
                                setIsHeadsetPlugged(false);
                            }
                        } catch (error) {
                            setCurrentDevice('speaker');
                            setIsHeadsetPlugged(false);
                        }
                    };

                    await checkIOSAudioRoute();
                    eventEmitter = new NativeEventEmitter(NativeModules.AudioSession || {});
                    subscription = eventEmitter.addListener('onAudioRouteChanged', checkIOSAudioRoute);
                    const interval = setInterval(checkIOSAudioRoute, 2000);

                    return () => clearInterval(interval);
                }
            } catch (error) {
                console.error('❌ Error setting up audio device listener:', error);
            }
        };

        const cleanup = setupAudioDeviceListener();

        return () => {
            if (subscription) subscription.remove();
            if (cleanup) cleanup.then(cleanupFn => cleanupFn && cleanupFn());
        };
    }, []);

    return { currentDevice, isHeadsetPlugged };
};

// Enhanced Claude Orb Visualizer with Premium Effects
const ClaudeOrbVisualizer = ({
    state,
    audioLevel = 0,
}: {
    state: AgentState;
    audioLevel: number;
}) => {
    const scale = useRef(new Animated.Value(1)).current;
    const glowOpacity = useRef(new Animated.Value(0.3)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const waveX = useRef(new Animated.Value(0)).current;
    const waveY = useRef(new Animated.Value(0)).current;
    const blob1Scale = useRef(new Animated.Value(1)).current;
    const blob2Scale = useRef(new Animated.Value(1)).current;
    const blob3Scale = useRef(new Animated.Value(1)).current;

    // Floating particles around the orb
    const particles = useRef(
        Array.from({ length: 12 }, () => ({
            rotate: new Animated.Value(0),
            scale: new Animated.Value(1),
            opacity: new Animated.Value(0.4),
        }))
    ).current;

    /** Rotation Animation */
    useEffect(() => {
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 20000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    /** Particle Orbit Animations */
    useEffect(() => {
        particles.forEach((particle, index) => {
            const duration = 4000 + index * 300;
            const delay = index * 150;

            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.parallel([
                        Animated.timing(particle.rotate, {
                            toValue: 1,
                            duration,
                            easing: Easing.linear,
                            useNativeDriver: true,
                        }),
                        Animated.sequence([
                            Animated.timing(particle.scale, {
                                toValue: 1.4,
                                duration: duration / 2,
                                easing: Easing.inOut(Easing.ease),
                                useNativeDriver: true,
                            }),
                            Animated.timing(particle.scale, {
                                toValue: 1,
                                duration: duration / 2,
                                easing: Easing.inOut(Easing.ease),
                                useNativeDriver: true,
                            }),
                        ]),
                    ]),
                ])
            ).start();
        });
    }, []);

    /** Wave Animations */
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(waveX, {
                    toValue: 1,
                    duration: 4200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(waveX, {
                    toValue: 0,
                    duration: 4200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(waveY, {
                    toValue: 1,
                    duration: 5600,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(waveY, {
                    toValue: 0,
                    duration: 5600,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const wobbleX = waveX.interpolate({
        inputRange: [0, 1],
        outputRange: [-6, 6],
    });

    const wobbleY = waveY.interpolate({
        inputRange: [0, 1],
        outputRange: [6, -6],
    });

    /** Breathing + Audio Response */
    useEffect(() => {
        let frame: number;
        const start = Date.now();

        const animate = () => {
            const t = (Date.now() - start) / 1000;
            const speaking = state === 'speaking';
            const thinking = state === 'thinking';

            const speed = thinking ? 1.2 : speaking ? 2.4 : 0.8;
            const breathe = Math.sin(t * speed) * 0.06;

            const baseScale = speaking || thinking ? 1 + audioLevel * 0.4 : 1;
            scale.setValue(baseScale + breathe);

            // Multilayered blob animation
            blob1Scale.setValue(1 + Math.sin(t * 1.5) * 0.05 + audioLevel * 0.3);
            blob2Scale.setValue(1 + Math.cos(t * 1.2) * 0.08 + audioLevel * 0.4);
            blob3Scale.setValue(1 + Math.sin(t * 0.8) * 0.1 + audioLevel * 0.5);

            glowOpacity.setValue(
                speaking
                    ? 0.65 + audioLevel * 0.35
                    : 0.35 + Math.sin(t * 2) * 0.12
            );

            // Dynamic particle behavior
            particles.forEach((particle, i) => {
                const offset = (i / particles.length) * Math.PI * 2;
                if (speaking || thinking) {
                    const pulse = Math.sin(t * 5 + offset) * 0.5 + 0.5;
                    particle.opacity.setValue(0.35 + audioLevel * 0.55 + pulse * 0.25);
                } else {
                    particle.opacity.setValue(0.25 + Math.sin(t * 2 + offset) * 0.15);
                }
            });

            frame = requestAnimationFrame(animate);
        };

        animate();
        return () => frame && cancelAnimationFrame(frame);
    }, [state, audioLevel]);

    /** Color Scheme */
    const getOrbColor = () => {
        switch (state) {
            case 'speaking':
                return '#E97451'; // Burnt Orange
            case 'thinking':
                return '#9B87F5'; // Soft Purple
            case 'connecting':
            case 'initializing':
                return '#94A3B8'; // Slate
            default:
                return '#B9A68D'; // Gold/Beige
        }
    }

    const orbColor = getOrbColor();

    return (
        <View style={styles.orbContainer}>
            {/* Orbiting Particles */}
            {particles.map((particle, index) => {
                const angle = (index / particles.length) * 360;
                const radius = 75;

                return (
                    <Animated.View
                        key={index}
                        style={[
                            styles.particle,
                            {
                                backgroundColor: orbColor,
                                opacity: particle.opacity,
                                transform: [
                                    { rotate: `${angle}deg` },
                                    { translateX: radius },
                                    {
                                        rotate: particle.rotate.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0deg', '360deg'],
                                        }),
                                    },
                                    { scale: particle.scale },
                                ],
                            },
                        ]}
                    />
                );
            })}

            {/* Outer Glow Rings */}
            <Animated.View
                style={[
                    styles.glowRing,
                    {
                        backgroundColor: orbColor,
                        opacity: glowOpacity,
                        transform: [{ scale: Animated.multiply(blob2Scale, 1.55) }, { rotate }],
                    },
                ]}
            />

            <Animated.View
                style={[
                    styles.glowRing,
                    {
                        backgroundColor: orbColor,
                        opacity: Animated.multiply(glowOpacity, 0.4),
                        transform: [
                            { scale: Animated.multiply(blob3Scale, 1.85) },
                            {
                                rotate: rotateAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['360deg', '0deg'],
                                }),
                            },
                        ],
                    },
                ]}
            />

            {/* Overlapping Liquid Layers */}
            <Animated.View
                style={[
                    styles.blobLayer,
                    {
                        backgroundColor: orbColor,
                        opacity: 0.15,
                        transform: [{ scale: blob3Scale }, { rotate: '45deg' }],
                    }
                ]}
            />
            <Animated.View
                style={[
                    styles.blobLayer,
                    {
                        backgroundColor: orbColor,
                        opacity: 0.2,
                        transform: [{ scale: blob2Scale }, { rotate: '-30deg' }],
                    }
                ]}
            />

            {/* Decorative Ring */}
            <Animated.View
                style={[
                    styles.decorativeRing,
                    {
                        borderColor: orbColor,
                        opacity: 0.2,
                        transform: [{ scale: Animated.multiply(scale, 1.3) }],
                    },
                ]}
            />

            {/* Main Orb */}
            <Animated.View
                style={[
                    styles.mainOrb,
                    {
                        backgroundColor: orbColor,
                        shadowColor: orbColor,
                        transform: [
                            { scale: blob1Scale },
                            { translateX: wobbleX },
                            { translateY: wobbleY }
                        ],
                    },
                ]}
            >
                <View style={styles.orbHighlight} />
                <View style={[styles.orbCore, { backgroundColor: orbColor, opacity: 0.4 }]} />
            </Animated.View>

            {/* Audio Ripples */}
            {audioLevel > 0.02 && (
                <>
                    <Animated.View
                        style={[
                            styles.audioRing,
                            {
                                borderColor: orbColor,
                                opacity: Animated.multiply(glowOpacity, audioLevel * 0.8),
                                transform: [
                                    {
                                        scale: Animated.add(
                                            blob1Scale,
                                            Animated.multiply(audioLevel, 1.5)
                                        ),
                                    },
                                ],
                            },
                        ]}
                    />
                </>
            )}
        </View>
    );
};

const QuestionDisplay = ({
    text,
    state
}: {
    text: string;
    state: AgentState;
}) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(10)).current;

    useEffect(() => {
        const visible = text.length > 0;
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: visible ? 1 : 0,
                duration: 400,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: visible ? 0 : 10,
                duration: 400,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [text]);

    if (!text && state === 'listening') return null;

    return (
        <Animated.View style={[styles.questionDisplay, { opacity, transform: [{ translateY }] }]}>
            <Text style={styles.questionLabel}>
                {state === 'thinking' || state === 'listening' ? 'YOU SAID' : 'ALLI IS SAYING'}
            </Text>
            <Text style={styles.questionText} numberOfLines={3}>
                {text || (state === 'thinking' ? 'Thinking...' : '...')}
            </Text>
        </Animated.View>
    );
};

const VoiceAgentVisualizer = () => {
    const [room, setRoom] = useState<Room | null>(null);
    const [connected, setConnected] = useState(false);
    const [muted, setMuted] = useState(false);
    const [localTrack, setLocalTrack] = useState<LocalAudioTrack | null>(null);
    const [agentState, setAgentState] = useState<AgentState>('listening');
    const [audioLevel, setAudioLevel] = useState(0);
    const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
    const [currentUserText, setCurrentUserText] = useState('');
    const [currentAgentText, setCurrentAgentText] = useState('');

    const { currentDevice, isHeadsetPlugged } = useAudioDeviceDetection();
    const audioLevelSmoothRef = useRef(0);
    const lastSpeakingTime = useRef(Date.now());
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);

    const [suggestedQuestions] = useState([
        "What can you help me with?",
        "Tell me about your capabilities",
        "How does this work?",
    ]);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, []);

    const addToTranscript = (speaker: 'user' | 'agent', text: string) => {
        const newItem: TranscriptItem = {
            id: Date.now().toString(),
            speaker,
            text,
            timestamp: Date.now(),
        };
        setTranscript(prev => [...prev, newItem]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    };

    useEffect(() => {
        if (agentState === 'thinking' && currentUserText) {
            addToTranscript('user', currentUserText);
            setCurrentUserText('');
        } else if (agentState === 'listening' && currentAgentText) {
            addToTranscript('agent', currentAgentText);
            setCurrentAgentText('');
        }
    }, [agentState]);

    const updateAudioLevel = (level: number) => {
        const smoothingFactor = 0.3;
        audioLevelSmoothRef.current =
            audioLevelSmoothRef.current * (1 - smoothingFactor) + level * smoothingFactor;
        setAudioLevel(audioLevelSmoothRef.current);

        if (level > 0.01) {
            lastSpeakingTime.current = Date.now();
        }
    };

    useEffect(() => {
        const decayInterval = setInterval(() => {
            const timeSinceLastSpeak = Date.now() - lastSpeakingTime.current;

            if (timeSinceLastSpeak > 200 && audioLevelSmoothRef.current > 0.01) {
                audioLevelSmoothRef.current *= 0.85;
                setAudioLevel(audioLevelSmoothRef.current);

                if (audioLevelSmoothRef.current < 0.01) {
                    audioLevelSmoothRef.current = 0;
                    setAudioLevel(0);
                }
            }
        }, 50);

        return () => clearInterval(decayInterval);
    }, []);

    useEffect(() => {
        if (!connected) return;

        const configureAudioForDevice = async () => {
            try {
                if (isHeadsetPlugged) {
                    await AudioSession.configureAudio({
                        android: {
                            preferredOutputList: currentDevice === 'bluetooth' ? ['bluetooth'] : ['wiredHeadset', 'headphones'],
                        },
                        ios: {
                            defaultToSpeaker: false,
                        },
                    });
                } else {
                    await AudioSession.configureAudio({
                        android: {
                            preferredOutputList: ['speaker'],
                        },
                        ios: {
                            defaultToSpeaker: true,
                        },
                    });
                }
            } catch (error) {
                console.error('❌ Error auto-configuring audio:', error);
            }
        };

        configureAudioForDevice();
    }, [currentDevice, isHeadsetPlugged, connected]);

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    };

    const setupAudioSession = async () => {
        try {
            if (isHeadsetPlugged) {
                await AudioSession.configureAudio({
                    android: {
                        preferredOutputList: currentDevice === 'bluetooth' ? ['bluetooth'] : ['wiredHeadset', 'headphones'],
                    },
                    ios: {
                        defaultToSpeaker: false,
                    },
                });
            } else {
                await AudioSession.configureAudio({
                    android: {
                        preferredOutputList: ['speaker'],
                    },
                    ios: {
                        defaultToSpeaker: true,
                    },
                });
            }

            await AudioSession.startAudioSession();
        } catch (err) {
            console.error('❌ Error configuring AudioSession:', err);
        }
    };

    const stopAudioSession = async () => {
        try {
            await AudioSession.stopAudioSession();
        } catch (err) {
            console.error('❌ Error stopping AudioSession:', err);
        }
    };

    const connectToRoom = async (token: string) => {
        try {
            setAgentState('connecting');
            await setupAudioSession();

            const r = new Room({
                adaptiveStream: true,
                dynacast: true,
            });

            r.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                if (track.kind === 'audio') {
                    const audioTrack = track as RemoteAudioTrack;
                    audioTrack.setVolume(1.0);

                    audioTrack.on('audioLevelChanged', (level: number) => {
                        if (level > 0.005) {
                            setAgentState('speaking');
                            const scaledLevel = Math.min(1, Math.pow(level * 8, 0.8));
                            updateAudioLevel(Math.min(1, scaledLevel));
                        } else {
                            if (Date.now() - lastSpeakingTime.current > 250) {
                                setAgentState('listening');
                            }
                        }
                    });
                }
            });

            // Handle transcription events
            r.on(RoomEvent.TranscriptionReceived, (transcriptions, participant) => {
                console.log('📝 Transcription received:', transcriptions);

                transcriptions.forEach((transcription) => {
                    const isAgent = participant?.identity !== r.localParticipant.identity;
                    const text = transcription.text;

                    console.log(`${isAgent ? 'Agent' : 'User'} said: "${text}" (final: ${transcription.final})`);

                    if (isAgent) {
                        // Agent is speaking
                        setCurrentAgentText(text);
                        if (transcription.final) {
                            // Final transcription - will be moved to transcript history
                            setTimeout(() => {
                                if (agentState !== 'speaking') {
                                    addToTranscript('agent', text);
                                    setCurrentAgentText('');
                                }
                            }, 500);
                        }
                    } else {
                        // User is speaking
                        setCurrentUserText(text);
                        if (transcription.final) {
                            // Final transcription - will be moved to transcript history
                            setTimeout(() => {
                                if (agentState !== 'thinking') {
                                    addToTranscript('user', text);
                                    setCurrentUserText('');
                                }
                            }, 500);
                        }
                    }
                });
            });

            r.on(RoomEvent.LocalTrackPublished, (trackPub) => {
                const track = trackPub.track;
                if (track && track.kind === 'audio') {
                    track.on('audioLevelChanged', (level: number) => {
                        if (level > 0.005) {
                            setAgentState('thinking');
                            const scaledLevel = Math.pow(level * 12, 0.7);
                            updateAudioLevel(Math.min(1, scaledLevel));
                        } else {
                            if (agentState === 'thinking') {
                                setAgentState('listening');
                            }
                        }
                    });
                }
            });

            r.on(RoomEvent.Connected, () => {
                console.log('✅ Connected to LiveKit room');
                setConnected(true);
                setAgentState('initializing');
                setTimeout(() => {
                    setAgentState('listening');
                    setAudioLevel(0);
                }, 1000);
            });

            r.on(RoomEvent.Disconnected, () => {
                console.log('❌ Disconnected from LiveKit room');
                setConnected(false);
                setAgentState('listening');
                setAudioLevel(0);
                audioLevelSmoothRef.current = 0;
            });

            setAgentState('initializing');
            const track = await createLocalAudioTrack({
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            });
            setLocalTrack(track);

            await r.connect(LIVEKIT_URL, token);
            await r.localParticipant.publishTrack(track);

            setRoom(r);
        } catch (err: any) {
            console.error('❌ LiveKit connection error:', err);
            Alert.alert('Connection Error', err.message);
            setAgentState('listening');
            setAudioLevel(0);
            await stopAudioSession();
        }
    };

    const handleConnect = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
            Alert.alert('Permission Denied', 'Microphone permission is required');
            return;
        }

        try {
            setAgentState('connecting');
            const requestBody = {
                agent_id: '123',
                roomName: `room-123-${Date.now()}`,
                participantName: `user-${Date.now()}`,
            };

            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Backend error: ${response.status} - ${text}`);
            }

            const data = await response.json();
            await connectToRoom(data.data.token);
        } catch (err: any) {
            console.error('❌ Error getting token:', err);
            Alert.alert('Error', err.message);
            setAgentState('listening');
            setAudioLevel(0);
        }
    };

    const handleDisconnect = async () => {
        if (room) {
            if (localTrack) {
                localTrack.stop();
            }
            room.disconnect();
            setRoom(null);
            setConnected(false);
            setLocalTrack(null);
            setAgentState('listening');
            setAudioLevel(0);
            audioLevelSmoothRef.current = 0;
            setTranscript([]);
            setCurrentUserText('');
            setCurrentAgentText('');
            await stopAudioSession();
        }
    };

    const handleMuteToggle = () => {
        if (localTrack) {
            if (muted) {
                localTrack.unmute();
            } else {
                localTrack.mute();
            }
            setMuted(!muted);
        }
    };

    useEffect(() => {
        return () => {
            if (room) {
                room.disconnect();
            }
            stopAudioSession();
        };
    }, [room]);

    const getStateText = () => {
        switch (agentState) {
            case 'connecting':
                return 'Connecting...';
            case 'initializing':
                return 'Getting ready...';
            case 'listening':
                return 'Listening';
            case 'speaking':
                return 'Speaking';
            case 'thinking':
                return 'Thinking';
            default:
                return 'Ready';
        }
    };

    const getDeviceLabel = () => {
        switch (currentDevice) {
            case 'bluetooth':
                return 'Bluetooth';
            case 'headphones':
                return 'Headphones';
            case 'earpiece':
                return 'Phone';
            case 'speaker':
                return 'Speaker';
            default:
                return 'Speaker';
        }
    };

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            {/* Transcript Area */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.transcriptContainer}
                contentContainerStyle={styles.transcriptContent}
                showsVerticalScrollIndicator={false}
            >
                {transcript.length === 0 && !connected && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>Start a conversation</Text>
                        <Text style={styles.emptySubtitle}>
                            Tap the button below to begin talking with Alli
                        </Text>
                    </View>
                )}

                {transcript.length === 0 && connected && (
                    <View style={styles.suggestionsContainer}>
                        <Text style={styles.suggestionsTitle}>Try asking:</Text>
                        {suggestedQuestions.map((question, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.suggestionChip}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.suggestionText}>{question}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {transcript.map((item) => (
                    <View
                        key={item.id}
                        style={[
                            styles.messageContainer,
                            item.speaker === 'user' ? styles.userMessage : styles.agentMessage,
                        ]}
                    >
                        <Text style={styles.speakerLabel}>
                            {item.speaker === 'user' ? 'You' : 'Alli'}
                        </Text>
                        <Text style={styles.messageText}>{item.text}</Text>
                    </View>
                ))}

                {currentUserText && (
                    <View style={[styles.messageContainer, styles.userMessage, styles.liveMessage]}>
                        <Text style={styles.speakerLabel}>You</Text>
                        <Text style={styles.messageText}>{currentUserText}</Text>
                    </View>
                )}

                {currentAgentText && (
                    <View style={[styles.messageContainer, styles.agentMessage, styles.liveMessage]}>
                        <Text style={styles.speakerLabel}>Alli</Text>
                        <Text style={styles.messageText}>{currentAgentText}</Text>
                    </View>
                )}
            </ScrollView>

            {/* Visualizer Section */}
            <View style={styles.visualizerSection}>
                <QuestionDisplay
                    text={currentUserText || currentAgentText || (transcript.length > 0 ? transcript[transcript.length - 1].text : '')}
                    state={agentState}
                />

                <View style={styles.visualizerContent}>
                    <ClaudeOrbVisualizer state={agentState} audioLevel={audioLevel} />

                    <Text style={styles.stateText}>{getStateText()}</Text>

                    {connected && (
                        <Text style={styles.deviceText}>{getDeviceLabel()}</Text>
                    )}
                </View>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomSection}>
                {!connected ? (
                    <TouchableOpacity
                        style={styles.mainButton}
                        onPress={handleConnect}
                        activeOpacity={0.8}
                    >
                        <View style={styles.buttonContent}>
                            <Text style={styles.buttonText}>Start conversation</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.connectedControls}>
                        <TouchableOpacity
                            style={[styles.iconButton, muted && styles.iconButtonActive]}
                            onPress={handleMuteToggle}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.iconButtonText}>{muted ? '🔇' : '🎤'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.mainButton, styles.endButton]}
                            onPress={handleDisconnect}
                            activeOpacity={0.8}
                        >
                            <View style={styles.buttonContent}>
                                <Text style={styles.buttonText}>End conversation</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Animated.View>
    );
};

export default VoiceAgentVisualizer;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    transcriptContainer: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
    },
    transcriptContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
    },
    emptyTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 12,
        letterSpacing: -1,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 50,
    },
    suggestionsContainer: {
        marginTop: 30,
    },
    suggestionsTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    suggestionChip: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 24,
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    suggestionText: {
        fontSize: 15,
        color: '#334155',
        fontWeight: '500',
    },
    messageContainer: {
        marginBottom: 24,
        maxWidth: '85%',
    },
    userMessage: {
        alignSelf: 'flex-end',
    },
    agentMessage: {
        alignSelf: 'flex-start',
    },
    liveMessage: {
        opacity: 0.65,
    },
    speakerLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#1E293B',
        fontWeight: '400',
    },
    visualizerSection: {
        alignItems: 'center',
        // paddingVertical: 25,
        paddingHorizontal: 20,
        backgroundColor: '#FAFBFC',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        minHeight: 300,
    },
    visualizerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    orbContainer: {
        width: 180,
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 100
    },
    particle: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    glowRing: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
    },
    decorativeRing: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 1.5,
        borderStyle: 'dashed',
    },
    mainOrb: {
        width: 110,
        height: 110,
        borderRadius: 55,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 12,
    },
    orbHighlight: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        position: 'absolute',
        top: 18,
        left: 18,
    },
    orbCore: {
        width: 50,
        height: 50,
        borderRadius: 25,
        position: 'absolute',
    },
    audioRing: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 2,
    },
    stateText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginTop: 60,
    },
    questionDisplay: {
        width: '100%',
        paddingHorizontal: 30,
        marginBottom: 40,
        alignItems: 'center',
    },
    questionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#B9A68D',
        letterSpacing: 1.5,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    questionText: {
        fontSize: 22,
        fontWeight: '600',
        color: '#1E293B',
        textAlign: 'center',
        lineHeight: 30,
        letterSpacing: -0.5,
    },
    blobLayer: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
    },
    deviceText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '400',
        marginTop: 2,
    },
    bottomSection: {
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 36 : 20,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    connectedControls: {
        gap: 12,
    },
    mainButton: {
        backgroundColor: '#B9A68D',
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#B9A68D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
        marginTop: 12,
    },
    endButton: {
        backgroundColor: '#E97451',
        shadowColor: '#E97451',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        letterSpacing: -0.2,
    },
    iconButton: {
        height: 54,
        borderRadius: 27,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
    },
    iconButtonActive: {
        backgroundColor: '#FEE2E2',
        borderColor: '#FCA5A5',
    },
    iconButtonText: {
        fontSize: 24,
    },
});