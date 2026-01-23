import { StatusBar } from 'expo-status-bar';
import * as Camera from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { StyleSheet, Text, View, TextInput, Button, Alert, Image, TouchableOpacity, Platform, Animated, ScrollView, } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated as RNAnimated } from 'react-native';
import { isSupabaseConfigured, supabase, supabaseConfigError } from './lib/supabase';
import AlliChatScreen from './components/AlliChatScreen';
import VoiceAgent from './components/VoiceAgent';
// import { registerGlobals } from 'react-native-webrtc'; // ← Use this, not @livekit version

// registerGlobals();
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

type RootTabParamList = {
  Home: undefined;
  Nutrition: undefined;
  Alli: undefined;
  Goals: undefined;
  Account: undefined;
};

// Shared logo helper (used by Auth screens + Tab button)
function getLogoSource() {
  const v = Date.now();
  if (Platform.OS === 'web') {
    return { uri: `https://alli-nu.vercel.app/logo.png?v=${v}` } as any;
  }
  return { uri: `https://alli-nu.vercel.app/logo.png?v=${v}` } as any;
}

// HomeCard component with animation
function HomeCard({ title, image, onPress, index }: { title: string; image: any; onPress: () => void; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = React.useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 120,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        delay: index * 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, index]);

  const handlePressIn = () => {
    setPressed(true);
    Animated.spring(pressAnim, {
      toValue: 0.95,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setPressed(false);
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  // Placeholder subtitles for now
  const subtitles: { [key: string]: string } = {
    'Alli': 'Chat with your 24/7 dietitian',
    'Nutrition': 'Add to your food diary',
    'Goals': 'Track and monitor your progress',
    'Account': 'Weight preferences and medical info',
  };

  return (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ scale: scaleAnim }, { scale: pressAnim }],
      marginVertical: 9,
      alignSelf: 'flex-start',
      marginLeft: 24,
      width: '88%',
      height: 175,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: '#fff',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.35,
          shadowRadius: 32,
        },
        android: {
          elevation: 24,
        },
      }),
    }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ flex: 1 }}
        activeOpacity={0.8}
      >
        <Image source={image} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: 16,
        }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>{title}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{subtitles[title]}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
// Home Screen component
function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  // Placeholder for first name, replace with real user data if available
  const firstName = 'Alli';
  const cards = [
    {
      title: 'Alli',
      image: require('./assets/alli_card.png'),
      onPress: () => navigation.navigate('Alli'),
    },
    {
      title: 'Nutrition',
      image: require('./assets/nutrition_card.png'),
      onPress: () => navigation.navigate('Nutrition'),
    },
    {
      title: 'Goals',
      image: require('./assets/goals_card.png'),
      onPress: () => navigation.navigate('Goals'),
    },
  ];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingTop: 32, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { marginBottom: 18, fontSize: 22, alignSelf: 'flex-start', marginLeft: 24, color: '#000' }]}>Good to see you, {firstName}</Text>
        {cards.map((card, idx) => (
          <HomeCard key={card.title} title={card.title} image={card.image} onPress={card.onPress} index={idx} />
        ))}
        <StatusBar style="auto" />
      </ScrollView>
    </SafeAreaView>
  );
}

function NutritionScreen() {
  const [foodLog, setFoodLog] = useState<Array<{
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    serving_size: string;
    confidence: number;
    imageUri?: string;
  }>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraPermission, requestCameraPermission] = Camera.useCameraPermissions();

  useEffect(() => {
    // Best-effort permission request on mount (new expo-camera API)
    requestCameraPermission?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const takePicture = async () => {
    if (cameraPermission?.granted === false) {
      Alert.alert("Permission Required", "Camera permission is required to take food photos.");
      return;
    }
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission?.();
      if (res && !res.granted) {
        Alert.alert("Permission Required", "Camera permission is required to take food photos.");
        return;
      }
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await analyzeAndLogFood(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to take picture. Please try again.");
    }
  };

  const analyzeAndLogFood = async (imageUri: string) => {
    setIsAnalyzing(true);
    try {
      // Simulate AI analysis with realistic food data
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockAnalysis = {
        id: Date.now().toString(),
        name: "Mixed Salad with Chicken",
        calories: 320,
        protein: 28,
        carbs: 15,
        fat: 18,
        fiber: 4,
        sugar: 8,
        serving_size: "1 bowl",
        confidence: 0.87,
        imageUri
      };

      setFoodLog(prev => [mockAnalysis, ...prev]);
      Alert.alert("Food Logged!", `Analyzed: ${mockAnalysis.name}\nCalories: ${mockAnalysis.calories}\nConfidence: ${Math.round(mockAnalysis.confidence * 100)}%`);
    } catch (error) {
      console.error("Analysis error:", error);
      Alert.alert("Error", "Failed to analyze food. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const removeFood = (id: string) => {
    setFoodLog(prev => prev.filter(item => item.id !== id));
  };

  const totals = foodLog.reduce((acc, item) => ({
    calories: acc.calories + item.calories,
    protein: acc.protein + item.protein,
    carbs: acc.carbs + item.carbs,
    fat: acc.fat + item.fat,
    fiber: acc.fiber + item.fiber,
    sugar: acc.sugar + item.sugar,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: "#B9A68D", marginBottom: 20 }]}>Nutrition</Text>

        {/* Food Picture Analyzer */}
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.subtitle, { color: "#B9A68D", marginBottom: 15 }]}>Food Picture Analyzer</Text>
          <Text style={[styles.description, { marginBottom: 20 }]}>
            Take a photo of your food and get instant macronutrient analysis
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: isAnalyzing ? "#ccc" : "#B9A68D" }]}
            onPress={takePicture}
            disabled={isAnalyzing}
          >
            <Text style={styles.buttonText}>
              {isAnalyzing ? "Analyzing..." : "Take Food Photo"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Daily Totals */}
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.subtitle, { color: "#B9A68D", marginBottom: 15 }]}>Today's Totals</Text>
          <View style={styles.macroGrid}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(totals.calories)}</Text>
              <Text style={styles.macroLabel}>Calories</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(totals.protein)}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(totals.carbs)}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(totals.fat)}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Food Log */}
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.subtitle, { color: "#B9A68D", marginBottom: 15 }]}>Food Log</Text>
          {foodLog.length === 0 ? (
            <Text style={styles.emptyText}>No foods logged yet. Take a photo to get started!</Text>
          ) : (
            foodLog.map((item) => (
              <View key={item.id} style={styles.foodItem}>
                <View style={styles.foodItemContent}>
                  {item.imageUri && (
                    <Image source={{ uri: item.imageUri }} style={styles.foodImage} />
                  )}
                  <View style={styles.foodDetails}>
                    <Text style={styles.foodName}>{item.name}</Text>
                    <Text style={styles.foodServing}>{item.serving_size}</Text>
                    <Text style={styles.foodCalories}>{item.calories} cal</Text>
                    <View style={styles.foodMacros}>
                      <Text style={styles.macroText}>P: {item.protein}g</Text>
                      <Text style={styles.macroText}>C: {item.carbs}g</Text>
                      <Text style={styles.macroText}>F: {item.fat}g</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.removeButton} onPress={() => removeFood(item.id)}>
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
function NoticeBanner({ message, type = 'info' }: { message: string; type?: 'info' | 'success' | 'error' }) {
  if (!message) return null as any;
  const background = type === 'success' ? '#E7F6EC' : type === 'error' ? '#FDECEC' : '#F3F4F6';
  const color = type === 'success' ? '#0F5132' : type === 'error' ? '#842029' : '#111827';
  return (
    <View style={{ backgroundColor: background, padding: 12, borderRadius: 8, marginBottom: 12 }}>
      <Text style={{ color }}>{message}</Text>
    </View>
  );
}

function parseAuthMessageFromUrl(): { banner: string; type: 'success' | 'error' | 'info' } | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    const type = params.get('type');
    if (type === 'signup') {
      return { banner: 'Email confirmed. You can now log in.', type: 'success' };
    }
    if (type === 'recovery') {
      return { banner: 'Password reset link opened. Set a new password via the link sent to your email.', type: 'info' };
    }
    return null;
  } catch {
    return null;
  }
}

function SignUpScreen({ navigation, onAuth }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  const handleSignUp = async () => {
    if (!isSupabaseConfigured) {
      setNotice({ text: supabaseConfigError, type: 'error' });
      Alert.alert('Supabase not configured', supabaseConfigError);
      return;
    }
    const trimmedEmail = email.trim();
    const trimmedPassword = password;
    if (!trimmedEmail || !trimmedPassword) {
      setNotice({ text: 'Please enter an email and password.', type: 'error' });
      Alert.alert('Missing info', 'Please enter an email and password.');
      return;
    }
    setLoading(true);
    try {
      const redirect =
        Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).location?.origin
          ? `${(window as any).location.origin}/?type=signup`
          : undefined;
      const { error } = await supabase.auth.signUp({ email: trimmedEmail, password: trimmedPassword, options: { emailRedirectTo: redirect } as any });
      if (error) {
        setNotice({ text: error.message, type: 'error' });
        Alert.alert('Sign up failed', error.message);
      } else {
        setNotice({ text: 'We sent a confirmation email. Please check your inbox and then return to log in.', type: 'success' });
        Alert.alert('Success', 'Check your email to confirm your account, then log in.');
        navigation.navigate('Login');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Supabase signUp threw:', err);
      setNotice({ text: msg || 'Unexpected error creating your account.', type: 'error' });
      Alert.alert('Error', msg || 'Unexpected error creating your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.authContainer}>
      <Image
        source={getLogoSource()}
        style={{ width: 180, height: 180, resizeMode: 'contain', marginBottom: 20 }}
      />
      {notice && <NoticeBanner message={notice.text} type={notice.type} />}
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        inputMode="email"
        autoCorrect={false}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Signing Up...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>
      <Text style={styles.link} onPress={() => navigation.navigate('Login')}>Already have an account? Log In</Text>
      <StatusBar style="auto" />
    </View>
  );
}

function LoginScreen({ navigation, onAuth }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const msg = parseAuthMessageFromUrl();
    if (msg) {
      setNotice({ text: msg.banner, type: msg.type });
      if (msg.type === 'info' && msg.banner.toLowerCase().includes('password reset')) {
        setIsRecoveryMode(true);
      }
      if (typeof window !== 'undefined') {
        // Clean URL params so refresh doesn't keep re-triggering
        const url = new URL(window.location.href);
        url.searchParams.delete('type');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

  const handlePerformReset = async () => {
    const p1 = newPassword.trim();
    const p2 = confirmPassword.trim();
    if (!p1 || !p2) {
      setNotice({ text: 'Please enter and confirm your new password.', type: 'error' });
      Alert.alert('Missing info', 'Please enter and confirm your new password.');
      return;
    }
    if (p1 !== p2) {
      setNotice({ text: 'Passwords do not match. Please re-enter.', type: 'error' });
      Alert.alert('Passwords do not match', 'Please re-enter your new password twice.');
      return;
    }
    if (p1.length < 8) {
      setNotice({ text: 'Password must be at least 8 characters.', type: 'error' });
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ password: p1 });
      if (error) {
        setNotice({ text: error.message, type: 'error' });
        Alert.alert('Reset failed', error.message);
      } else {
        setNotice({ text: 'Password updated. You can now log in with your new password.', type: 'success' });
        Alert.alert('Success', 'Password updated. Please log in.');
        setIsRecoveryMode(false);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setNotice({ text: 'Unexpected error updating your password.', type: 'error' });
      Alert.alert('Error', 'Unexpected error updating your password.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password;
    if (!trimmedEmail || !trimmedPassword) {
      setNotice({ text: 'Please enter an email and password.', type: 'error' });
      Alert.alert('Missing info', 'Please enter an email and password.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password: trimmedPassword });
      if (error || !data.session) {
        setNotice({ text: error?.message || 'Email or password is incorrect.', type: 'error' });
        Alert.alert('Invalid credentials', error?.message || 'Email or password is incorrect.');
      } else {
        await AsyncStorage.setItem('token', data.session.access_token);
        setNotice({ text: 'Logged in successfully.', type: 'success' });
        onAuth();
        Alert.alert('Success', 'Logged in!');
      }
    } catch (err) {
      setNotice({ text: 'Unexpected error logging in.', type: 'error' });
      Alert.alert('Error', 'Unexpected error logging in.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setNotice({ text: 'Please enter your email above first, then tap Forgot Password again.', type: 'info' });
      Alert.alert('Enter email', 'Please enter your email above first, then tap Forgot Password again.');
      return;
    }
    try {
      const redirect =
        Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).location?.origin
          ? `${(window as any).location.origin}/?type=recovery`
          : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirect,
      });
      if (error) {
        setNotice({ text: error.message, type: 'error' });
        Alert.alert('Reset failed', error.message);
      } else {
        setNotice({ text: `We sent a reset link to ${trimmedEmail}. Check your inbox.`, type: 'success' });
        Alert.alert('Password reset', `We sent a reset link to ${trimmedEmail}.`);
      }
    } catch (err) {
      setNotice({ text: 'Unexpected error requesting password reset.', type: 'error' });
      Alert.alert('Error', 'Unexpected error requesting password reset.');
    }
  };

  return (
    <View style={styles.authContainer}>
      <Image
        source={getLogoSource()}
        style={{ width: 180, height: 180, resizeMode: 'contain', marginBottom: 20 }}
      />
      {notice && <NoticeBanner message={notice.text} type={notice.type} />}

      {isRecoveryMode ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="New password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handlePerformReset}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Updating...' : 'Update Password'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.link} onPress={() => setIsRecoveryMode(false)}>Back to Log In</Text>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            inputMode="email"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Logging In...' : 'Log In'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.link} onPress={handleForgotPassword}>Forgot password?</Text>
          <Text style={styles.link} onPress={() => navigation.navigate('SignUp')}>Don't have an account? Sign Up</Text>
        </>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

function AccountScreen({ onLogout }: any) {
  const [email, setEmail] = useState('');

  useEffect(() => {
    // In a real app, decode the JWT or fetch user profile
    AsyncStorage.getItem('token').then(token => {
      if (token) {
        // For demo, just show token exists
        setEmail('Logged in');
      }
    });
  }, []);

  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: '#B9A68D' }]}>Account</Text>
      <Text>{email}</Text>
      <TouchableOpacity style={styles.button} onPress={onLogout}>
        <Text style={styles.buttonText}>Log Out</Text>
      </TouchableOpacity>
      <StatusBar style="auto" />
    </View>
  );
}

function AuthStack({ onAuth }: any) {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">
        {props => <LoginScreen {...props} onAuth={onAuth} />}
      </Stack.Screen>
      <Stack.Screen name="SignUp">
        {props => <SignUpScreen {...props} onAuth={onAuth} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function AlliScreen() {
  return <AlliChatScreen />;

}
function VoiceAgentScreen() {
  return <VoiceAgent />
}

function GoalsScreen() {
  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: '#B9A68D' }]}>Goals</Text>
      <Text>Set and track your goals here.</Text>
      <StatusBar style="auto" />
    </View>
  );
}



// Main tab navigator component
function MainTabNavigator({ onLogout }: { onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarShowLabel: false,
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === 'Home') {
            return <Ionicons name="home" size={size} color={color} />;
          } else if (route.name === 'Nutrition') {
            return <MaterialCommunityIcons name="food-apple" size={size} color={color} />;
          } else if (route.name === 'Alli') {
            // Icon handled by custom tabBarButton
            return null;
          } else if (route.name === 'Goals') {
            return <MaterialCommunityIcons name="target" size={size} color={color} />;
          } else if (route.name === 'Account') {
            return <FontAwesome name="user" size={size} color={color} />;
          }
          return null;
        },
        tabBarStyle: {
          height: 70,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Nutrition" component={NutritionScreen} />
      <Tab.Screen
        name="Alli"
        component={AlliScreen}
        options={{
          tabBarButton: (props) => <AlliTabBarButton {...props} />,
        }}
      />
      <Tab.Screen name="VoiceAgent" component={VoiceAgentScreen} />
      <Tab.Screen name="Goals" component={GoalsScreen} />
      <Tab.Screen name="Account">
        {() => <AccountScreen onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// Props type for AlliTabBarButton
type AlliTabBarButtonProps = {
  children?: React.ReactNode;
  onPress?: (event: any) => void;
};

function AlliTabBarButton({ children, onPress }: AlliTabBarButtonProps) {
  const pulse = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        RNAnimated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <TouchableOpacity
        onPress={onPress}
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 5,
          marginTop: -10,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        }}
      >
        <RNAnimated.View style={{ transform: [{ scale }], opacity }}>
          <LinearGradient
            colors={['#4F8EF7', '#8A2BE2', '#FF3B30']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                source={getLogoSource()}
                style={{ width: 36, height: 36, resizeMode: 'contain' }}
              />
            </View>
          </LinearGradient>
        </RNAnimated.View>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        setIsLoggedIn(!!data.session);
      } catch {
        if (!isMounted) return;
        setIsLoggedIn(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    // Web-only: poll for new deploys and show update banner
    let interval: any;
    if (Platform.OS === 'web') {
      const KEY = 'alli_meta_signature';
      const check = async () => {
        try {
          const res = await fetch(`/metadata.json?ts=${Date.now()}`, { cache: 'no-store' });
          const text = await res.text();
          const prev = localStorage.getItem(KEY);
          if (prev && prev !== text) {
            setUpdateAvailable(true);
          }
          localStorage.setItem(KEY, text);
        } catch { }
      };
      check();
      interval = setInterval(check, 30000);
    }

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
      if (interval) clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    try { await supabase.auth.signOut(); } catch { }
    setIsLoggedIn(false);
  };

  const handleAuth = () => {
    setIsLoggedIn(true);
  };

  if (loading) {
    return (
      <View style={styles.centered}><Text>Loading...</Text></View>
    );
  }

  return (
    <NavigationContainer>
      <View style={{ flex: 1 }}>
        {updateAvailable && Platform.OS === 'web' && (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#111', padding: 12, zIndex: 9999 }}>
            <Text style={{ color: '#fff', textAlign: 'center' }}>Update available</Text>
            <TouchableOpacity onPress={() => (window as any).location.reload(true)} style={{ alignSelf: 'center', marginTop: 8, backgroundColor: '#B9A68D', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Reload</Text>
            </TouchableOpacity>
          </View>
        )}
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {!isLoggedIn ? (
            <RootStack.Screen name="Auth" component={AuthStack} />
          ) : (
            <RootStack.Screen name="MainApp">
              {() => <MainTabNavigator onLogout={handleLogout} />}
            </RootStack.Screen>
          )}
        </RootStack.Navigator>
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#B9A68D',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: 'white',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#B9A68D',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#B9A68D',
    marginTop: 15,
    textDecorationLine: 'underline',
  },
  logItem: {
    backgroundColor: 'white',
    padding: 10,
    marginVertical: 5,
    borderRadius: 8,
    width: 200,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  macroItem: {
    flexBasis: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  emptyText: {
    color: '#6B7280',
    lineHeight: 20,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  foodItemContent: {
    flexDirection: 'row',
    flex: 1,
    gap: 10,
    paddingRight: 8,
  },
  foodImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  foodDetails: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  foodServing: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  foodCalories: {
    fontSize: 12,
    color: '#111827',
    marginTop: 6,
    fontWeight: '700',
  },
  foodMacros: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  macroText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  removeButton: {
    paddingLeft: 8,
    paddingTop: 2,
  },
});
