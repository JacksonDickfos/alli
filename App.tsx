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
import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';

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
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setPressed(false);
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          width: 150,
          height: 150,
          backgroundColor: '#fff',
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          margin: 10,
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
        <Animated.View
          style={{
            transform: [{ scale: pressAnim }],
          }}
        >
          <Image source={image} style={{ width: 80, height: 80, marginBottom: 10 }} />
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'center' }}>
            {title}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  const handleCardPress = (screenName: keyof RootTabParamList) => {
    navigation.navigate(screenName);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', paddingBottom: 88 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: '#B9A68D', marginBottom: 30 }]}>Welcome to Alli</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
          <HomeCard
            title="Nutrition"
            image={require('./assets/nutrition-card.png')}
            onPress={() => handleCardPress('Nutrition')}
            index={0}
          />
          <HomeCard
            title="Goals"
            image={require('./assets/goals-card.png')}
            onPress={() => handleCardPress('Goals')}
            index={1}
          />
          <HomeCard
            title="Alli Chat"
            image={require('./assets/alli-card.png')}
            onPress={() => handleCardPress('Alli')}
            index={2}
          />
        </View>
        <StatusBar style="auto" />
      </ScrollView>
    </SafeAreaView>
  );
}

// Food Analysis API Integration
async function analyzeFoodImage(imageUri: string) {
  try {
    // For demo purposes, I'll create a sophisticated mock analysis
    // In production, you would integrate with APIs like:
    // - Google Vision API
    // - Clarifai Food Model
    // - Microsoft Computer Vision
    // - Custom ML model
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock sophisticated food analysis results
    const mockResults = [
      {
        name: "Grilled Chicken Breast",
        confidence: 0.92,
        calories: 231,
        protein: 43.5,
        carbs: 0,
        fat: 5.0,
        fiber: 0,
        sugar: 0,
        serving_size: "100g"
      },
      {
        name: "Mixed Green Salad",
        confidence: 0.88,
        calories: 45,
        protein: 3.2,
        carbs: 8.1,
        fat: 0.8,
        fiber: 2.1,
        sugar: 4.2,
        serving_size: "1 cup"
      },
      {
        name: "Brown Rice",
        confidence: 0.85,
        calories: 112,
        protein: 2.6,
        carbs: 22.0,
        fat: 0.9,
        fiber: 1.8,
        sugar: 0.4,
        serving_size: "1/2 cup"
      },
      {
        name: "Avocado",
        confidence: 0.90,
        calories: 160,
        protein: 2.0,
        carbs: 8.5,
        fat: 14.7,
        fiber: 6.7,
        sugar: 0.7,
        serving_size: "1 medium"
      }
    ];
    
    // Return a random result for demo
    return mockResults[Math.floor(Math.random() * mockResults.length)];
  } catch (error) {
    console.error('Food analysis error:', error);
    throw new Error('Failed to analyze food image');
  }
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
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraPermission === false) {
      Alert.alert('Permission Required', 'Camera permission is required to take food photos.');
      return;
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
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const analyzeAndLogFood = async (imageUri: string) => {
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeFoodImage(imageUri);
      
      const newFoodItem = {
        id: Date.now().toString(),
        ...analysis,
        imageUri,
      };
      
      setFoodLog(prev => [newFoodItem, ...prev]);
      
      Alert.alert(
        'Food Analyzed!',
        `Detected: ${analysis.name}\nConfidence: ${Math.round(analysis.confidence * 100)}%\nCalories: ${analysis.calories}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Analysis Failed', 'Could not analyze the food image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const removeFoodItem = (id: string) => {
    setFoodLog(prev => prev.filter(item => item.id !== id));
  };

  const getTotalMacros = () => {
    return foodLog.reduce((totals, item) => ({
      calories: totals.calories + item.calories,
      protein: totals.protein + item.protein,
      carbs: totals.carbs + item.carbs,
      fat: totals.fat + item.fat,
      fiber: totals.fiber + item.fiber,
      sugar: totals.sugar + item.sugar,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 });
  };

  const totals = getTotalMacros();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', paddingBottom: 88 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: '#B9A68D', marginBottom: 20 }]}>Nutrition Tracker</Text>
        
        {/* Camera Button */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#B9A68D', marginBottom: 20 }]}
          onPress={takePicture}
          disabled={isAnalyzing}
        >
          <Ionicons name="camera" size={24} color="white" style={{ marginRight: 10 }} />
          <Text style={styles.buttonText}>
            {isAnalyzing ? 'Analyzing...' : 'Take Food Photo'}
          </Text>
        </TouchableOpacity>

        {/* Daily Totals */}
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.subtitle, { color: '#B9A68D', marginBottom: 15 }]}>Today's Totals</Text>
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
        <View style={styles.card}>
          <Text style={[styles.subtitle, { color: '#B9A68D', marginBottom: 15 }]}>Food Log</Text>
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
                    <Text style={styles.foodCalories}>{item.calories} cal • {Math.round(item.confidence * 100)}% confidence</Text>
                    <View style={styles.foodMacros}>
                      <Text style={styles.macroText}>P: {item.protein}g</Text>
                      <Text style={styles.macroText}>C: {item.carbs}g</Text>
                      <Text style={styles.macroText}>F: {item.fat}g</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => removeFoodItem(item.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
        
        <StatusBar style="auto" />
      </ScrollView>
    </SafeAreaView>
  );
}

function GoalsScreen() {
  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: '#B9A68D' }]}>Goals</Text>
      <Text style={styles.subtitle}>Set your nutrition and fitness goals</Text>
      <StatusBar style="auto" />
    </View>
  );
}

function AlliScreen() {
  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: '#B9A68D' }]}>Alli Chat</Text>
      <Text style={styles.subtitle}>Chat with your AI nutrition assistant</Text>
      <StatusBar style="auto" />
    </View>
  );
}

function AccountScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: '#B9A68D' }]}>Account</Text>
      <TouchableOpacity style={styles.button} onPress={onLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
      <StatusBar style="auto" />
    </View>
  );
}

// Custom Alli Tab Bar Button with pulsing gradient
function AlliTabBarButton({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
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

// Props type for AlliTabBarButton
type AlliTabBarButtonProps = {
  children: React.ReactNode;
  onPress: () => void;
};

function MainTabNavigator({ onLogout }: { onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 88,
          paddingBottom: 34,
          paddingTop: 8,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          height: 60,
          paddingBottom: 5,
        },
        tabBarActiveTintColor: '#B9A68D',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Nutrition"
        component={NutritionScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="nutrition" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Alli"
        component={AlliScreen}
        options={{
          tabBarButton: (props) => <AlliTabBarButton {...props} />,
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flag" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
        initialParams={{ onLogout }}
      />
    </Tab.Navigator>
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
  if (Platform.OS !== 'web') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get('type');
  const message = urlParams.get('message');
  
  if (type && message) {
    return { banner: decodeURIComponent(message), type: type as 'success' | 'error' | 'info' };
  }
  return null;
}

function LoginScreen({ onAuth }: { onAuth: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ banner: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const authMessage = parseAuthMessageFromUrl();
    if (authMessage) {
      setBanner(authMessage);
    }
  }, []);

  const getLogoSource = () => {
    if (Platform.OS === 'web') {
      const v = Date.now();
      return { uri: `https://alli-nu.vercel.app/logo.png?v=${v}` } as any;
    }
    return { uri: "https://alli-nu.vercel.app/logo.png?v=" + Date.now() } as any;
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setBanner({ banner: 'Please enter both email and password', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setBanner({ banner: error.message, type: 'error' });
      } else {
        setBanner({ banner: 'Login successful!', type: 'success' });
        setTimeout(() => onAuth(), 1000);
      }
    } catch (error) {
      setBanner({ banner: 'An unexpected error occurred', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setBanner({ banner: 'Please enter your email first', type: 'error' });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/?type=recovery&message=${encodeURIComponent('Password reset email sent! Check your inbox.')}`,
      });

      if (error) {
        setBanner({ banner: error.message, type: 'error' });
      } else {
        setBanner({ banner: 'Password reset email sent! Check your inbox.', type: 'success' });
      }
    } catch (error) {
      setBanner({ banner: 'Failed to send reset email', type: 'error' });
    }
  };

  const handlePerformReset = async () => {
    if (!newPassword || !confirmPassword) {
      setBanner({ banner: 'Please enter both password fields', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setBanner({ banner: 'Passwords do not match', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setBanner({ banner: 'Password must be at least 6 characters', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setBanner({ banner: error.message, type: 'error' });
      } else {
        setBanner({ banner: 'Password updated successfully!', type: 'success' });
        setIsRecoveryMode(false);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      setBanner({ banner: 'Failed to update password', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.authContainer}>
      <Image
        source={getLogoSource()}
        style={{ width: 80, height: 80, marginBottom: 30 }}
      />
      <Text style={[styles.title, { color: '#B9A68D', marginBottom: 30 }]}>Welcome to Alli</Text>
      
      {banner && <NoticeBanner message={banner.banner} type={banner.type} />}

      {isRecoveryMode ? (
        <>
          <Text style={[styles.subtitle, { marginBottom: 20 }]}>Reset Your Password</Text>
          <TextInput
            style={styles.input}
            placeholder="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.button} onPress={handlePerformReset} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Updating...' : 'Update Password'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsRecoveryMode(false)}>
            <Text style={[styles.linkText, { marginTop: 10 }]}>Back to Login</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            inputMode="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            inputMode="text"
          />
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={[styles.linkText, { marginTop: 10 }]}>Forgot your password?</Text>
          </TouchableOpacity>
        </>
      )}
      
      <StatusBar style="auto" />
    </View>
  );
}

function SignUpScreen({ onAuth }: { onAuth: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ banner: string; type: 'success' | 'error' | 'info' } | null>(null);

  const getLogoSource = () => {
    if (Platform.OS === 'web') {
      const v = Date.now();
      return { uri: `https://alli-nu.vercel.app/logo.png?v=${v}` } as any;
    }
    return { uri: "https://alli-nu.vercel.app/logo.png?v=" + Date.now() } as any;
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      setBanner({ banner: 'Please fill in all fields', type: 'error' });
      return;
    }

    if (password !== confirmPassword) {
      setBanner({ banner: 'Passwords do not match', type: 'error' });
      return;
    }

    if (password.length < 6) {
      setBanner({ banner: 'Password must be at least 6 characters', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/?type=signup&message=${encodeURIComponent('Account created! Please check your email to confirm your account.')}`,
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setBanner({ banner: 'This email is already in use. Please log in instead.', type: 'error' });
        } else {
          setBanner({ banner: error.message, type: 'error' });
        }
      } else {
        setBanner({ banner: 'Account created! Please check your email to confirm your account.', type: 'success' });
      }
    } catch (error) {
      setBanner({ banner: 'An unexpected error occurred', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.authContainer}>
      <Image
        source={getLogoSource()}
        style={{ width: 80, height: 80, marginBottom: 30 }}
      />
      <Text style={[styles.title, { color: '#B9A68D', marginBottom: 30 }]}>Create Account</Text>
      
      {banner && <NoticeBanner message={banner.banner} type={banner.type} />}

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        inputMode="email"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        inputMode="text"
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        inputMode="text"
      />
      <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creating Account...' : 'Sign Up'}</Text>
      </TouchableOpacity>
      
      <StatusBar style="auto" />
    </View>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 108,
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 108,
  },
  centered: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 108,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: 'white',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#B9A68D',
    borderRadius: 8,
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
  linkText: {
    color: '#B9A68D',
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#B9A68D',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  foodItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  foodDetails: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  foodServing: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  foodCalories: {
    fontSize: 14,
    color: '#B9A68D',
    marginTop: 4,
  },
  foodMacros: {
    flexDirection: 'row',
    marginTop: 4,
  },
  macroText: {
    fontSize: 12,
    color: '#666',
    marginRight: 12,
  },
  removeButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 20,
  },
});
