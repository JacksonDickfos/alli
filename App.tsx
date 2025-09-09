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

function SignUpScreen({ navigation, onAuth }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter an email and password.');
      return;
    }
    setLoading(true);
    try {
      const usersJson = await AsyncStorage.getItem('users');
      const users = usersJson ? JSON.parse(usersJson) : {};
      if (users[email]) {
        Alert.alert('Account exists', 'An account with this email already exists. Please log in.');
        setLoading(false);
        return;
      }
      users[email] = { password };
      await AsyncStorage.setItem('users', JSON.stringify(users));
      Alert.alert('Success', 'Registration successful! You can now log in.');
      navigation.navigate('Login');
    } catch (err) {
      Alert.alert('Error', 'Unexpected error creating your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.authContainer}>
      <Image
        source={require('./assets/alli-logo.png')}
        style={{ width: 180, height: 180, resizeMode: 'contain', marginBottom: 20 }}
      />
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter an email and password.');
      return;
    }
    setLoading(true);
    try {
      const usersJson = await AsyncStorage.getItem('users');
      const users = usersJson ? JSON.parse(usersJson) : {};
      const record = users[email];
      if (!record || record.password !== password) {
        Alert.alert('Invalid credentials', 'Email or password is incorrect.');
      } else {
        await AsyncStorage.setItem('token', `demo-token:${email}`);
        onAuth();
        Alert.alert('Success', 'Logged in!');
      }
    } catch (err) {
      Alert.alert('Error', 'Unexpected error logging in.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Enter email', 'Please enter your email above first, then tap Forgot Password again.');
      return;
    }
    // Demo flow: pretend to send reset link
    Alert.alert('Password reset', `A reset link would be sent to ${email} in a real app.`);
  };

  return (
    <View style={styles.authContainer}>
      <Image
        source={require('./assets/alli-logo.png')}
        style={{ width: 180, height: 180, resizeMode: 'contain', marginBottom: 20 }}
      />
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
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <TouchableOpacity
        onPress={onPress}
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: '#B9A68D',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 5,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        }}
      >
        <LinearGradient
          colors={['#B9A68D', '#8B7355']}
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chatbubble" size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear any existing tokens for demo purposes
    AsyncStorage.removeItem('token').then(() => {
      setIsLoggedIn(false);
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
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
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          // Auth flow screens
          <RootStack.Screen name="Auth" component={AuthStack} />
        ) : (
          // Main app with bottom tabs
          <RootStack.Screen name="MainApp">
            {() => <MainTabNavigator onLogout={handleLogout} />}
          </RootStack.Screen>
        )}
      </RootStack.Navigator>
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
