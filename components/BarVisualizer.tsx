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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type AgentState = 'connecting' | 'initializing' | 'listening' | 'speaking' | 'thinking';

const getStateColor = (state: AgentState) => {
    switch (state) {
        case 'connecting':
            return { primary: '#00f3ff', secondary: '#007ca3' }; // Cyan
        case 'initializing':
            return { primary: '#b026ff', secondary: '#5e008f' }; // Electric Purple
        case 'listening':
            return { primary: '#00ff9d', secondary: '#008f58' }; // Neon Green
        case 'speaking':
            return { primary: '#ff0055', secondary: '#990033' }; // Neon Red/Pink
        case 'thinking':
            return { primary: '#ffea00', secondary: '#b39500' }; // Electric Yellow
        default:
            return { primary: '#5c6c7f', secondary: '#2a3b4c' }; // Slate Gray
    }
};

// Futuristic Tech Orb Visualizer
const CircularOrbVisualizer = ({
    state,
    audioLevel = 0,
    particleCount = 12, // Reduced for tech markers
}: {
    state: AgentState;
    audioLevel: number;
    particleCount?: number;
}) => {
    // Animation Refs
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const rotateAnimReverse = useRef(new Animated.Value(0)).current;

    // Core state refs
    const coreScale = useRef(new Animated.Value(1)).current;
    const coreOpacity = useRef(new Animated.Value(0.8)).current;
    const ringScale = useRef(new Animated.Value(1)).current;

    // Tech markers
    const markers = useRef(
        Array.from({ length: particleCount }, () => ({
            scale: new Animated.Value(1),
            opacity: new Animated.Value(0.3),
        }))
    ).current;

    useEffect(() => {
        // Continuous rotation loops
        const loop = Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 10000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        const loopReverse = Animated.loop(
            Animated.timing(rotateAnimReverse, {
                toValue: 1,
                duration: 8000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );

        loop.start();
        loopReverse.start();

        return () => {
            rotateAnim.stopAnimation();
            rotateAnimReverse.stopAnimation();
        };
    }, []);

    useEffect(() => {
        let animationFrame: number;
        const startTime = Date.now();

        const animate = () => {
            const time = (Date.now() - startTime) / 1000;

            // Audio reactive core pulsing
            const isSpeaking = state === 'speaking' || state === 'thinking';
            const baseScale = isSpeaking ? 1.0 : 0.8;
            const audioPulse = audioLevel * 0.4;
            const sinePulse = Math.sin(time * 3) * 0.05;

            coreScale.setValue(baseScale + audioPulse + sinePulse);

            // Ring expansion on loud audio
            ringScale.setValue(1 + audioLevel * 0.2);

            // Tech marker animation
            markers.forEach((marker, i) => {
                const offset = (i / particleCount) * Math.PI * 2;
                if (isSpeaking) {
                    // Active data visuals
                    const randomFlux = Math.sin(time * 10 + offset * 5) * 0.5 + 0.5;
                    marker.opacity.setValue(0.3 + audioLevel + randomFlux * 0.4);
                    marker.scale.setValue(1 + audioLevel * 1.5);
                } else if (state === 'connecting') {
                    // Scanning effect
                    const scan = Math.sin(time * 5 + offset) * 0.5 + 0.5;
                    marker.opacity.setValue(scan);
                    marker.scale.setValue(1);
                } else {
                    // Idle pulse
                    marker.opacity.setValue(0.2 + Math.sin(time + offset) * 0.1);
                    marker.scale.setValue(1);
                }
            });

            animationFrame = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
    }, [state, audioLevel, particleCount]);

    const colors = getStateColor(state);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const spinReverse = rotateAnimReverse.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg'],
    });

    return (
        <View style={styles.orbContainer}>
            {/* Outer Tech Ring (Static) */}
            <View style={[styles.techRingStatic, { borderColor: colors.secondary, opacity: 0.2 }]} />

            {/* Rotating Data Ring 1 */}
            <Animated.View
                style={[
                    styles.techRingRotating,
                    {
                        borderColor: colors.primary,
                        transform: [{ rotate: spin }, { scale: ringScale }],
                        opacity: 0.5,
                    },
                ]}
            />

            {/* Rotating Data Ring 2 (Opposite) */}
            <Animated.View
                style={[
                    styles.techRingRotatingOblique,
                    {
                        borderColor: colors.primary,
                        transform: [{ rotate: spinReverse }, { scale: Animated.multiply(ringScale, 0.9) }],
                        opacity: 0.3,
                    },
                ]}
            />

            {/* Core Energy Source */}
            <Animated.View
                style={[
                    styles.coreOrb,
                    {
                        transform: [{ scale: coreScale }],
                        backgroundColor: colors.primary,
                        opacity: coreOpacity,
                        shadowColor: colors.primary,
                    },
                ]}
            >
                <View style={[styles.coreInner, { backgroundColor: '#fff', opacity: 0.5 }]} />
            </Animated.View>

            {/* Floating Tech Markers */}
            {markers.map((marker, i) => {
                const angleRad = (i / particleCount) * 2 * Math.PI;
                const radius = 100;
                return (
                    <Animated.View
                        key={i}
                        style={[
                            styles.techMarker,
                            {
                                backgroundColor: colors.secondary,
                                opacity: marker.opacity,
                                transform: [
                                    { translateX: Math.cos(angleRad) * radius },
                                    { translateY: Math.sin(angleRad) * radius },
                                    { scale: marker.scale },
                                ],
                            },
                        ]}
                    />
                );
            })}
        </View>
    );
};

// Digital Spectrum Visualizer
const WaveformVisualizer = ({
    state,
    audioLevel = 0,
    barCount = 30, // Reduced for blockier, digital look
}: {
    state: AgentState;
    audioLevel: number;
    barCount?: number;
}) => {
    const bars = useRef(
        Array.from({ length: barCount }, () => new Animated.Value(4))
    ).current;

    useEffect(() => {
        let animationFrame: number;
        const startTime = Date.now();

        const animate = () => {
            const time = (Date.now() - startTime) / 1000;
            const isActive = state === 'speaking' || state === 'thinking';

            bars.forEach((bar, i) => {
                const position = i / (barCount - 1); // 0 to 1
                const centerDist = Math.abs(position - 0.5); // 0 at center, 0.5 at edges

                if (isActive) {
                    // Digital spectrum calculation
                    const freqWave = Math.sin(time * 5 + i * 0.5);
                    const audioBoost = audioLevel * 80 * (1 - centerDist); // More movement in center
                    let height = 6 + Math.abs(freqWave) * 10 + Math.random() * audioBoost;
                    height = Math.min(100, Math.max(6, height));

                    // Snap to grid (digital stepped look)
                    height = Math.round(height / 6) * 6;

                    bar.setValue(height);
                } else if (state === 'connecting') {
                    // Knight Rider scanner effect
                    const scanPos = (Math.sin(time * 3) + 1) / 2; // 0 to 1
                    const distCheck = Math.abs(position - scanPos);
                    const isActive = distCheck < 0.15;
                    bar.setValue(isActive ? 30 : 6);
                } else {
                    // Low idle hum
                    bar.setValue(6 + (i % 2) * 2);
                }
            });

            animationFrame = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
    }, [state, audioLevel, barCount]);

    const colors = getStateColor(state);

    return (
        <View style={styles.waveformContainer}>
            {bars.map((bar, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.waveBar,
                        {
                            height: bar,
                            backgroundColor: colors.primary,
                            opacity: 0.8,
                            width: 6, // Thicker bars
                            marginHorizontal: 2,
                            borderRadius: 1, // Sharp corners
                            shadowColor: colors.primary,
                            shadowOpacity: 0.5,
                            shadowRadius: 4,
                        },
                    ]}
                />
            ))}
            {/* Mirror Reflection Effect */}
            <View style={styles.waveformMirrorOverlay} />
        </View>
    );
};

const VoiceAgentVisualizer = () => {
    const [room, setRoom] = useState<Room | null>(null);
    const [connected, setConnected] = useState(false);
    const [muted, setMuted] = useState(false);
    const [localTrack, setLocalTrack] = useState<LocalAudioTrack | null>(null);
    const [speakerOn, setSpeakerOn] = useState(true);
    const [agentState, setAgentState] = useState<AgentState>('listening');
    const [audioLevel, setAudioLevel] = useState(0);
    const [visualizerMode, setVisualizerMode] = useState<'orb' | 'waveform'>('orb');

    const audioLevelSmoothRef = useRef(0);
    const lastSpeakingTime = useRef(Date.now());

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
            await AudioSession.configureAudio({
                android: {
                    preferredOutputList: ['speaker'],
                },
                ios: {
                    defaultToSpeaker: true,
                },
            });
            await AudioSession.startAudioSession();
            console.log('🔊 AudioSession configured and started');
            setSpeakerOn(true);
        } catch (err) {
            console.error('❌ Error configuring AudioSession:', err);
        }
    };

    const stopAudioSession = async () => {
        try {
            await AudioSession.stopAudioSession();
            console.log('🔇 AudioSession stopped');
        } catch (err) {
            console.error('❌ Error stopping AudioSession:', err);
        }
    };

    const connectToRoom = async (token: string) => {
        try {
            console.log('🔌 connectToRoom called, initializing...');
            setAgentState('connecting');
            await setupAudioSession();

            const r = new Room({
                adaptiveStream: true,
                dynacast: true,
            });

            r.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                console.log('📡 TrackSubscribed event:', { kind: track.kind, sid: track.sid, participant: participant.identity });
                if (track.kind === 'audio') {
                    console.log('🔊 Agent audio subscribed:', participant.identity);
                    const audioTrack = track as RemoteAudioTrack;
                    audioTrack.setVolume(1.0);

                    console.log('🎧 Remote Audio Track Details:', {
                        enabled: audioTrack.mediaStreamTrack.enabled,
                        readyState: audioTrack.mediaStreamTrack.readyState,
                        muted: audioTrack.isMuted,
                        streamId: audioTrack.mediaStreamTrack.id
                    });

                    audioTrack.on('audioLevelChanged', (level: number) => {
                        // Log only significant levels to avoid spam, but enough to see activity
                        if (level > 0.01) {
                            console.log('📊 Agent Audio Level > 0.01:', level);
                        }

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

                    audioTrack.on('muted', () => console.log('🔇 Remote track muted'));
                    audioTrack.on('unmuted', () => console.log('🔊 Remote track unmuted'));
                }
            });

            r.on(RoomEvent.LocalTrackPublished, (trackPub) => {
                const track = trackPub.track;
                console.log('🎤 LocalTrackPublished:', { kind: track?.kind });
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
                console.log('✅ Room connected successfully');
                setConnected(true);
                setAgentState('initializing');
                setTimeout(() => {
                    console.log('🕒 Initializing timeout done, switching to listening');
                    setAgentState('listening');
                    setAudioLevel(0);
                }, 1000);
            });

            r.on(RoomEvent.Disconnected, (reason?: any) => {
                console.log('❌ Room disconnected, reason:', reason);
                setConnected(false);
                setAgentState('listening');
                setAudioLevel(0);
                audioLevelSmoothRef.current = 0;
            });

            r.on(RoomEvent.Reconnecting, () => console.log('🔄 Room reconnecting...'));
            r.on(RoomEvent.Reconnected, () => console.log('✅ Room reconnected'));

            setAgentState('initializing');
            const track = await createLocalAudioTrack({
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            });
            console.log('🎤 Local audio track created:', track.sid);
            setLocalTrack(track);

            console.log('🔗 Connecting to LiveKit URL:', LIVEKIT_URL);
            await r.connect(LIVEKIT_URL, token);
            console.log('✅ Connected to LiveKit, publishing track...');
            await r.localParticipant.publishTrack(track);
            console.log('✅ Local track published');

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

    const toggleSpeaker = async () => {
        try {
            const newState = !speakerOn;
            await AudioSession.configureAudio({
                android: {
                    preferredOutputList: newState ? ['speaker'] : ['earpiece'],
                },
                ios: {
                    defaultToSpeaker: newState,
                },
            });
            setSpeakerOn(newState);
        } catch (err) {
            console.error('❌ Error toggling speaker:', err);
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

    const getStateInfo = () => {
        const colors = getStateColor(agentState);
        switch (agentState) {
            case 'connecting':
                return { icon: '⟳', label: 'ESTABLISHING_LINK...', sublabel: 'SECURE_CHANNEL', color: colors.primary };
            case 'initializing':
                return { icon: '⚡', label: 'SYSTEM_INIT...', sublabel: 'LOADING_MODULES', color: colors.primary };
            case 'listening':
                return { icon: '⏺', label: 'LISTENING', sublabel: 'AWAITING_INPUT', color: colors.primary };
            case 'speaking':
                return { icon: '⏵', label: 'TRANSMITTING', sublabel: 'DATA_OUT', color: colors.primary };
            case 'thinking':
                return { icon: '⌬', label: 'PROCESSING', sublabel: 'ANALYZING_DATA', color: colors.primary };
            default:
                return { icon: '⏹', label: 'STANDBY', sublabel: 'SYSTEM_READY', color: colors.primary };
        }
    };

    const stateInfo = getStateInfo();

    return (
        <View style={styles.container}>
            {/* Header / HUD Top */}
            <View style={styles.header}>
                <View style={styles.hudLine} />
                <Text style={styles.appTitle}>Alli: ONLINE</Text>
                <View style={styles.hudLine} />
                <TouchableOpacity
                    style={[styles.modeSwitch, { borderColor: stateInfo.color }]}
                    onPress={() => setVisualizerMode(visualizerMode === 'orb' ? 'waveform' : 'orb')}
                >
                    <Text style={styles.modeSwitchText}>
                        {visualizerMode === 'orb' ? '|||' : '◉'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Main Visualizer */}
            <View style={styles.visualizerSection}>
                <Text style={styles.stateIcon}>{stateInfo.icon}</Text>

                {visualizerMode === 'orb' ? (
                    <CircularOrbVisualizer state={agentState} audioLevel={audioLevel} particleCount={32} />
                ) : (
                    <WaveformVisualizer state={agentState} audioLevel={audioLevel} barCount={40} />
                )}

                <Text style={styles.stateLabel}>{stateInfo.label}</Text>
                <Text style={styles.stateSublabel}>{stateInfo.sublabel}</Text>

                {/* Audio level indicator: HUD Bar */}
                {connected && audioLevel > 0.05 && (
                    <View style={styles.audioLevelContainer}>
                        <View style={[styles.audioLevelBar, { borderColor: stateInfo.color }]}>
                            <Animated.View
                                style={[
                                    styles.audioLevelFill,
                                    {
                                        width: `${audioLevel * 100}%`,
                                        backgroundColor: agentState === 'speaking' ? '#f59e0b' : '#a78bfa',
                                    },
                                ]}
                            />
                        </View>
                    </View>
                )}
            </View>

            {/* Status Info */}
            <View style={styles.statusCard}>
                <View style={styles.statusRow}>
                    <View style={styles.statusItem}>
                        <Text style={styles.statusLabel}>Connection</Text>
                        <Text style={[styles.statusValue, { color: connected ? '#10b981' : '#ef4444' }]}>
                            {connected ? '● Connected' : '○ Disconnected'}
                        </Text>
                    </View>
                    {connected && (
                        <View style={styles.statusItem}>
                            <Text style={styles.statusLabel}>Audio Output</Text>
                            <Text style={styles.statusValue}>
                                {speakerOn ? '🔊 Speaker' : '📱 Earpiece'}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Control Buttons */}
            <View style={styles.controls}>
                {!connected ? (
                    <TouchableOpacity style={[styles.bigButton, styles.connectButton]} onPress={handleConnect}>
                        <Text style={styles.bigButtonIcon}>🎙️</Text>
                        <Text style={styles.bigButtonText}>Start Conversation</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        <View style={styles.smallButtonRow}>
                            <TouchableOpacity
                                style={[styles.smallButton, muted && styles.smallButtonActive]}
                                onPress={handleMuteToggle}
                            >
                                <Text style={styles.smallButtonIcon}>{muted ? '🔇' : '🎤'}</Text>
                                <Text style={styles.smallButtonText}>{muted ? 'Unmute' : 'Mute'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.smallButton} onPress={toggleSpeaker}>
                                <Text style={styles.smallButtonIcon}>{speakerOn ? '🔊' : '📱'}</Text>
                                <Text style={styles.smallButtonText}>{speakerOn ? 'Speaker' : 'Earpiece'}</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={[styles.bigButton, styles.endButton]} onPress={handleDisconnect}>
                            <Text style={styles.bigButtonIcon}>📵</Text>
                            <Text style={styles.bigButtonText}>End Conversation</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );
};

export default VoiceAgentVisualizer;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050510',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 243, 255, 0.3)',
        paddingBottom: 15,
    },
    hudLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(0, 243, 255, 0.3)',
        marginHorizontal: 10,
    },
    appTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#00f3ff',
        letterSpacing: 2,
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    },
    modeSwitch: {
        width: 40,
        height: 40,
        borderRadius: 4,
        borderWidth: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: '#fff',
    },
    modeSwitchText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
    visualizerSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 20,
        marginBottom: 20,
    },
    stateIcon: {
        fontSize: 32,
        marginBottom: 30,
        color: '#00f3ff',
        textShadowColor: 'rgba(0, 243, 255, 0.8)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    orbContainer: {
        width: 280,
        height: 280,
        justifyContent: 'center',
        alignItems: 'center',
    },
    techRingStatic: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 130,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    techRingRotating: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        borderWidth: 2,
        borderTopColor: 'transparent',
    },
    techRingRotatingOblique: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 1,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
    coreOrb: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 10,
    },
    coreInner: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    techMarker: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 1,
    },
    waveformContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 150,
        width: SCREEN_WIDTH - 60,
        gap: 2,
    },
    waveBar: {
        flex: 1,
    },
    waveformMirrorOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 20,
        backgroundColor: 'rgba(5, 10, 16, 0.8)',
    },
    stateLabel: {
        fontSize: 24,
        fontWeight: '900',
        color: '#ffffff',
        marginTop: 40,
        letterSpacing: 4,
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    },
    stateSublabel: {
        fontSize: 12,
        color: '#00f3ff',
        marginTop: 5,
        letterSpacing: 2,
        opacity: 0.7,
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    },
    audioLevelContainer: {
        width: 200,
        marginTop: 20,
    },
    audioLevelBar: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        overflow: 'hidden',
        borderWidth: 1,
    },
    audioLevelFill: {
        height: '100%',
        borderRadius: 2,
    },
    statusCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statusItem: {
        alignItems: 'center',
    },
    statusLabel: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statusValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#e2e8f0',
    },
    controls: {
        gap: 12,
    },
    smallButtonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    bigButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 16,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    connectButton: {
        backgroundColor: '#10b981',
    },
    endButton: {
        backgroundColor: '#ef4444',
    },
    bigButtonIcon: {
        fontSize: 24,
    },
    bigButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: 0.5,
    },
    smallButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    smallButtonActive: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: '#ef4444',
    },
    smallButtonIcon: {
        fontSize: 20,
    },
    smallButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
    },
});