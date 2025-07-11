import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, Button, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeScreen() {
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Home</Text>
      <StatusBar style="auto" />
    </View>
  );
}

function NutritionScreen() {
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Nutrition Log/Plans</Text>
      <StatusBar style="auto" />
    </View>
  );
}

function SignUpScreen({ navigation, onAuth }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://alli-dzbt.onrender.com/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Registration successful! Please log in.');
        navigation.navigate('Login');
      } else {
        Alert.alert('Error', data.error || 'Registration failed.');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title={loading ? 'Signing Up...' : 'Sign Up'} onPress={handleSignUp} disabled={loading} />
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
    setLoading(true);
    try {
      const res = await fetch('https://alli-dzbt.onrender.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        await AsyncStorage.setItem('token', data.token);
        onAuth();
        Alert.alert('Success', 'Logged in!');
      } else {
        Alert.alert('Error', data.error || 'Login failed.');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log In</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title={loading ? 'Logging In...' : 'Log In'} onPress={handleLogin} disabled={loading} />
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
      <Text style={styles.title}>Account</Text>
      <Text>{email}</Text>
      <Button title="Log Out" onPress={onLogout} />
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

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('token').then(token => {
      setIsLoggedIn(!!token);
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
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            if (route.name === 'Home') {
              return <Ionicons name="home" size={size} color={color} />;
            } else if (route.name === 'Nutrition') {
              return <MaterialCommunityIcons name="food-apple" size={size} color={color} />;
            } else if (route.name === 'Account') {
              return <FontAwesome name="user" size={size} color={color} />;
            }
            return null;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Nutrition" component={NutritionScreen} />
        <Tab.Screen name="Account">
          {() =>
            isLoggedIn ? (
              <AccountScreen onLogout={handleLogout} />
            ) : (
              <AuthStack onAuth={handleAuth} />
            )
          }
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#00796b',
  },
  input: {
    width: 250,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  link: {
    color: '#00796b',
    marginTop: 16,
    textDecorationLine: 'underline',
  },
});
