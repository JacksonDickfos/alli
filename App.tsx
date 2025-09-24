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
    setIsLoggedIn(true);
    setLoading(false);
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
    setIsLoggedIn(true);
    setLoading(false);
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
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    setIsLoggedIn(true);
    setLoading(false);
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
