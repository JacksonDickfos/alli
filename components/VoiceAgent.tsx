import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, Platform, PermissionsAndroid, StyleSheet } from 'react-native';
import { Room, createLocalAudioTrack, RoomEvent, LocalAudioTrack, RemoteTrack } from 'livekit-client';
import { registerGlobals } from 'react-native-webrtc';
import { MediaStream } from 'react-native-webrtc';

// Polyfill for React Native
if (typeof navigator === 'undefined') global.navigator = {} as any;
if (!navigator.userAgent) navigator.userAgent = 'ReactNative';

registerGlobals();

// Replace with your LiveKit URL and backend
const LIVEKIT_URL = 'wss://alli-h8mq663x.livekit.cloud';
const BACKEND_URL = 'http://62.72.35.123:8003/start_call2';

export default function VoiceAgent() {
    const [room, setRoom] = useState<Room | null>(null);
    const [connected, setConnected] = useState(false);
    const [muted, setMuted] = useState(false);
    const [activeSpeaker, setActiveSpeaker] = useState<string>('Nobody');
    const [localTrack, setLocalTrack] = useState<LocalAudioTrack | null>(null);

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

    // Play a MediaStream in React Native using LiveKit trick
    const playAudioTrack = (track: RemoteTrack | LocalAudioTrack) => {
        const stream = new MediaStream();
        stream.addTrack(track._mediaStreamTrack);
        // // @ts-ignore
        // const audioEl = new Audio();
        // // @ts-ignore
        // audioEl.srcObject = stream;
        // audioEl.play().catch(err => console.log('Audio play error:', err));
        console.log('🎧 Remote/Local track ready to play');
    };

    const connectToRoom = async (token: string) => {
        try {
            const r = new Room({
                adaptiveStream: true,
                dynacast: true,
                rtcConfig: { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] },
            });

            // Remote audio tracks
            r.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                if (track.kind === 'audio') {
                    console.log('🔊 Agent audio subscribed:', participant.identity);
                    // playAudioTrack(track);
                    // ✅ For React Native, just call play()
                    // track.play();
                    // console.log('🎧 Remote/Local track ready to play');
                    // Create MediaStream for RN
                    const stream = new MediaStream();
                    stream.addTrack(track._mediaStreamTrack); // access the underlying MediaStreamTrack
                    console.log('🎧 MediaStream created for agent audio');

                    // Listen for audioLevel changes to detect speaking
                    // track.on('audioLevelChanged', level => {
                    //     if (level > 0.05) setActiveSpeaker(participant.identity);
                    // });
                }
            });

            // Local track speaking detection
            r.on(RoomEvent.LocalTrackPublished, trackPub => {
                const track = trackPub.track;
                if (track && track.kind === 'audio') {
                    track.on('audioLevelChanged', level => {
                        if (level > 0.05) setActiveSpeaker('You');
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
            });
            r.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
                console.log('Connection quality:', quality, participant.identity);
            });

            // Create local audio track
            const track = await createLocalAudioTrack({ microphone: true });
            setLocalTrack(track);

            // Auto-play your own audio (optional)
            playAudioTrack(track);

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
            console.log('✅ Token received:', data.data.token);

            await connectToRoom(data.data.token);
        } catch (err: any) {
            console.error('❌ Error getting token:', err);
            Alert.alert('Error', err.message);
        }
    };

    // Disconnect button
    const handleDisconnect = () => {
        if (room) {
            room.disconnect();
            setRoom(null);
            setConnected(false);
            setActiveSpeaker('Nobody');
            setLocalTrack(null);
        }
    };

    // Mute/unmute
    const handleMuteToggle = () => {
        if (localTrack) {
            localTrack.enable(muted); // toggle
            setMuted(!muted);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Voice Agent {connected ? '(Connected)' : '(Disconnected)'}</Text>
            {connected && <Text style={styles.speaker}>Active Speaker: {activeSpeaker}</Text>}
            <Button title="Connect" onPress={handleConnect} disabled={connected} />
            <Button title="Disconnect" onPress={handleDisconnect} disabled={!connected} />
            <Button title={muted ? 'Unmute' : 'Mute'} onPress={handleMuteToggle} disabled={!connected} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    speaker: { fontSize: 16, marginBottom: 20, color: '#555' },
});
