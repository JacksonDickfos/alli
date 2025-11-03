import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, Alert, Image, TouchableOpacity, Platform, Animated, ScrollView, SafeAreaView } from 'react-native';
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
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from './lib/supabase';
import { AppProvider } from './contexts/AppContext';
import HomeScreen from './screens/HomeScreen';
import NutritionScreen from './screens/NutritionScreen';
import AlliScreen from './screens/AlliScreen';
import GoalsScreen from './screens/GoalsScreen';
import GoalsOnlyScreen from './screens/GoalsOnlyScreen';
import ProfileScreen from './screens/ProfileScreen';
import AccountScreen from './screens/AccountScreen';
import MenuScreen from './screens/MenuScreen';
import ComingSoonScreen from './screens/ComingSoonScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

type RootTabParamList = {
  Home: undefined;
  Nutrition: undefined;
  Alli: undefined;
  Plan: undefined;
  Menu: undefined;
  Goals: undefined;
  Account: undefined;
};

// Legacy components removed - using new screen components

// Helper function for logo source
const getLogoSource = () => {
  if (Platform.OS === 'web') {
    const v = Date.now();
    return { uri: `https://alli-nu.vercel.app/logo.png?v=${v}` } as any;
  }
  return { uri: "https://alli-nu.vercel.app/logo.png?v=" + Date.now() } as any;
};

// Legacy NutritionScreen removed - using new NutritionScreen component
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
      const { data, error } = await supabase.auth.signUp({ 
        email: trimmedEmail, 
        password: trimmedPassword 
      });
      
      if (error) {
        console.error('Signup error:', error);
        setNotice({ text: error.message, type: 'error' });
        Alert.alert('Sign up failed', error.message);
      } else if (data.user) {
        setNotice({ text: 'Account created successfully! You can now log in.', type: 'success' });
        Alert.alert('Success', 'Account created! You can now log in.');
        navigation.navigate('Login');
      } else {
        setNotice({ text: 'Unexpected error creating your account.', type: 'error' });
        Alert.alert('Error', 'Unexpected error creating your account.');
      }
    } catch (err) {
      console.error('Signup catch error:', err);
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
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<{email: string, password: string} | null>(null);
  const [isDevMode, setIsDevMode] = useState(__DEV__);

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

  useEffect(() => {
    // Check if biometric authentication is available
    const checkBiometric = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        
        console.log('Biometric check:', { hasHardware, isEnrolled, supportedTypes });
        
        // Check specifically for Face ID (type 2) or Touch ID (type 1)
        const hasFaceID = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
        const hasTouchID = supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
        
        if (hasHardware && isEnrolled && (hasFaceID || hasTouchID)) {
          setBiometricAvailable(true);
          console.log('✅ Biometric authentication available:', hasFaceID ? 'Face ID' : 'Touch ID');
          
          // Load saved credentials
          const savedEmail = await AsyncStorage.getItem('savedEmail');
          const savedPassword = await AsyncStorage.getItem('savedPassword');
          if (savedEmail && savedPassword) {
            setSavedCredentials({ email: savedEmail, password: savedPassword });
            console.log('✅ Saved credentials found for biometric login');
          }
        } else {
          // Even if biometric isn't available, load saved credentials for dev mode
          const savedEmail = await AsyncStorage.getItem('savedEmail');
          const savedPassword = await AsyncStorage.getItem('savedPassword');
          if (savedEmail && savedPassword) {
            setSavedCredentials({ email: savedEmail, password: savedPassword });
            console.log('✅ Saved credentials found (biometric not available, but available for quick login)');
          }
          console.log('❌ Biometric authentication not available');
        }
      } catch (error) {
        console.log('❌ Biometric check error:', error);
      }
    };
    
    checkBiometric();
  }, []);

  const handleQuickLogin = async () => {
    if (!savedCredentials) {
      setNotice({ text: 'No saved credentials found. Please log in manually first.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      // Quick login without biometric - just use saved credentials
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: savedCredentials.email, 
        password: savedCredentials.password 
      });
      
      if (error) {
        console.error('Quick login error:', error);
        setNotice({ text: error.message, type: 'error' });
        Alert.alert('Login failed', error.message);
      } else if (data.session) {
        await AsyncStorage.setItem('token', data.session.access_token);
        await AsyncStorage.setItem('isLoggedIn', 'true');
        setNotice({ text: 'Quick login successful!', type: 'success' });
        onAuth();
      }
    } catch (error: any) {
      console.error('Quick login error:', error);
      setNotice({ text: error.message || 'Quick login failed.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFaceIDLogin = async () => {
    if (!savedCredentials) {
      setNotice({ text: 'No saved credentials found. Please log in manually first.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      // On simulator, try quick login first (faster, no biometric needed)
      // But still allow Face ID if it's available
      if (Platform.OS === 'ios' && __DEV__ && !biometricAvailable) {
        console.log('⚠️ Simulator detected without biometric - using quick login');
        // Use quick login instead
        await handleQuickLogin();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Use Face ID to log in to Alli',
        fallbackLabel: 'Use Password Instead',
        disableDeviceFallback: false, // Allow fallback on simulator
        requireBiometrics: false, // Don't require on simulator
      });

      if (result.success) {
        // Use saved credentials to log in
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email: savedCredentials.email, 
          password: savedCredentials.password 
        });
        
        if (error) {
          console.error('Face ID login error:', error);
          setNotice({ text: error.message, type: 'error' });
          Alert.alert('Login failed', error.message);
        } else if (data.session) {
          await AsyncStorage.setItem('token', data.session.access_token);
          await AsyncStorage.setItem('isLoggedIn', 'true');
          setNotice({ text: 'Logged in with Face ID successfully!', type: 'success' });
          onAuth();
          Alert.alert('Success', 'Logged in with Face ID!');
        }
      } else {
        setNotice({ text: 'Face ID authentication cancelled or failed.', type: 'error' });
      }
    } catch (error: any) {
      console.error('Face ID error:', error);
      // If biometric fails, try quick login as fallback
      if (error.message?.includes('not available') || error.message?.includes('simulator')) {
        console.log('⚠️ Biometric not available, falling back to quick login');
        await handleQuickLogin();
      } else {
        setNotice({ text: 'Face ID authentication failed.', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

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
      if (error) {
        console.error('Login error:', error);
        setNotice({ text: error.message, type: 'error' });
        Alert.alert('Login failed', error.message);
      } else if (data.session) {
        await AsyncStorage.setItem('token', data.session.access_token);
        await AsyncStorage.setItem('isLoggedIn', 'true');
        // Save credentials for Face ID
        await AsyncStorage.setItem('savedEmail', trimmedEmail);
        await AsyncStorage.setItem('savedPassword', trimmedPassword);
        setNotice({ text: 'Logged in successfully.', type: 'success' });
        onAuth();
        Alert.alert('Success', 'Logged in!');
      } else {
        setNotice({ text: 'Unexpected error logging in.', type: 'error' });
        Alert.alert('Error', 'Unexpected error logging in.');
      }
    } catch (err) {
      console.error('Login catch error:', err);
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
          
          {biometricAvailable && savedCredentials && (
            <TouchableOpacity 
              style={[styles.faceIdButton, loading && styles.buttonDisabled]} 
              onPress={handleFaceIDLogin} 
              disabled={loading}
            >
              <Ionicons name="face-id" size={24} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>
                {loading ? 'Authenticating...' : 'Log In with Face ID'}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Quick Login button - shows in dev mode (simulator) when credentials are saved */}
          {/* Shows even if Face ID is available, so you have both options in dev */}
          {isDevMode && savedCredentials && (
            <TouchableOpacity 
              style={[styles.quickLoginButton, loading && styles.buttonDisabled]} 
              onPress={handleQuickLogin} 
              disabled={loading}
            >
              <Ionicons name="flash" size={24} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>
                {loading ? 'Logging in...' : 'Quick Login (Simulator)'}
              </Text>
            </TouchableOpacity>
          )}
          
          <Text style={styles.link} onPress={handleForgotPassword}>Forgot password?</Text>
          <Text style={styles.link} onPress={() => navigation.navigate('SignUp')}>Don't have an account? Sign Up</Text>
        </>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

// Legacy AccountScreen removed - using new AccountScreen component

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

// Legacy AlliScreen and GoalsScreen removed - using new screen components



// Menu Stack Navigator for handling Profile and Account screens
function MenuStackNavigator({ onLogout }: { onLogout: () => void }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MenuMain" component={MenuScreen} />
      <Stack.Screen name="Goals" component={GoalsOnlyScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Account">
        {(props) => <AccountScreen {...props} onLogout={onLogout} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// Main tab navigator component
function MainTabNavigator({ onLogout }: { onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#CDC4B7',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: -1, // Move text up 10px from previous 9px
        },
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          const iconSize = size * 0.9; // Reduce by 10%
          const iconStyle = { marginTop: -5 }; // Move icons up 5px
          
          if (route.name === 'Home') {
            return <MaterialCommunityIcons name="weather-sunset" size={iconSize} color={color} style={iconStyle} />;
          } else if (route.name === 'Nutrition') {
            return <MaterialCommunityIcons name="clipboard-text" size={iconSize} color={color} style={iconStyle} />;
          } else if (route.name === 'Alli') {
            // Icon handled by custom tabBarButton
            return null;
          } else if (route.name === 'Plan') {
            return <MaterialCommunityIcons name="silverware-fork-knife" size={iconSize} color={color} style={iconStyle} />;
          } else if (route.name === 'Menu') {
            return <MaterialCommunityIcons name="dots-horizontal" size={iconSize} color={color} style={iconStyle} />;
          }
          return null;
        },
        tabBarStyle: {
          height: 80,
          backgroundColor: '#28657A',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Today' }}
      />
      <Tab.Screen 
        name="Nutrition" 
        component={NutritionScreen}
        options={{ tabBarLabel: 'Diary' }}
      />
      <Tab.Screen
        name="Alli"
        component={AlliScreen}
        options={{
          tabBarLabel: 'Alli',
          tabBarButton: (props) => <AlliTabBarButton {...props} />, 
        }}
      />
      <Tab.Screen 
        name="Plan" 
        component={ComingSoonScreen}
        options={{ tabBarLabel: 'Plan' }}
      />
      <Tab.Screen 
        name="Menu"
        options={{ tabBarLabel: 'More' }}
      >
        {() => <MenuStackNavigator onLogout={onLogout} />}
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
    return require('./assets/fullname-logo.png');
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
                backgroundColor: '#28657A',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <Image
                source={getLogoSource()}
                style={{ width: 60, height: 60, resizeMode: 'cover', borderRadius: 24 }}
              />
            </View>
          </LinearGradient>
        </RNAnimated.View>
      </TouchableOpacity>
    </View>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; errorMsg?: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorMsg: undefined };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMsg: error?.message || 'Unexpected error' };
  }
  componentDidCatch(error: any, info: any) {
    if (typeof window !== 'undefined') {
      (window as any).__ALLI_LAST_ERROR__ = { error, info };
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#0090A3', fontSize: 20, marginBottom: 8 }}>Something went wrong</Text>
          <Text style={{ color: '#333', textAlign: 'center' }}>{this.state.errorMsg}</Text>
        </SafeAreaView>
      );
    }
    return this.props.children as any;
  }
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [bootTimedOut, setBootTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBootTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // SMART TOKEN REFRESH: Keep you logged in AND authenticated
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.log('Token refresh error (non-critical):', error.message);
          // DON'T log out - keep user logged in even if token refresh fails
          // Only log out if it's a real authentication failure
          if (error.message.includes('Invalid JWT') || 
              error.message.includes('Token expired') ||
              error.message.includes('Invalid token')) {
            console.log('Real auth failure - but keeping user logged in for now');
            // Don't actually log out - let them try again
          }
        } else if (data.session) {
          // Token refreshed successfully - update stored token
          await AsyncStorage.setItem('token', data.session.access_token);
          await AsyncStorage.setItem('isLoggedIn', 'true');
          console.log('✅ Token refreshed successfully');
        }
      } catch (error) {
        console.log('Token refresh catch error (non-critical):', error);
        // Don't log out for network errors
      }
    }, 4 * 60 * 1000); // Refresh every 4 minutes (tokens last 1 hour)

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // BULLETPROOF AUTH: Always stay logged in unless explicitly logged out
        const savedAuthState = await AsyncStorage.getItem('isLoggedIn');
        const autoLogin = process.env.EXPO_PUBLIC_AUTO_LOGIN === 'true';
        
        if (savedAuthState === 'true' && autoLogin) {
          // User was logged in AND auto-login enabled, keep them logged in FOREVER
          console.log('✅ User was logged in (auto-login enabled), keeping them logged in permanently');
          await AsyncStorage.setItem('isLoggedIn', 'true');
          setIsLoggedIn(true);
          if (isMounted) setLoading(false);
          return;
        }

        // For testing: Always start logged out unless auto-login is enabled
        if (!autoLogin) {
          console.log('🔒 Auto-login disabled - starting logged out for testing');
          setIsLoggedIn(false);
          if (isMounted) setLoading(false);
          return;
        }

        // Only check session if auto-login is enabled and no saved state
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        if (data.session) {
          // Found a session, save it permanently
          await AsyncStorage.setItem('isLoggedIn', 'true');
          await AsyncStorage.setItem('token', data.session.access_token);
          setIsLoggedIn(true);
        } else {
          // No session, user needs to log in
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (!isMounted) return;
        
        // On ANY error, check saved state and keep user logged in
        const savedAuthState = await AsyncStorage.getItem('isLoggedIn');
        if (savedAuthState === 'true') {
          console.log('✅ Error occurred, but keeping user logged in');
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    // SMART auth state change handler - handles both login status AND authentication
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, !!session);
      
      if (event === 'SIGNED_IN' && session) {
        // User signed in - save permanently
        await AsyncStorage.setItem('isLoggedIn', 'true');
        await AsyncStorage.setItem('token', session.access_token);
        setIsLoggedIn(true);
        console.log('✅ User signed in - saved permanently');
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Token refreshed - keep logged in AND update token
        await AsyncStorage.setItem('isLoggedIn', 'true');
        await AsyncStorage.setItem('token', session.access_token);
        setIsLoggedIn(true);
        console.log('✅ Token refreshed - user stays logged in');
      } else if (event === 'SIGNED_OUT') {
        // Only handle explicit sign out
        console.log('User explicitly signed out');
        await AsyncStorage.removeItem('isLoggedIn');
        await AsyncStorage.removeItem('token');
        setIsLoggedIn(false);
      }
      // NOTE: We ignore other events to keep user logged in
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
    await AsyncStorage.removeItem('isLoggedIn');
    try { await supabase.auth.signOut(); } catch {}
    setIsLoggedIn(false);
  };

  const handleAuth = async () => {
    setIsLoggedIn(true);
    // Save authentication state
    try {
      await AsyncStorage.setItem('isLoggedIn', 'true');
    } catch (error) {
      console.error('Error saving auth state:', error);
    }
  };

  if (loading && !bootTimedOut) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#0090A3' }}>Loading…</Text>
      </SafeAreaView>
    );
  }
  if (loading && bootTimedOut) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: '#0090A3', fontSize: 20, marginBottom: 8 }}>Still loading…</Text>
        <Text style={{ color: '#333', textAlign: 'center' }}>If this persists, please reload the app.</Text>
      </SafeAreaView>
    );
  }

  return (
    <AppProvider>
      <ErrorBoundary>
        <NavigationContainer>
          <View style={{ flex: 1 }}>
            {updateAvailable && Platform.OS === 'web' && (
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#111', padding: 12, zIndex: 9999 }}>
                <Text style={{ color: '#fff', textAlign: 'center' }}>Update available</Text>
                <TouchableOpacity onPress={() => (window as any).location.reload(true)} style={{ alignSelf: 'center', marginTop: 8, backgroundColor: '#0090A3', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Reload</Text>
                </TouchableOpacity>
              </View>
            )}
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              {!isLoggedIn ? (
                <RootStack.Screen name="Auth">
                  {() => <AuthStack onAuth={handleAuth} />}
                </RootStack.Screen>
              ) : (
                <RootStack.Screen name="MainApp">
                  {() => <MainTabNavigator onLogout={handleLogout} />}
                </RootStack.Screen>
              )}
            </RootStack.Navigator>
          </View>
        </NavigationContainer>
      </ErrorBoundary>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#CDC4B7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#28657A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: '#CDC4B7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#0090A3',
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
    backgroundColor: '#0090A3',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  quickLoginButton: {
    backgroundColor: '#9B59B6', // Purple color to match your description
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  faceIdButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#6E006A',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    flexDirection: 'row',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#0090A3',
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
