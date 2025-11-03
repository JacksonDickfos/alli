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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { User, NutritionGoal } from '../contexts/AppContext';

interface GoalsScreenProps {
  navigation: any;
}

export default function GoalsScreen({ navigation }: GoalsScreenProps) {
  const { state, dispatch, calculateNutritionGoals } = useApp();
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
  const [customGoals, setCustomGoals] = useState<NutritionGoal>({
    calories: 2000,
    protein: 120,
    carbs: 225,
    fat: 67,
    fiber: 25,
    sugar: 50,
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingGoals, setIsEditingGoals] = useState(false);

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

  useEffect(() => {
    if (state.nutritionGoals) {
      setCustomGoals(state.nutritionGoals);
    }
  }, [state.nutritionGoals]);

  const calculateRecommendedGoals = () => {
    if (!userProfile.age || !userProfile.weight || !userProfile.height) {
      Alert.alert('Missing Information', 'Please fill in your age, weight, and height to calculate recommended goals.');
      return;
    }

    const user: User = {
      id: state.user?.id || 'temp',
      email: state.user?.email || '',
      ...userProfile,
    } as User;

    const recommendedGoals = calculateNutritionGoals(user);
    setCustomGoals(recommendedGoals);
    setIsEditingGoals(true);
  };

  const saveProfile = async () => {
    if (!userProfile.firstName || !userProfile.age || !userProfile.weight || !userProfile.height) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    const updatedUser: User = {
      id: state.user?.id || 'temp',
      email: state.user?.email || '',
      ...userProfile,
    } as User;

    // Save to context
    dispatch({ type: 'SET_USER', payload: updatedUser });
    
    // Save to AsyncStorage for persistence
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedUser));
      console.log('Profile saved to AsyncStorage:', updatedUser);
    } catch (error) {
      console.error('Error saving profile to AsyncStorage:', error);
    }
    
    setIsEditingProfile(false);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  const saveGoals = () => {
    dispatch({ type: 'SET_NUTRITION_GOALS', payload: customGoals });
    setIsEditingGoals(false);
    Alert.alert('Success', 'Nutrition goals updated successfully!');
  };

  const getGoalDescription = (goal: string) => {
    switch (goal) {
      case 'lose_weight':
        return 'Create a calorie deficit to lose weight safely';
      case 'maintain_weight':
        return 'Maintain your current weight with balanced nutrition';
      case 'gain_weight':
        return 'Increase calorie intake to gain weight gradually';
      case 'build_muscle':
        return 'Focus on protein and strength training for muscle growth';
      default:
        return '';
    }
  };

  const getActivityDescription = (level: string) => {
    switch (level) {
      case 'sedentary':
        return 'Little to no exercise';
      case 'light':
        return 'Light exercise 1-3 days/week';
      case 'moderate':
        return 'Moderate exercise 3-5 days/week';
      case 'active':
        return 'Heavy exercise 6-7 days/week';
      case 'very_active':
        return 'Very heavy exercise, physical job';
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

  const renderGoalsSection = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Nutrition Goals</Text>
        <View style={styles.cardHeaderActions}>
          <TouchableOpacity onPress={calculateRecommendedGoals} style={styles.calculateButton}>
            <Ionicons name="calculator" size={20} color="#B9A68D" />
            <Text style={styles.calculateButtonText}>Calculate</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsEditingGoals(!isEditingGoals)}>
            <Ionicons 
              name={isEditingGoals ? "checkmark" : "pencil"} 
              size={24} 
              color="#B9A68D" 
            />
          </TouchableOpacity>
        </View>
      </View>

      {isEditingGoals ? (
        <View>
          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Calories</Text>
              <TextInput
                style={styles.input}
                value={customGoals.calories.toString()}
                onChangeText={(text) => setCustomGoals({ ...customGoals, calories: parseInt(text) || 0 })}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Protein (g)</Text>
              <TextInput
                style={styles.input}
                value={customGoals.protein.toString()}
                onChangeText={(text) => setCustomGoals({ ...customGoals, protein: parseInt(text) || 0 })}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Carbs (g)</Text>
              <TextInput
                style={styles.input}
                value={customGoals.carbs.toString()}
                onChangeText={(text) => setCustomGoals({ ...customGoals, carbs: parseInt(text) || 0 })}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Fat (g)</Text>
              <TextInput
                style={styles.input}
                value={customGoals.fat.toString()}
                onChangeText={(text) => setCustomGoals({ ...customGoals, fat: parseInt(text) || 0 })}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Fiber (g)</Text>
              <TextInput
                style={styles.input}
                value={customGoals.fiber.toString()}
                onChangeText={(text) => setCustomGoals({ ...customGoals, fiber: parseInt(text) || 0 })}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Sugar (g)</Text>
              <TextInput
                style={styles.input}
                value={customGoals.sugar.toString()}
                onChangeText={(text) => setCustomGoals({ ...customGoals, sugar: parseInt(text) || 0 })}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveGoals}>
            <Text style={styles.saveButtonText}>Save Goals</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View style={styles.goalsGrid}>
            <View style={styles.goalItem}>
              <Text style={styles.goalValue}>{customGoals.calories}</Text>
              <Text style={styles.goalLabel}>Calories</Text>
            </View>
            <View style={styles.goalItem}>
              <Text style={styles.goalValue}>{customGoals.protein}g</Text>
              <Text style={styles.goalLabel}>Protein</Text>
            </View>
            <View style={styles.goalItem}>
              <Text style={styles.goalValue}>{customGoals.carbs}g</Text>
              <Text style={styles.goalLabel}>Carbs</Text>
            </View>
          </View>
          <View style={styles.goalsGrid}>
            <View style={styles.goalItem}>
              <Text style={styles.goalValue}>{customGoals.fat}g</Text>
              <Text style={styles.goalLabel}>Fat</Text>
            </View>
            <View style={styles.goalItem}>
              <Text style={styles.goalValue}>{customGoals.fiber}g</Text>
              <Text style={styles.goalLabel}>Fiber</Text>
            </View>
            <View style={styles.goalItem}>
              <Text style={styles.goalValue}>{customGoals.sugar}g</Text>
              <Text style={styles.goalLabel}>Sugar</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Goals & Profile</Text>
        
        {renderProfileSection()}
        {renderGoalsSection()}

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
    color: '#0090A3',
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
    marginBottom: 16,
  },
  cardHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0090A3',
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  calculateButtonText: {
    color: '#0090A3',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputHalf: {
    flex: 1,
    marginRight: 8,
  },
  inputThird: {
    flex: 1,
    marginRight: 8,
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
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  optionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionButton: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  optionButtonSelected: {
    backgroundColor: '#0090A3',
    borderColor: '#B9A68D',
  },
  optionButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  optionButtonTextSelected: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: '#0090A3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileInfo: {
    marginBottom: 16,
  },
  profileText: {
    fontSize: 16,
    color: '#2A2A2A',
    marginBottom: 8,
  },
  profileLabel: {
    fontWeight: '600',
    color: '#0090A3',
  },
  goalDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
  },
  goalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  goalItem: {
    alignItems: 'center',
    flex: 1,
  },
  goalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0090A3',
  },
  goalLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#2A2A2A',
    marginLeft: 12,
    flex: 1,
  },
});
