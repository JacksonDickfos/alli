import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, Platform, PermissionsAndroid, StyleSheet } from 'react-native';
import { Room, createLocalAudioTrack, RoomEvent, LocalAudioTrack, RemoteAudioTrack } from 'livekit-client';
import { registerGlobals, AudioSession } from '@livekit/react-native';

// Register WebRTC globals (required for LiveKit)
registerGlobals();

const LIVEKIT_URL = 'wss://alli-h8mq663x.livekit.cloud';
const BACKEND_URL = 'http://62.72.35.123:8003/start_call2';

const VoiceAgent = () => {
    const [room, setRoom] = useState<Room | null>(null);
    const [connected, setConnected] = useState(false);
    const [muted, setMuted] = useState(false);
    const [activeSpeaker, setActiveSpeaker] = useState<string>('Nobody');
    const [localTrack, setLocalTrack] = useState<LocalAudioTrack | null>(null);
    const [speakerOn, setSpeakerOn] = useState(true);

    // Request microphone permission (Android)
    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    };

    // Configure audio session using LiveKit's AudioSession
    const setupAudioSession = async () => {
        try {
            // Configure for bidirectional communication (default)
            await AudioSession.configureAudio({
                android: {
                    preferredOutputList: ['speaker'], // Use speaker by default
                },
                ios: {
                    defaultToSpeaker: true,
                }
            });

            // Start the audio session
            await AudioSession.startAudioSession();

            console.log('🔊 AudioSession configured and started');
            setSpeakerOn(true);
        } catch (err) {
            console.error('❌ Error configuring AudioSession:', err);
        }
    };

    // Stop audio session
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
            // Setup audio session BEFORE connecting
            await setupAudioSession();

            const r = new Room({
                adaptiveStream: true,
                dynacast: true,
            });

            // Remote audio track subscription
            r.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                if (track.kind === 'audio') {
                    console.log('🔊 Agent audio subscribed:', participant.identity);
                    console.log('   - Track sid:', track.sid);
                    console.log('   - Publication muted:', publication.isMuted);

                    const audioTrack = track as RemoteAudioTrack;

                    // The track will automatically play through LiveKit's audio session
                    console.log('🎧 Audio ready:', {
                        enabled: audioTrack.mediaStreamTrack.enabled,
                        readyState: audioTrack.mediaStreamTrack.readyState
                    });

                    // Monitor audio levels
                    audioTrack.on('audioLevelChanged', level => {
                        if (level > 0.05) {
                            console.log('🗣️ Agent speaking, level:', level.toFixed(3));
                            setActiveSpeaker(participant.identity);
                        }
                    });
                }
            });

            // Track mute/unmute events
            r.on(RoomEvent.TrackMuted, (publication, participant) => {
                console.log('🔇 Track muted:', participant.identity);
            });

            r.on(RoomEvent.TrackUnmuted, (publication, participant) => {
                console.log('🔊 Track unmuted:', participant.identity);
            });

            // Track unsubscription
            r.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
                if (track.kind === 'audio') {
                    console.log('🔇 Agent audio unsubscribed:', participant.identity);
                }
            });

            // Local track speaking detection
            r.on(RoomEvent.LocalTrackPublished, trackPub => {
                const track = trackPub.track;
                if (track && track.kind === 'audio') {
                    console.log('🎤 Local track published');
                    track.on('audioLevelChanged', level => {
                        if (level > 0.05) {
                            setActiveSpeaker('You');
                        }
                    });
                }
            });

            // Room connection events
            r.on(RoomEvent.Connected, () => {
                console.log('✅ Room connected');
                setConnected(true);
            });

            r.on(RoomEvent.Disconnected, (reason) => {
                console.log('❌ Room disconnected, reason:', reason);
                setConnected(false);
                setActiveSpeaker('Nobody');
            });

            r.on(RoomEvent.Reconnecting, () => {
                console.log('🔄 Reconnecting...');
            });

            r.on(RoomEvent.Reconnected, () => {
                console.log('✅ Reconnected');
            });

            r.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
                console.log('📶 Connection quality:', quality, participant.identity);
            });

            // Participant events
            r.on(RoomEvent.ParticipantConnected, (participant) => {
                console.log('👤 Participant connected:', participant.identity);
            });

            r.on(RoomEvent.ParticipantDisconnected, (participant) => {
                console.log('👤 Participant disconnected:', participant.identity);
            });

            // Data messages
            r.on(RoomEvent.DataReceived, (payload, participant) => {
                const text = new TextDecoder().decode(payload);
                console.log('💬 Data from', participant?.identity, ':', text);
            });

            // Create local audio track with audio processing
            const track = await createLocalAudioTrack({
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            });
            setLocalTrack(track);
            console.log('🎤 Local audio track created');

            // Connect to room with local track
            await r.connect(LIVEKIT_URL, token);
            console.log('✅ Connected to room');

            // Publish local audio track
            await r.localParticipant.publishTrack(track);
            console.log('✅ Local track published');

            setRoom(r);
        } catch (err: any) {
            console.error('LiveKit connection error:', err);
            Alert.alert('Connection Error', err.message);
            await stopAudioSession();
        }
    };

    // Connect button
    const handleConnect = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
            Alert.alert('Permission Denied', 'Microphone permission is required');
            return;
        }

        try {
            const requestBody = {
                agent_id: '123',
                roomName: `room-123-${Date.now()}`,
                participantName: `user-${Date.now()}`,
            };

            console.log('📤 Sending request to backend:', BACKEND_URL);
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
            console.log('✅ Token received');

            await connectToRoom(data.data.token);
        } catch (err: any) {
            console.error('❌ Error getting token:', err);
            Alert.alert('Error', err.message);
        }
    };

    // Disconnect button
    const handleDisconnect = async () => {
        if (room) {
            // Stop local track
            if (localTrack) {
                localTrack.stop();
            }

            // Disconnect from room
            room.disconnect();
            setRoom(null);
            setConnected(false);
            setActiveSpeaker('Nobody');
            setLocalTrack(null);

            // Stop audio session
            await stopAudioSession();
        }
    };

    // Mute/unmute microphone
    const handleMuteToggle = () => {
        if (localTrack) {
            if (muted) {
                localTrack.unmute();
            } else {
                localTrack.mute();
            }
            setMuted(!muted);
            console.log(muted ? '🔊 Unmuted' : '🔇 Muted');
        }
    };

    // Toggle speaker/earpiece
    const toggleSpeaker = async () => {
        try {
            const newState = !speakerOn;

            await AudioSession.configureAudio({
                android: {
                    preferredOutputList: newState ? ['speaker'] : ['earpiece'],
                },
                ios: {
                    defaultToSpeaker: newState,
                }
            });

            setSpeakerOn(newState);
            console.log('🔊 Audio output:', newState ? 'Speaker' : 'Earpiece');
        } catch (err) {
            console.error('❌ Error toggling speaker:', err);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (room) {
                room.disconnect();
            }
            stopAudioSession();
        };
    }, [room]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Voice Agent</Text>
            <Text style={styles.status}>{connected ? '🟢 Connected' : '🔴 Disconnected'}</Text>

            {connected && (
                <>
                    <Text style={styles.speaker}>🗣️ Active: {activeSpeaker}</Text>
                    <Text style={styles.debug}>
                        Output: {speakerOn ? '🔊 Speaker' : '📱 Earpiece'}
                    </Text>
                </>
            )}

            <View style={styles.buttonContainer}>
                <Button
                    title="🎙️ Connect"
                    onPress={handleConnect}
                    disabled={connected}
                    color="#4CAF50"
                />
                <Button
                    title="❌ Disconnect"
                    onPress={handleDisconnect}
                    disabled={!connected}
                    color="#f44336"
                />
                <Button
                    title={muted ? '🔊 Unmute' : '🔇 Mute'}
                    onPress={handleMuteToggle}
                    disabled={!connected}
                    color="#2196F3"
                />
                <Button
                    title={speakerOn ? '📱 Earpiece' : '🔊 Speaker'}
                    onPress={toggleSpeaker}
                    disabled={!connected}
                    color="#FF9800"
                />
            </View>
        </View>
    );
}

export default VoiceAgent;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    status: {
        fontSize: 16,
        marginBottom: 20,
        color: '#666',
    },
    speaker: {
        fontSize: 18,
        marginBottom: 10,
        color: '#333',
        fontWeight: '600',
    },
    debug: {
        fontSize: 12,
        marginBottom: 20,
        color: '#999',
        fontFamily: 'monospace',
    },
    buttonContainer: {
        gap: 15,
        width: '100%',
        marginTop: 20,
    },
});