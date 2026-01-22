import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, Alert, Platform, PermissionsAndroid, StyleSheet } from 'react-native';
import { Room, createLocalAudioTrack, RoomEvent, LocalAudioTrack, RemoteTrack, RemoteAudioTrack } from 'livekit-client';
import { registerGlobals, RTCView, mediaDevices } from 'react-native-webrtc';
import { MediaStream } from 'react-native-webrtc';

// Polyfill for React Native
if (typeof navigator === 'undefined') global.navigator = {} as any;
if (!navigator.userAgent) navigator.userAgent = 'ReactNative';

registerGlobals();

// Replace with your LiveKit URL and backend
const LIVEKIT_URL = 'wss://alli-h8mq663x.livekit.cloud';
const BACKEND_URL = 'http://62.72.35.123:8003/start_call2';

const VoiceAgent = () => {
    const [room, setRoom] = useState<Room | null>(null);
    const [connected, setConnected] = useState(false);
    const [muted, setMuted] = useState(false);
    const [activeSpeaker, setActiveSpeaker] = useState<string>('Nobody');
    const [localTrack, setLocalTrack] = useState<LocalAudioTrack | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

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

    // Set audio output to speaker
    const setAudioOutputToSpeaker = async () => {
        try {
            const devices = await mediaDevices.enumerateDevices();
            console.log('📱 Available audio devices:', devices.filter(d => d.kind === 'audiooutput'));
            console.log('🔊 Audio routing configured');
        } catch (err) {
            console.error('❌ Error setting audio output:', err);
        }
    };

    // Play audio track in React Native
    const playAudioTrack = (track: RemoteAudioTrack) => {
        try {
            // Get the underlying MediaStreamTrack
            const mediaStreamTrack = track.mediaStreamTrack;

            // Ensure track is enabled
            if (!mediaStreamTrack.enabled) {
                mediaStreamTrack.enabled = true;
                console.log('✅ Enabled audio track');
            }

            // Create a MediaStream and add the track
            const stream = new MediaStream();
            stream.addTrack(mediaStreamTrack);

            // Set the stream to state
            setRemoteStream(stream);

            console.log('🎧 Audio stream ready:', stream.id);
            console.log('   - Active:', stream.active);
            console.log('   - Track enabled:', mediaStreamTrack.enabled);
            console.log('   - Track muted:', mediaStreamTrack.muted);
            console.log('   - Track readyState:', mediaStreamTrack.readyState);

        } catch (err) {
            console.error('❌ Error playing audio:', err);
        }
    };

    const connectToRoom = async (token: string) => {
        try {
            // Set audio to speaker
            await setAudioOutputToSpeaker();

            const r = new Room({
                adaptiveStream: true,
                dynacast: true,
                rtcConfig: { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] },
            });

            // ✅ Remote audio tracks
            r.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                if (track.kind === 'audio') {
                    console.log('🔊 Agent audio subscribed:', participant.identity);
                    console.log('   - Track sid:', track.sid);
                    console.log('   - Publication muted:', publication.isMuted);

                    // Play the audio
                    playAudioTrack(track as RemoteAudioTrack);

                    // Listen for audio level changes
                    track.on('audioLevelChanged', level => {
                        if (level > 0.05) {
                            console.log('🗣️ Agent speaking, level:', level.toFixed(3));
                            setActiveSpeaker(participant.identity);
                        }
                    });
                }
            });

            // Handle mute changes
            r.on(RoomEvent.TrackMuted, (publication, participant) => {
                console.log('🔇 Track muted:', publication.trackSid, participant.identity);
            });

            r.on(RoomEvent.TrackUnmuted, (publication, participant) => {
                console.log('🔊 Track unmuted:', publication.trackSid, participant.identity);
            });

            // ✅ Handle track unsubscription
            r.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
                if (track.kind === 'audio') {
                    console.log('🔇 Agent audio unsubscribed:', participant.identity);
                    setRemoteStream(null);
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

            // Room events
            r.on(RoomEvent.Connected, () => {
                console.log('✅ Room connected');
                setConnected(true);
            });

            r.on(RoomEvent.Disconnected, () => {
                console.log('❌ Room disconnected');
                setConnected(false);
                setActiveSpeaker('Nobody');
                setRemoteStream(null);
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

            // Data received (agent might send text)
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

            // Connect with local track
            await r.connect(LIVEKIT_URL, token, { tracks: [track] });
            console.log('✅ Connected with local track');

            setRoom(r);
        } catch (err: any) {
            console.error('LiveKit connection error:', err);
            Alert.alert('Connection Error', err.message);
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
    const handleDisconnect = () => {
        if (room) {
            // Clean up local track
            if (localTrack) {
                localTrack.stop();
            }

            room.disconnect();
            setRoom(null);
            setConnected(false);
            setActiveSpeaker('Nobody');
            setLocalTrack(null);
            setRemoteStream(null);
        }
    };

    // Mute/unmute
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

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Voice Agent</Text>
            <Text style={styles.status}>{connected ? '🟢 Connected' : '🔴 Disconnected'}</Text>

            {connected && (
                <>
                    <Text style={styles.speaker}>🗣️ {activeSpeaker}</Text>
                    {remoteStream && (
                        <Text style={styles.debug}>
                            Stream: {remoteStream.active ? '✅ Active' : '❌ Inactive'}
                        </Text>
                    )}
                </>
            )}

            {/* Hidden RTCView for audio playback - CRITICAL for audio routing */}
            {remoteStream && (
                <RTCView
                    streamURL={remoteStream.toURL()}
                    style={{ width: 1, height: 1, position: 'absolute' }}
                    objectFit="cover"
                    mirror={false}
                />
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