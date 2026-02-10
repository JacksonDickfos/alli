import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../contexts/AppContext';
import type { MealPlan, MealPlanDay, MealPlanMeal } from '../contexts/AppContext';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  snack: 'Snack',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

export default function MealPlanScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { state, loadActiveMealPlan, createTemplatedMealPlan } = useApp();
  const activeMealPlan = (state as any).activeMealPlan as MealPlan | null;

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadActiveMealPlan();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleGenerateMealPlan = async () => {
    setCreating(true);
    try {
      const result = await createTemplatedMealPlan();
      if (result.success) {
        await loadActiveMealPlan();
      } else {
        Alert.alert('Error', result.error?.message || 'Could not create meal plan.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    } finally {
      setCreating(false);
    }
  };

  if (loading && !activeMealPlan && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0090A3" />
          <Text style={styles.loadingText}>Loading meal plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasPlan = activeMealPlan?.days?.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#0090A3" />
        }
      >
        <Text style={styles.screenTitle}>Meal Plan</Text>

        {!hasPlan ? (
          <View style={styles.emptyBlock}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={56} color="#0090A3" />
            <Text style={styles.emptyTitle}>No meal plan yet</Text>
            <Text style={styles.emptySubtitle}>
              Generate a weekly plan with breakfast, lunch, dinner and snacks for each day.
            </Text>
            <TouchableOpacity
              onPress={handleGenerateMealPlan}
              disabled={creating}
              activeOpacity={0.85}
              style={styles.generateButtonWrap}
            >
              <LinearGradient
                colors={['#0090A3', '#6E006A', '#4F0232']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.generateButton}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={22} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.generateButtonText}>Generate Meal Plan</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeMealPlan.days
              .slice()
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
              .map((day: MealPlanDay) => (
                <View key={day.id} style={styles.dayCard}>
                  <Text style={styles.dayTitle}>{DAY_NAMES[day.dayOfWeek] ?? `Day ${day.dayOfWeek + 1}`}</Text>
                  {(day.meals || [])
                    .slice()
                    .sort((a, b) => a.mealOrder - b.mealOrder)
                    .map((meal: MealPlanMeal) => (
                      <View key={meal.id} style={styles.mealRow}>
                        <View style={styles.mealTypeBadge}>
                          <Text style={styles.mealTypeText}>
                            {MEAL_TYPE_LABELS[meal.mealType] || meal.mealType}
                          </Text>
                        </View>
                        <View style={styles.mealContent}>
                          <Text style={styles.mealTitle}>{meal.title}</Text>
                          {meal.description ? (
                            <Text style={styles.mealDescription} numberOfLines={2}>
                              {meal.description}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                </View>
              ))}
          </>
        )}
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
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0090A3',
    marginBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyBlock: {
    backgroundColor: '#E6E1D8',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2A2A2A',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 22,
  },
  generateButtonWrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  generateButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  dayCard: {
    backgroundColor: '#E6E1D8',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
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
  dayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0090A3',
    marginBottom: 14,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mealTypeBadge: {
    backgroundColor: '#0090A3',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    minWidth: 88,
  },
  mealTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  mealContent: {
    flex: 1,
    marginLeft: 12,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2A2A',
  },
  mealDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
});
