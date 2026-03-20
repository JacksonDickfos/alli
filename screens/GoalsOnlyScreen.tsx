import React, { useState, useEffect, useMemo } from 'react';
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
import { useTheme } from '../contexts/ThemeContext';

interface GoalsOnlyScreenProps {
  navigation: any;
}

export default function GoalsOnlyScreen({ navigation }: GoalsOnlyScreenProps) {
  const { colors } = useTheme();
  const { state, dispatch, calculateNutritionGoals } = useApp();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: colors.headerBackground,
        },
        headerBackButton: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.12)',
        },
        headerTitle: {
          flex: 1,
          textAlign: 'center',
          fontSize: 18,
          fontWeight: '800',
          color: colors.tabBarInactive,
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
          color: colors.textPrimary,
          marginBottom: 20,
          textAlign: 'center',
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
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
          color: colors.accent,
        },
        cardHeaderActions: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        calculateButton: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surfaceMuted,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          marginRight: 12,
        },
        calculateButtonText: {
          color: colors.textMuted,
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
          color: colors.textPrimary,
          marginBottom: 8,
        },
        input: {
          backgroundColor: colors.surfaceMuted,
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          color: colors.textPrimary,
          borderWidth: 1,
          borderColor: colors.border,
        },
        saveButton: {
          backgroundColor: colors.buttonPrimary,
          borderRadius: 12,
          padding: 16,
          alignItems: 'center',
          marginTop: 16,
        },
        saveButtonText: {
          color: colors.tabBarActive,
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
          backgroundColor: colors.surfaceMuted,
          borderRadius: 12,
          padding: 16,
          marginHorizontal: 4,
        },
        goalValue: {
          fontSize: 18,
          fontWeight: 'bold',
          color: colors.accent,
          marginBottom: 4,
        },
        goalLabel: {
          fontSize: 12,
          color: colors.textSecondary,
          textAlign: 'center',
        },
      }),
    [colors]
  );

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
            <Ionicons name="calculator" size={20} color={colors.textMuted} />
            <Text style={styles.calculateButtonText}>Calculate</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsEditingGoals(!isEditingGoals)}>
            <Ionicons 
              name={isEditingGoals ? "checkmark" : "pencil"} 
              size={24} 
              color={colors.textMuted} 
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
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
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
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack?.()}
          style={styles.headerBackButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.tabBarInactive} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Goals</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderGoalsSection()}

      </ScrollView>
    </SafeAreaView>
  );
}
