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
import { NutritionGoal } from '../contexts/AppContext';

interface GoalsOnlyScreenProps {
  navigation: any;
}

export default function GoalsOnlyScreen({ navigation }: GoalsOnlyScreenProps) {
  const { state, dispatch, calculateNutritionGoals } = useApp();
  const [customGoals, setCustomGoals] = useState<NutritionGoal>({
    calories: 2000,
    protein: 120,
    carbs: 225,
    fat: 67,
    fiber: 25,
    sugar: 50,
  });
  const [isEditingGoals, setIsEditingGoals] = useState(false);

  useEffect(() => {
    if (state.customGoals) {
      setCustomGoals(state.customGoals);
    }
  }, [state.customGoals]);

  const calculateRecommendedGoals = async () => {
    try {
      const calculated = await calculateNutritionGoals();
      if (calculated) {
        setCustomGoals(calculated);
        Alert.alert('Success', 'Goals calculated based on your profile!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to calculate goals. Please check your profile information.');
    }
  };

  const saveGoals = async () => {
    try {
      dispatch({ type: 'SET_CUSTOM_GOALS', payload: customGoals });
      await AsyncStorage.setItem('customGoals', JSON.stringify(customGoals));
      setIsEditingGoals(false);
      Alert.alert('Success', 'Goals saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save goals');
    }
  };

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
                onChangeText={(text) => setCustomGoals({...customGoals, calories: parseInt(text) || 0})}
                keyboardType="numeric"
                placeholder="2000"
              />
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Protein (g)</Text>
              <TextInput
                style={styles.input}
                value={customGoals.protein.toString()}
                onChangeText={(text) => setCustomGoals({...customGoals, protein: parseInt(text) || 0})}
                keyboardType="numeric"
                placeholder="120"
              />
            </View>
          </View>
          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Carbs (g)</Text>
              <TextInput
                style={styles.input}
                value={customGoals.carbs.toString()}
                onChangeText={(text) => setCustomGoals({...customGoals, carbs: parseInt(text) || 0})}
                keyboardType="numeric"
                placeholder="225"
              />
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Fat (g)</Text>
              <TextInput
                style={styles.input}
                value={customGoals.fat.toString()}
                onChangeText={(text) => setCustomGoals({...customGoals, fat: parseInt(text) || 0})}
                keyboardType="numeric"
                placeholder="67"
              />
            </View>
          </View>
          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Fiber (g)</Text>
              <TextInput
                style={styles.input}
                value={customGoals.fiber.toString()}
                onChangeText={(text) => setCustomGoals({...customGoals, fiber: parseInt(text) || 0})}
                keyboardType="numeric"
                placeholder="25"
              />
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Sugar (g)</Text>
              <TextInput
                style={styles.input}
                value={customGoals.sugar.toString()}
                onChangeText={(text) => setCustomGoals({...customGoals, sugar: parseInt(text) || 0})}
                keyboardType="numeric"
                placeholder="50"
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
        <Text style={styles.title}>Goals</Text>
        
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
  cardHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EEE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  calculateButtonText: {
    color: '#B9A68D',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
  goalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  goalItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F3EEE7',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
  },
  goalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0090A3',
    marginBottom: 4,
  },
  goalLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
