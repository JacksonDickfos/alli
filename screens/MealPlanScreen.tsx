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
  Modal,
  TextInput,
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
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [newMeal, setNewMeal] = useState({
    title: '',
    description: '',
    mealType: 'breakfast' as any,
  });
  const [loggingPlan, setLoggingPlan] = useState(false);


  const refresh = async () => {
    setRefreshing(true);
    await loadActiveMealPlan();
    setRefreshing(false);
  };

  const handleManualAdd = async () => {
    if (!newMeal.title || selectedDay === null) {
      Alert.alert('Error', 'Please enter a meal title.');
      return;
    }

    setLoading(true);
    try {
      const result = await (state as any).addMealToPlanDay(selectedDay, {
        title: newMeal.title,
        description: newMeal.description,
        mealType: newMeal.mealType,
        mealOrder: 0, // Simplified
        ingredients: [],
      });
      if (result.success) {
        setShowMealModal(false);
        setNewMeal({ title: '', description: '', mealType: 'breakfast' });
      } else {
        Alert.alert('Error', 'Failed to add meal.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogPlanToDiary = async () => {
    if (!activeMealPlan) return;
    setLoggingPlan(true);
    try {
      const result = await (state as any).logMealPlanToDiary(activeMealPlan.days);
      if (result.success) {
        Alert.alert('Success', 'Today\'s meals from your plan have been added to your Diary!');
      } else {
        Alert.alert('Error', 'Failed to log plan to diary.');
      }
    } finally {
      setLoggingPlan(false);
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
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Meal Plan</Text>
          {hasPlan && (
            <TouchableOpacity
              style={styles.logPlanBtn}
              onPress={handleLogPlanToDiary}
              disabled={loggingPlan}
            >
              <LinearGradient
                colors={['#0090A3', '#28657A']}
                style={styles.logPlanGradient}
              >
                {loggingPlan ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="journal-outline" size={18} color="#fff" />
                    <Text style={styles.logPlanText}>Log to Diary</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>


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
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayTitle}>{DAY_NAMES[day.dayOfWeek] ?? `Day ${day.dayOfWeek + 1}`}</Text>
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => {
                        setSelectedDay(day.dayOfWeek);
                        setShowMealModal(true);
                      }}
                    >
                      <Ionicons name="add-circle" size={24} color="#0090A3" />
                    </TouchableOpacity>
                  </View>

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

      {/* Manual Add Modal */}
      <Modal visible={showMealModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Meal to {selectedDay !== null ? DAY_NAMES[selectedDay] : ''}</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Meal Title (e.g. Scrambled Eggs)"
              value={newMeal.title}
              onChangeText={(text) => setNewMeal({ ...newMeal, title: text })}
            />

            <TextInput
              style={[styles.modalInput, styles.descriptionInput]}
              placeholder="Description (optional)"
              multiline
              value={newMeal.description}
              onChangeText={(text) => setNewMeal({ ...newMeal, description: text })}
            />

            <View style={styles.mealTypeRow}>
              {(['breakfast', 'snack', 'lunch', 'dinner'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeBtn, newMeal.mealType === type && styles.typeBtnActive]}
                  onPress={() => setNewMeal({ ...newMeal, mealType: type })}
                >
                  <Text style={[styles.typeBtnText, newMeal.mealType === type && styles.typeBtnTextActive]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMealModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleManualAdd}>
                <Text style={styles.saveBtnText}>Add Meal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  logPlanBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  logPlanGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  logPlanText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 10 },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0090A3',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  mealTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  typeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeBtnActive: {
    backgroundColor: '#0090A3',
    borderColor: '#0090A3',
  },
  typeBtnText: {
    fontSize: 13,
    color: '#6B7280',
  },
  typeBtnTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#0090A3',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

