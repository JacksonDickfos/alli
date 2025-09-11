import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, Button, Alert, Image, TouchableOpacity, Platform, Animated, ScrollView, SafeAreaView } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated as RNAnimated } from 'react-native';
import { supabase } from './lib/supabase';

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

function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  // Placeholder for first name, replace with real user data if available
  const firstName = 'Alli';
  const cards = [
    {
      title: 'Alli',
      image: require('./assets/alli-card.png'),
      onPress: () => navigation.navigate('Alli'),
    },
    {
      title: 'Nutrition',
      image: require('./assets/nutrition-card.png'),
      onPress: () => navigation.navigate('Nutrition'),
    },
    {
      title: 'Goals',
      image: require('./assets/goals-card.png'),
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
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [log, setLog] = useState<Array<{name: string, calories: string}>>([]);

  const addFood = () => {
    if (foodName && calories) {
      setLog([...log, { name: foodName, calories }]);
      setFoodName('');
      setCalories('');
    }
  };

  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: '#B9A68D' }]}>Nutrition</Text>
      <TextInput
        style={styles.input}
        placeholder="Food name"
        value={foodName}
        onChangeText={setFoodName}
      />
      <TextInput
        style={styles.input}
        placeholder="Calories"
        value={calories}
        onChangeText={setCalories}
        keyboardType="numeric"
      />
      <TouchableOpacity style={styles.button} onPress={addFood}>
        <Text style={styles.buttonText}>Add Food</Text>
      </TouchableOpacity>
      <View style={{ marginTop: 20 }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Food Log:</Text>
        {log.length === 0 ? (
          <Text>No foods logged yet</Text>
        ) : (
          log.map((item, idx) => (
            <View key={idx} style={[styles.logItem, { alignSelf: 'center' }] }>
              <Text style={{ fontWeight: 'bold', textAlign: 'center' }}>{item.name}</Text>
              <Text style={{ textAlign: 'center' }}>{item.calories} kcal</Text>
            </View>
          ))
        )}
      </View>
      <StatusBar style="auto" />
    </View>
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
    const trimmedEmail = email.trim();
    const trimmedPassword = password;
    if (!trimmedEmail || !trimmedPassword) {
      setNotice({ text: 'Please enter an email and password.', type: 'error' });
      Alert.alert('Missing info', 'Please enter an email and password.');
      return;
    }
    setLoading(true);
    try {
      const redirect = typeof window !== 'undefined' ? `${window.location.origin}/?type=signup` : undefined;
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
      setNotice({ text: 'Unexpected error creating your account.', type: 'error' });
      Alert.alert('Error', 'Unexpected error creating your account.');
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
      const redirect = typeof window !== 'undefined' ? `${window.location.origin}/?type=recovery` : undefined;
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
  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: '#B9A68D' }]}>Alli (AI Chatbot)</Text>
      <Text>Conversational AI coming soon!</Text>
      <StatusBar style="auto" />
    </View>
  );
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

  const getLogoSource = () => {
    if (Platform.OS === 'web') {
      const v = Date.now();
      return { uri: `https://alli-nu.vercel.app/logo.png?v=${v}` } as any;
    }
    return { uri: "https://alli-nu.vercel.app/logo.png?v=" + Date.now() } as any;
  };

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
          marginTop: -20,
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
            colors={[ '#4F8EF7', '#8A2BE2', '#FF3B30' ]}
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
        } catch {}
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
    try { await supabase.auth.signOut(); } catch {}
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
});
