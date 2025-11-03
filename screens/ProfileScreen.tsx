import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { User } from '../contexts/AppContext';

interface ProfileScreenProps {
  navigation: any;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { state, dispatch } = useApp();
  const [userProfile, setUserProfile] = useState<Partial<User>>({
    firstName: '',
    lastName: '',
    age: 30,
    weight: 70,
    height: 170,
    gender: 'female',
    activityLevel: 'moderate',
    goal: 'maintain_weight',
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    if (state.user) {
      setUserProfile({
        firstName: state.user.firstName || '',
        lastName: state.user.lastName || '',
        age: state.user.age || 30,
        weight: state.user.weight || 70,
        height: state.user.height || 170,
        gender: state.user.gender || 'female',
        activityLevel: state.user.activityLevel || 'moderate',
        goal: state.user.goal || 'maintain_weight',
      });
    }
  }, [state.user]);

  const saveProfile = async () => {
    try {
      dispatch({ type: 'SET_USER', payload: userProfile });
      await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
      setIsEditingProfile(false);
      Alert.alert('Success', 'Profile saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  const getGoalDescription = (goal: string) => {
    switch (goal) {
      case 'lose_weight':
        return 'Focus on creating a calorie deficit through diet and exercise to lose weight safely.';
      case 'maintain_weight':
        return 'Maintain your current weight by balancing calorie intake with your daily energy expenditure.';
      case 'gain_weight':
        return 'Gradually increase calorie intake and strength training to gain healthy weight.';
      case 'build_muscle':
        return 'Combine resistance training with adequate protein intake to build lean muscle mass.';
      default:
        return '';
    }
  };

  const renderProfileSection = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Profile</Text>
        <TouchableOpacity onPress={() => setIsEditingProfile(!isEditingProfile)}>
          <Ionicons 
            name={isEditingProfile ? "checkmark" : "pencil"} 
            size={24} 
            color="#B9A68D" 
          />
        </TouchableOpacity>
      </View>

      {isEditingProfile ? (
        <View>
          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                style={styles.input}
                value={userProfile.firstName}
                onChangeText={(text) => setUserProfile({ ...userProfile, firstName: text })}
                placeholder="Enter first name"
              />
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={userProfile.lastName}
                onChangeText={(text) => setUserProfile({ ...userProfile, lastName: text })}
                placeholder="Enter last name"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputThird}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                value={userProfile.age?.toString()}
                onChangeText={(text) => setUserProfile({ ...userProfile, age: parseInt(text) || 0 })}
                placeholder="Age"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputThird}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={userProfile.weight?.toString()}
                onChangeText={(text) => setUserProfile({ ...userProfile, weight: parseFloat(text) || 0 })}
                placeholder="Weight"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputThird}>
              <Text style={styles.inputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                value={userProfile.height?.toString()}
                onChangeText={(text) => setUserProfile({ ...userProfile, height: parseFloat(text) || 0 })}
                placeholder="Height"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.optionGroup}>
                {['male', 'female', 'other'].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.optionButton,
                      userProfile.gender === gender && styles.optionButtonSelected,
                    ]}
                    onPress={() => setUserProfile({ ...userProfile, gender: gender as any })}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        userProfile.gender === gender && styles.optionButtonTextSelected,
                      ]}
                    >
                      {gender.charAt(0).toUpperCase() + gender.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Goal</Text>
              <View style={styles.optionGroup}>
                {['lose_weight', 'maintain_weight', 'gain_weight', 'build_muscle'].map((goal) => (
                  <TouchableOpacity
                    key={goal}
                    style={[
                      styles.optionButton,
                      userProfile.goal === goal && styles.optionButtonSelected,
                    ]}
                    onPress={() => setUserProfile({ ...userProfile, goal: goal as any })}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        userProfile.goal === goal && styles.optionButtonTextSelected,
                      ]}
                    >
                      {goal.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputFull}>
              <Text style={styles.inputLabel}>Activity Level</Text>
              <View style={styles.optionGroup}>
                {['sedentary', 'light', 'moderate', 'active', 'very_active'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.optionButton,
                      userProfile.activityLevel === level && styles.optionButtonSelected,
                    ]}
                    onPress={() => setUserProfile({ ...userProfile, activityLevel: level as any })}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        userProfile.activityLevel === level && styles.optionButtonTextSelected,
                      ]}
                    >
                      {level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
            <Text style={styles.saveButtonText}>Save Profile</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileText}>
              <Text style={styles.profileLabel}>Name:</Text> {userProfile.firstName} {userProfile.lastName}
            </Text>
            <Text style={styles.profileText}>
              <Text style={styles.profileLabel}>Age:</Text> {userProfile.age} years
            </Text>
            <Text style={styles.profileText}>
              <Text style={styles.profileLabel}>Weight:</Text> {userProfile.weight} kg
            </Text>
            <Text style={styles.profileText}>
              <Text style={styles.profileLabel}>Height:</Text> {userProfile.height} cm
            </Text>
            <Text style={styles.profileText}>
              <Text style={styles.profileLabel}>Gender:</Text> {userProfile.gender?.charAt(0).toUpperCase() + userProfile.gender?.slice(1)}
            </Text>
            <Text style={styles.profileText}>
              <Text style={styles.profileLabel}>Goal:</Text> {userProfile.goal?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
            <Text style={styles.profileText}>
              <Text style={styles.profileLabel}>Activity:</Text> {userProfile.activityLevel?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
          </View>
          {userProfile.goal && (
            <Text style={styles.goalDescription}>
              {getGoalDescription(userProfile.goal)}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Profile</Text>
        
        {renderProfileSection()}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#CDC4B7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2A2A2A',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#E6E1D8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0090A3',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputHalf: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputThird: {
    flex: 1,
    marginHorizontal: 2,
  },
  inputFull: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3EEE7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#D0C7B8',
  },
  optionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#F3EEE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0C7B8',
  },
  optionButtonSelected: {
    backgroundColor: '#0090A3',
    borderColor: '#0090A3',
  },
  optionButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  optionButtonTextSelected: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: '#0090A3',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  profileInfo: {
    marginBottom: 16,
  },
  profileText: {
    fontSize: 16,
    color: '#2A2A2A',
    marginBottom: 8,
    lineHeight: 24,
  },
  profileLabel: {
    fontWeight: '600',
    color: '#0090A3',
  },
  goalDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
    backgroundColor: '#F3EEE7',
    padding: 12,
    borderRadius: 8,
  },
});
