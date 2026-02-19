import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { LinearGradient } from 'expo-linear-gradient';

interface HomeScreenProps {
  navigation: any;
}

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const tabBarHeight = useBottomTabBarHeight();
  const { state, getCurrentDayLog, getTodaysTotals } = useApp();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');

  const currentLog = getCurrentDayLog();
  const todaysTotals = getTodaysTotals();
  const goals = state.nutritionGoals;
  const user = state.user;
  const weeklyLogs = state.dailyLogs || [];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 17) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  }, [currentTime]);

  const goToPlan = () => navigation.navigate('Plan');
  const goToDiaryAndOpenCamera = () => navigation.navigate('Nutrition', { autoLogFood: true });

  const getProgressPercentage = (current: number, goal: number) => {
    if (goal === 0) return 0;
    return (current / goal) * 100;
  };

  const formatEnergy = (calories: number) => {
    if (state.preferences.energy === 'kilojoules') {
      const kilojoules = Math.round(calories * 4.184);
      return `${kilojoules} kJ`;
    }
    return `${Math.round(calories)} cal`;
  };

  const getEnergyGoal = (calories: number) => {
    if (state.preferences.energy === 'kilojoules') {
      return Math.round(calories * 4.184);
    }
    return calories;
  };

  const getProgressColor = (percentage: number, type: 'protein' | 'carbs' | 'fat' | 'calories' = 'calories') => {
    if (type === 'protein') {
      if (percentage >= 121) return '#FF3B30'; // Red from 121% and above
      if (percentage >= 90) return '#4CAF50'; // Green 90-120%
      return '#0090A3'; // Teal default
    } else if (type === 'carbs') {
      if (percentage >= 111) return '#FF3B30'; // Red from 111% and above
      if (percentage >= 90) return '#4CAF50'; // Green 90-110%
      return '#0090A3'; // Teal default
    } else {
      // calories/energy and fat
      if (type === 'calories') {
        if (percentage >= 111) return '#FF3B30'; // Red from 111% and above
        if (percentage >= 90) return '#4CAF50'; // Green 90-110%
        return '#0090A3'; // Teal default
      } else {
        // fat
        if (percentage > 100) return '#FF3B30'; // Red over 100%
        if (percentage >= 80) return '#FF9800'; // Orange 80-100%
        return '#0090A3'; // Teal default
      }
    }
  };

  // --- Motivational message rotation (based on day index) ---
  const motivationalMessages = useMemo(
    () => [
      'Small choices add up. You\'ve got this.',
      'Fuel your body, nourish your mind.',
      'Progress over perfection—every meal counts.',
      'Hydration is your hidden superpower—sip often.',
      'Consistency beats intensity. Keep going!',
      'One healthy meal builds the next.',
      'You\'re one choice away from a better day.',
      'Eat to feel good later, not just now.',
      'Your goals love routine—stick with it.',
      'Tiny habits, huge outcomes.',
      'Health is a daily practice.',
      'Show up for yourself today.',
      'Strong body, clear mind.',
      'Nourish to flourish.',
      'Today\'s effort is tomorrow\'s energy.',
      'Your future self says "thank you."',
      'Food is information—choose wisely.',
      'Balance, not restriction.',
      'You\'re building momentum.',
      'Choose progress, not excuses.',
      'Eat like you love yourself.',
      'Stay hydrated—your cells will cheer.',
      'A better day starts with a better plate.',
      'Health is the best investment.',
      'Discipline is self-love.',
      'Healthy looks good on you.',
      'You control the next bite.',
      'Energy in, energy out—make it count.',
      'Win the morning, win the day.',
      'Your habits write your story.',
      'Better than yesterday.',
      'Eat for performance, not perfection.',
      'Every step forward matters.',
      'Keep the promise you made to yourself.',
      'Consistency creates confidence.',
      'Slow and steady works.',
      'You\'re building resilience.',
      'Feed your goals, not your doubts.',
      'Small wins compound.',
      'Your body deserves your best.',
      'Let\'s make your future proud.',
      'Mindful bites, powerful days.',
      'Nourish the life you want.',
      'This is your healthiest chapter.',
      'Healthy is a feeling—chase it.',
      'Purpose on your plate.',
      'Momentum loves action.',
      'Choose habits that love you back.',
      'You\'re closer than you think.',
      'Start where you are. Grow from here.',
    ],
    []
  );
  const messageOfTheDay = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    return motivationalMessages[dayIndex % motivationalMessages.length];
  }, [motivationalMessages]);

  // Weekly aggregates (last 7 days) for bar chart
  const weeklyData = useMemo(() => {
    const sorted = [...weeklyLogs].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const last7 = sorted.slice(-7);
    return last7.map((log: any) => ({
      date: log.date,
      calories: (log.foods || []).reduce((s: number, f: any) => s + (f.calories || 0), 0),
      protein: (log.foods || []).reduce((s: number, f: any) => s + (f.protein || 0), 0),
      carbs: (log.foods || []).reduce((s: number, f: any) => s + (f.carbs || 0), 0),
      fat: (log.foods || []).reduce((s: number, f: any) => s + (f.fat || 0), 0),
      fiber: (log.foods || []).reduce((s: number, f: any) => s + (f.fiber || 0), 0),
      water: log.waterIntake || 0,
    }));
  }, [weeklyLogs]);

  const renderProgressCard = () => {
    // Always show this card, even before the first food is logged.
    // If user goals haven't loaded yet, fall back to sensible defaults.
    const effectiveGoals = goals || {
      calories: 2000,
      protein: 120,
      carbs: 225,
      fat: 67,
      fiber: 25,
      sugar: 50,
    };

    const calorieProgress = getProgressPercentage(todaysTotals.calories, effectiveGoals.calories);
    const proteinProgress = getProgressPercentage(todaysTotals.protein, effectiveGoals.protein);
    const carbsProgress = getProgressPercentage(todaysTotals.carbs, effectiveGoals.carbs);
    const fatProgress = getProgressPercentage(todaysTotals.fat, effectiveGoals.fat);
    const fiberProgress = (() => {
      const v = todaysTotals.fiber || 0;
      if (v < 10) return 25; // red zone visual
      if (v < 25) return 65; // orange zone visual
      return 100;
    })();
    const hydrationProgress = (() => {
      const current = todaysTotals.hydration || 0;
      const target = user?.weight ? user.weight * 30 : 2000; // 30ml per kg
      return Math.min((current / target) * 100, 100);
    })();


    return (
      <View style={styles.progressCard}>
        <Text style={[styles.cardTitle, { textAlign: 'center' }]}>Today's Progress</Text>

        <View style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {state.preferences.energy === 'kilojoules' ? 'Energy (kJ)' : 'Energy (Cal)'}
            </Text>
            <Text style={styles.progressValue}>
              {formatEnergy(todaysTotals.calories)} / {formatEnergy(effectiveGoals.calories)}
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(calorieProgress, 100)}%`,
                  backgroundColor: getProgressColor(calorieProgress, 'calories')
                }
              ]}
            />
          </View>
        </View>

        <View style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Protein</Text>
            <Text style={styles.progressValue}>
              {Math.round(todaysTotals.protein)}g / {effectiveGoals.protein}g
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(proteinProgress, 100)}%`,
                  backgroundColor: getProgressColor(proteinProgress, 'protein')
                }
              ]}
            />
          </View>
        </View>


        <View style={styles.macroSummary}>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{Math.round(todaysTotals.carbs)}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{Math.round(todaysTotals.fat)}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{Math.round(todaysTotals.fiber)}g</Text>
            <Text style={styles.macroLabel}>{state.preferences.units === 'imperial' ? 'Fiber' : 'Fibre'}</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{Math.round(hydrationProgress)}%</Text>
            <Text style={styles.macroLabel}>Hydration</Text>
          </View>
        </View>

      </View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TouchableOpacity
          style={[styles.actionCard, { width: (width - 60) / 2 }]}
          onPress={goToDiaryAndOpenCamera}
        >
          <LinearGradient colors={['#0090A3', '#28657A']} style={styles.actionGradient}>
            <MaterialCommunityIcons name="camera" size={32} color="white" />
            <Text style={styles.actionText}>Log Food</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { width: (width - 60) / 2 }]}
          onPress={goToPlan}
        >
          <LinearGradient colors={['#6E006A', '#4F0232']} style={styles.actionGradient}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={32} color="white" />
            <Text style={styles.actionText}>Meal Plan</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Compliance, Sleep, Stress tiles
  const renderComplianceTiles = () => {
    // Diary completion score: count meals logged today / 3
    const mealsToday = currentLog ? new Set(currentLog.foods.map(f => f.mealType)).size : 0;
    const diaryScore = Math.min(1, mealsToday / 3);
    // Macro adherence: average of closeness to goals (if goals exist)
    let adherence = 0;
    if (goals) {
      const ratios = [
        goals.calories ? Math.min(1, (todaysTotals.calories / goals.calories)) : 0,
        goals.protein ? Math.min(1, (todaysTotals.protein / goals.protein)) : 0,
        goals.carbs ? Math.min(1, (todaysTotals.carbs / goals.carbs)) : 0,
        goals.fat ? Math.min(1, (todaysTotals.fat / goals.fat)) : 0,
      ];
      adherence = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    }
    const compliance = Math.round(((diaryScore + adherence) / 2) * 100);
    const complianceColor = compliance >= 100 ? '#2ECC71' : compliance >= 80 ? '#1ABC9C' : compliance >= 50 ? '#FF9800' : '#FF3B30';

    const Tile = ({ icon, label, value, onPress }: any) => (
      <TouchableOpacity style={styles.tile} onPress={onPress}>
        <MaterialCommunityIcons name={icon} size={22} color="#B9A68D" />
        <Text style={styles.tileLabel}>{label}</Text>
        {value !== undefined && <Text style={styles.tileValue}>{value}</Text>}
      </TouchableOpacity>
    );

    // Second row (these were previously shown in TestFlight): Momentum / XP / Streak
    // We don't currently have persisted gamification state, so these are derived from existing logs.
    const computeStreakDays = () => {
      const logs = [...(weeklyLogs || [])].sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      if (!logs.length) return 0;
      const today = new Date();
      let streak = 0;
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const log = logs.find((l: any) => l.date === key);
        const hasAnyFood = !!(log && Array.isArray(log.foods) && log.foods.length > 0);
        if (hasAnyFood) streak += 1;
        else break;
      }
      return streak;
    };

    const streakDays = computeStreakDays();
    const xp = Math.max(0, Math.round(compliance * 10)); // simple derived XP
    const momentum = Math.max(0, Math.min(100, Math.round(((diaryScore + adherence) / 2) * 100))); // same scale as compliance

    return (
      <>
        <View style={styles.tilesRow}>
          <TouchableOpacity
            style={[styles.tile, { borderColor: complianceColor, borderWidth: 1 }]}
            onPress={() => { /* future: navigate to insights */ }}
          >
            <MaterialCommunityIcons name="check-circle" size={22} color={complianceColor} />
            <Text style={styles.tileLabel}>Compliance</Text>
            <Text style={[styles.tileValue, { color: complianceColor }]}>{compliance}%</Text>
          </TouchableOpacity>
          <Tile icon="sleep" label="Sleep" value={"—"} onPress={() => Alert.alert('', 'Shhhh... I\'m still building this...')} />
          <Tile icon="heart-pulse" label="Stress" value={"—"} onPress={() => Alert.alert('', 'Shhhh... I\'m still building this...')} />
        </View>
        <View style={styles.tilesRow}>
          <Tile icon="trending-up" label="Momentum" value={`${momentum}%`} onPress={() => Alert.alert('', 'Shhhh... I\'m still building this...')} />
          <Tile icon="star-circle" label="XP" value={String(xp)} onPress={() => Alert.alert('', 'Shhhh... I\'m still building this...')} />
          <Tile icon="fire" label="Streak" value={streakDays ? `${streakDays}d` : "—"} onPress={() => Alert.alert('', 'Shhhh... I\'m still building this...')} />
        </View>
      </>
    );
  };



  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          // Ensure content scrolls fully above the tab bar (prevents cards being cut off).
          { paddingBottom: tabBarHeight },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>
              {user?.firstName || 'Alli'}! 👋
            </Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.time}>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.date}>
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Alli motivation bubble */}
        <View style={styles.motivationBubble}>
          <Image source={require('../assets/Chick2copy.png')} style={styles.alliFaceIcon} />
          <Text style={styles.motivationBubbleText}>{messageOfTheDay}</Text>
        </View>

        {/* Upcoming Meal Section */}
        {(() => {
          const activePlan = state.activeMealPlan;
          if (!activePlan) {
            return (
              <View style={styles.cardBlock}>
                <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Upcoming Meal</Text>
                <View style={styles.upcomingMealRow}>
                  <Image source={require('../assets/meal2.png')} style={styles.upcomingMealHeroImage} />
                  <View style={styles.upcomingMealButtonOverlay} pointerEvents="box-none">
                    <TouchableOpacity onPress={goToPlan} activeOpacity={0.85}>
                      <LinearGradient
                        colors={['#0090A3', '#6E006A', '#4F0232']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.consultButton, styles.upcomingMealButtonGradient]}
                      >
                        <Text style={styles.consultText}>Generate Meal Plan</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }

          // Find current day's plan
          const todayIdx = (new Date().getDay() + 6) % 7; // Monday=0
          const todayPlan = activePlan.days.find(d => d.dayOfWeek === todayIdx);

          if (!todayPlan) {
            return (
              <View style={styles.cardBlock}>
                <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Upcoming Meal</Text>
                <View style={styles.upcomingMealRow}>
                  <Image source={require('../assets/meal2.png')} style={styles.upcomingMealHeroImage} />
                  <View style={styles.upcomingMealButtonOverlay} pointerEvents="box-none">
                    <TouchableOpacity onPress={goToPlan} activeOpacity={0.85}>
                      <LinearGradient
                        colors={['#0090A3', '#6E006A', '#4F0232']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.consultButton, styles.upcomingMealButtonGradient]}
                      >
                        <Text style={styles.consultText}>View Meal Plan</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }

          // Find next meal
          const currentHour = new Date().getHours();
          let nextMeal = todayPlan.meals.find(m => {
            if (m.mealType === 'breakfast' && currentHour < 10) return true;
            if (m.mealType === 'snack' && m.mealOrder === 1 && currentHour < 12) return true;
            if (m.mealType === 'lunch' && currentHour < 15) return true;
            if (m.mealType === 'snack' && m.mealOrder === 3 && currentHour < 17) return true;
            if (m.mealType === 'dinner' && currentHour < 22) return true;
            return false;
          });

          if (!nextMeal) nextMeal = todayPlan.meals[todayPlan.meals.length - 1];

          return (
            <View style={styles.cardBlock}>
              <View style={styles.upcomingHeader}>
                <Text style={styles.sectionTitle}>Upcoming: {nextMeal.mealType.charAt(0).toUpperCase() + nextMeal.mealType.slice(1)}</Text>
                <TouchableOpacity onPress={goToPlan}>
                  <Text style={styles.seeAllText}>Full Plan</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.plannedMealCard}>
                <View style={styles.plannedMealInfo}>
                  <Text style={styles.plannedMealTitle}>{nextMeal.title}</Text>
                  {nextMeal.description ? <Text style={styles.plannedMealDesc}>{nextMeal.description}</Text> : null}
                  <View style={styles.plannedMealMacros}>
                    {nextMeal.calories ? <Text style={styles.plannedMacroText}>{nextMeal.calories} cal</Text> : null}
                    {nextMeal.protein ? <Text style={styles.plannedMacroText}>{nextMeal.protein}g Protein</Text> : null}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.logPlannedBtn}
                  onPress={async () => {
                    const food = {
                      name: nextMeal!.title,
                      mealType: nextMeal!.mealType as any,
                      calories: nextMeal!.calories || 0,
                      protein: nextMeal!.protein || 0,
                      carbs: nextMeal!.carbs || 0,
                      fat: nextMeal!.fat || 0,
                      fiber: 0,
                      sugar: 0,
                      servingSize: '1 serving',
                      confidence: 1.0,
                    };
                    const res = await (state as any).addFoodItem(food);
                    if (res.success) {
                      Alert.alert('Success', `${nextMeal!.title} added to your diary!`);
                    } else {
                      Alert.alert('Error', 'Failed to add meal.');
                    }
                  }}
                >
                  <LinearGradient colors={['#0090A3', '#28657A']} style={styles.logPlannedGradient}>
                    <Ionicons name="add" size={24} color="#fff" />
                    <Text style={styles.logPlannedText}>Log</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}


        {/* Progress Card + Weekly swipe */}
        {renderProgressCard()}


        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Compliance / Sleep / Stress tiles */}
        {renderComplianceTiles()}

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
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    color: '#666',
    fontWeight: '400',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0090A3',
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2A2A2A',
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  progressCard: {
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
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0090A3',
    marginBottom: 16,
  },
  progressItem: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2A2A',
  },
  progressValue: {
    fontSize: 14,
    color: '#666',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  macroSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 0,
    borderTopWidth: 0,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0090A3',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  motivationBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6E1D8',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  motivationBubbleText: {
    marginLeft: 8,
    color: '#2A2A2A',
  },
  alliFaceIcon: {
    width: 32,
    height: 32,
    resizeMode: 'cover',
    borderRadius: 16,
    marginTop: 4,
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  plannedMealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  plannedMealInfo: {
    flex: 1,
  },
  plannedMealTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A2A2A',
  },
  plannedMealDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  plannedMealMacros: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  plannedMacroText: {
    fontSize: 12,
    color: '#0090A3',
    fontWeight: '600',
  },
  logPlannedBtn: {
    marginLeft: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  logPlannedGradient: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logPlannedText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  motivationText: {

    fontSize: 16,
    color: '#2A2A2A',
    marginLeft: 12,
    flex: 1,
  },
  cardBlock: {
    backgroundColor: '#E6E1D8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  upcomingMealRow: {
    position: 'relative',
  },
  upcomingMealHeroImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  upcomingMealButtonOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    zIndex: 2,
  },
  upcomingMealButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButton: {
    backgroundColor: '#0090A3',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  consultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  consultText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  tilesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  tile: {
    backgroundColor: '#E6E1D8',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    width: (width - 60) / 3,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  tileLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 6,
  },
  tileValue: {
    fontWeight: '700',
    color: '#2A2A2A',
    marginTop: 4,
  },
  quickActionsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0090A3',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 16,
    color: '#0090A3',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 60) / 2,
    height: 100,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
});
