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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { LinearGradient } from 'expo-linear-gradient';

interface HomeScreenProps {
  navigation: any;
}

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { state, getCurrentDayLog, getTodaysTotals } = useApp();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const pulse = useRef(new Animated.Value(1)).current;

  const currentLog = getCurrentDayLog();
  const todaysTotals = getTodaysTotals();
  const goals = state.nutritionGoals;
  const user = state.user;
  const weeklyLogs = (state as any).dailyLogs || [];

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

  // Subtle pulsing for consult CTA
  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]).start(() => animate());
    };
    animate();
  }, [pulse]);

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
    if (!goals) return null;

    const calorieProgress = getProgressPercentage(todaysTotals.calories, goals.calories);
    const proteinProgress = getProgressPercentage(todaysTotals.protein, goals.protein);
    const carbsProgress = getProgressPercentage(todaysTotals.carbs, goals.carbs);
    const fatProgress = getProgressPercentage(todaysTotals.fat, goals.fat);
    const fiberProgress = (() => {
      const v = todaysTotals.fiber || 0;
      if (v < 10) return 25; // red zone visual
      if (v < 25) return 65; // orange zone visual
      return 100;
    })();
    const hydrationProgress = (() => {
      const current = todaysTotals.hydration || 0;
      const target = state.userProfile?.weight ? state.userProfile.weight * 30 : 2000; // 30ml per kg
      return Math.min((current / target) * 100, 100);
    })();

    return (
      <View style={styles.progressCard}>
        <Text style={styles.cardTitle}>Today's Progress</Text>
        
        <View style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {state.preferences.energy === 'kilojoules' ? 'Energy (kJ)' : 'Energy (Cal)'}
            </Text>
            <Text style={styles.progressValue}>
              {formatEnergy(todaysTotals.calories)} / {formatEnergy(goals.calories)}
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
              {Math.round(todaysTotals.protein)}g / {goals.protein}g
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
            <Text style={styles.macroLabel}>Fibre</Text>
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
          onPress={() => navigation.navigate('Nutrition')}
        >
          <LinearGradient colors={['#0090A3', '#28657A']} style={styles.actionGradient}>
            <MaterialCommunityIcons name="camera" size={32} color="white" />
            <Text style={styles.actionText}>Log Food</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionCard, { width: (width - 60) / 2 }]}
          onPress={() => navigation.navigate('Goals')}
        >
          <LinearGradient colors={['#6E006A', '#4F0232']} style={styles.actionGradient}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={32} color="white" />
            <Text style={styles.actionText}>Meal Plan</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Upcoming consult CTA (placeholder using pulsing)
  const renderConsult = () => {
    const lastConsultDays = 8; // Placeholder derived metric; wire when available
    const needsAttention = lastConsultDays >= 7;
    const animatedStyle = { transform: [{ scale: pulse }] };
    // Use the same blue → purple → red gradient as the Alli pulsing button
    const gradient = ['#0090A3', '#6E006A', '#4F0232'];
    return (
      <View style={styles.cardBlock}>
        <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Upcoming Consult</Text>
        <Animated.View style={animatedStyle}>
          <TouchableOpacity onPress={() => navigation.navigate('Alli')}>
            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.consultButton}>
              <MaterialCommunityIcons name="calendar" size={22} color="#fff" />
              <Text style={styles.consultText}>Schedule Consult With Me</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  // Compliance, Sleep, Stress tiles
  const renderComplianceTiles = () => {
    // Diary completion score: count meals logged today / 3
    const mealsToday = currentLog ? new Set(currentLog.foods.map(f=>f.mealType)).size : 0;
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
      adherence = ratios.reduce((a,b)=>a+b,0) / ratios.length;
    }
    const compliance = Math.round(((diaryScore + adherence) / 2) * 100);
    const complianceColor = compliance >= 100 ? '#2ECC71' : compliance >= 80 ? '#1ABC9C' : compliance >= 50 ? '#FF9800' : '#FF3B30';

    const Tile = ({ icon, label, value, onPress } : any) => (
      <TouchableOpacity style={styles.tile} onPress={onPress}>
        <MaterialCommunityIcons name={icon} size={22} color="#B9A68D" />
        <Text style={styles.tileLabel}>{label}</Text>
        {value !== undefined && <Text style={styles.tileValue}>{value}</Text>}
      </TouchableOpacity>
    );

    return (
      <View style={styles.tilesRow}>
        <TouchableOpacity style={[styles.tile, { borderColor: complianceColor, borderWidth: 1 }]}
          onPress={() => { /* could navigate to insights */ }}>
          <MaterialCommunityIcons name="check-circle" size={22} color={complianceColor} />
          <Text style={styles.tileLabel}>Compliance</Text>
          <Text style={[styles.tileValue, { color: complianceColor }]}>{compliance}%</Text>
        </TouchableOpacity>
        <Tile icon="sleep" label="Sleep" value={"—"} onPress={() => alert('Connect a device: Apple Watch, Fitbit, Oura, etc.')} />
        <Tile icon="heart-pulse" label="Stress" value={"—"} onPress={() => alert('Connect a device or enter manually')} />
      </View>
    );
  };



  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
          <Image source={require('../assets/Chick1.png')} style={styles.alliFaceIcon} />
          <Text style={styles.motivationBubbleText}>{messageOfTheDay}</Text>
        </View>

        {/* Upcoming Meal (fallback to generate) */}
        <View style={styles.cardBlock}>
          <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Upcoming Meal</Text>
          <View style={styles.upcomingMealRow}>
            <Image source={require('../assets/meal2.png')} style={styles.upcomingMealHeroImage} />
            <View style={styles.upcomingMealButtonOverlay} pointerEvents="box-none">
              <TouchableOpacity onPress={() => navigation.navigate('Goals')} activeOpacity={0.85}>
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

        {/* Progress Card + Weekly swipe */}
        {renderProgressCard()}


        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Upcoming consult */}
        {renderConsult()}

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
    paddingBottom: 100,
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
    marginBottom: 16,
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
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
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
