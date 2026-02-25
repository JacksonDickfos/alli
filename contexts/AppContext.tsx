import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  dateOfBirth?: string;
  weight?: number;
  height?: number;
  gender?: 'male' | 'female' | 'other';
  country?: string;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal?: 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'build_muscle';
  referralSource?: string;
  onboardingCompleted?: boolean;
}

export interface NutritionGoal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  servingSize: string;
  confidence: number;
  imageUri?: string;
  timestamp: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servingWeightGrams?: number;
}

export interface HydrationEntry {
  id: string;
  type: 'water' | 'tea' | 'coffee' | 'soda' | 'sports_drink' | 'milk';
  volume: number;
  timestamp: Date;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sodium?: number;
}

export interface ExerciseEntry {
  id: string;
  type: 'Walk' | 'Run' | 'Swim' | 'Gym' | 'Sport' | 'Cycling' | 'Other';
  durationMins: number;
  rpe: number;
  time: Date;
}

export interface BowelEntry {
  id: string;
  bristol: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  timestamp: Date;
}

export interface SymptomEntry {
  id: string;
  text: string;
  timestamp: Date;
}

export interface DailyLog {
  date: string;
  foods: FoodItem[];
  waterIntake: number;
  hydration: HydrationEntry[];
  exercises?: ExerciseEntry[];
  bowel?: BowelEntry[];
  symptoms?: SymptomEntry[];
  weight?: number;
  notes?: string;
}

export interface MealPlanIngredient {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  notes?: string;
}

export interface MealPlanMeal {
  id: string;
  mealType: 'breakfast' | 'snack' | 'lunch' | 'dinner';
  mealOrder: number;
  title: string;
  description?: string;
  ingredients: MealPlanIngredient[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface MealPlanDay {
  id: string;
  dayOfWeek: number;
  meals: MealPlanMeal[];
}

export interface MealPlan {
  id: string;
  userId: string;
  isTemplated: boolean;
  isActive: boolean;
  days: MealPlanDay[];
  createdAt: Date;
  updatedAt: Date;
}

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  dailyLogs: DailyLog[];
  currentDate: string;
  nutritionGoals: NutritionGoal | null;
  activeMealPlan: MealPlan | null;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    units: 'metric' | 'imperial';
    energy: 'calories' | 'kilojoules';
    notifications: boolean;
  };
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'ADD_FOOD_ITEM'; payload: FoodItem; date?: string }
  | { type: 'REMOVE_FOOD_ITEM'; payload: string; date?: string }
  | { type: 'ADD_HYDRATION_ENTRY'; payload: HydrationEntry; date?: string }
  | { type: 'REMOVE_HYDRATION_ENTRY'; payload: string; date?: string }
  | { type: 'ADD_EXERCISE_ENTRY'; payload: ExerciseEntry; date?: string }
  | { type: 'REMOVE_EXERCISE_ENTRY'; payload: string; date?: string }
  | { type: 'ADD_BOWEL_ENTRY'; payload: BowelEntry; date?: string }
  | { type: 'REMOVE_BOWEL_ENTRY'; payload: string; date?: string }
  | { type: 'ADD_SYMPTOM_ENTRY'; payload: SymptomEntry; date?: string }
  | { type: 'REMOVE_SYMPTOM_ENTRY'; payload: string; date?: string }
  | { type: 'SET_DAILY_WEIGHT'; payload: { date: string; weight: number } }
  | { type: 'UPDATE_DAILY_LOG'; payload: DailyLog }
  | { type: 'SET_NUTRITION_GOALS'; payload: NutritionGoal }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<AppState['preferences']> }
  | { type: 'SET_CURRENT_DATE'; payload: string }
  | { type: 'LOAD_DAILY_LOGS'; payload: DailyLog[] }
  | { type: 'SET_ACTIVE_MEAL_PLAN'; payload: MealPlan | null }
  | { type: 'UPDATE_MEAL_PLAN_MEAL'; payload: { dayOfWeek: number; mealOrder: number; meal: MealPlanMeal } }
  | { type: 'UPDATE_MEAL_PLAN_DAY'; payload: { dayOfWeek: number; meals: MealPlanMeal[] } };

const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  dailyLogs: [],
  currentDate: getLocalDateString(),
  nutritionGoals: null,
  activeMealPlan: null,
  preferences: {
    theme: 'light',
    units: 'metric',
    energy: 'kilojoules',
    notifications: true,
  },
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'UPDATE_USER':
      return { ...state, user: state.user ? { ...state.user, ...action.payload } : null };
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };

    case 'ADD_FOOD_ITEM': {
      const today = action.date || state.currentDate;
      const idx = state.dailyLogs.findIndex(l => l.date === today);
      if (idx >= 0) {
        const logs = [...state.dailyLogs];
        logs[idx] = { ...logs[idx], foods: [...logs[idx].foods, action.payload] };
        return { ...state, dailyLogs: logs };
      }
      return { ...state, dailyLogs: [...state.dailyLogs, { date: today, foods: [action.payload], waterIntake: 0, hydration: [] }] };
    }

    case 'REMOVE_FOOD_ITEM': {
      const today = action.date || state.currentDate;
      const idx = state.dailyLogs.findIndex(l => l.date === today);
      if (idx >= 0) {
        const logs = [...state.dailyLogs];
        logs[idx] = { ...logs[idx], foods: logs[idx].foods.filter(f => f.id !== action.payload) };
        return { ...state, dailyLogs: logs };
      }
      return state;
    }

    case 'ADD_HYDRATION_ENTRY': {
      const today = action.date || state.currentDate;
      const idx = state.dailyLogs.findIndex(l => l.date === today);
      if (idx >= 0) {
        const logs = [...state.dailyLogs];
        logs[idx] = { ...logs[idx], hydration: [...(logs[idx].hydration || []), action.payload] };
        return { ...state, dailyLogs: logs };
      }
      return { ...state, dailyLogs: [...state.dailyLogs, { date: today, foods: [], waterIntake: 0, hydration: [action.payload] }] };
    }

    case 'REMOVE_HYDRATION_ENTRY': {
      const today = action.date || state.currentDate;
      const idx = state.dailyLogs.findIndex(l => l.date === today);
      if (idx >= 0) {
        const logs = [...state.dailyLogs];
        logs[idx] = { ...logs[idx], hydration: (logs[idx].hydration || []).filter(e => e.id !== action.payload) };
        return { ...state, dailyLogs: logs };
      }
      return state;
    }

    case 'ADD_EXERCISE_ENTRY': {
      const today = action.date || state.currentDate;
      const idx = state.dailyLogs.findIndex(l => l.date === today);
      if (idx >= 0) {
        const logs = [...state.dailyLogs];
        logs[idx] = { ...logs[idx], exercises: [...(logs[idx].exercises || []), action.payload] };
        return { ...state, dailyLogs: logs };
      }
      return { ...state, dailyLogs: [...state.dailyLogs, { date: today, foods: [], waterIntake: 0, hydration: [], exercises: [action.payload] }] };
    }

    case 'REMOVE_EXERCISE_ENTRY': {
      const today = action.date || state.currentDate;
      const idx = state.dailyLogs.findIndex(l => l.date === today);
      if (idx >= 0) {
        const logs = [...state.dailyLogs];
        logs[idx] = { ...logs[idx], exercises: (logs[idx].exercises || []).filter(e => e.id !== action.payload) };
        return { ...state, dailyLogs: logs };
      }
      return state;
    }

    case 'ADD_BOWEL_ENTRY': {
      const today = action.date || state.currentDate;
      const idx = state.dailyLogs.findIndex(l => l.date === today);
      if (idx >= 0) {
        const logs = [...state.dailyLogs];
        logs[idx] = { ...logs[idx], bowel: [...(logs[idx].bowel || []), action.payload] };
        return { ...state, dailyLogs: logs };
      }
      return { ...state, dailyLogs: [...state.dailyLogs, { date: today, foods: [], waterIntake: 0, hydration: [], exercises: [], bowel: [action.payload], symptoms: [] }] };
    }

    case 'REMOVE_BOWEL_ENTRY': {
      const today = action.date || state.currentDate;
      const idx = state.dailyLogs.findIndex(l => l.date === today);
      if (idx >= 0) {
        const logs = [...state.dailyLogs];
        logs[idx] = { ...logs[idx], bowel: (logs[idx].bowel || []).filter(b => b.id !== action.payload) };
        return { ...state, dailyLogs: logs };
      }
      return state;
    }

    case 'ADD_SYMPTOM_ENTRY': {
      const today = action.date || state.currentDate;
      const idx = state.dailyLogs.findIndex(l => l.date === today);
      if (idx >= 0) {
        const logs = [...state.dailyLogs];
        logs[idx] = { ...logs[idx], symptoms: [...(logs[idx].symptoms || []), action.payload] };
        return { ...state, dailyLogs: logs };
      }
      return { ...state, dailyLogs: [...state.dailyLogs, { date: today, foods: [], waterIntake: 0, hydration: [], exercises: [], bowel: [], symptoms: [action.payload] }] };
    }

    case 'REMOVE_SYMPTOM_ENTRY': {
      const today = action.date || state.currentDate;
      const idx = state.dailyLogs.findIndex(l => l.date === today);
      if (idx >= 0) {
        const logs = [...state.dailyLogs];
        logs[idx] = { ...logs[idx], symptoms: (logs[idx].symptoms || []).filter(s => s.id !== action.payload) };
        return { ...state, dailyLogs: logs };
      }
      return state;
    }

    case 'SET_DAILY_WEIGHT': {
      const date = action.payload.date || state.currentDate;
      const idx = state.dailyLogs.findIndex(l => l.date === date);
      if (idx >= 0) {
        const logs = [...state.dailyLogs];
        logs[idx] = { ...logs[idx], weight: action.payload.weight };
        return { ...state, dailyLogs: logs };
      }
      return { ...state, dailyLogs: [...state.dailyLogs, { date, foods: [], waterIntake: 0, hydration: [], exercises: [], bowel: [], symptoms: [], weight: action.payload.weight }] };
    }

    case 'UPDATE_DAILY_LOG': {
      const idx = state.dailyLogs.findIndex(l => l.date === action.payload.date);
      if (idx >= 0) {
        const logs = [...state.dailyLogs];
        logs[idx] = action.payload;
        return { ...state, dailyLogs: logs };
      }
      return { ...state, dailyLogs: [...state.dailyLogs, action.payload] };
    }

    case 'SET_NUTRITION_GOALS':
      return { ...state, nutritionGoals: action.payload };
    case 'UPDATE_PREFERENCES':
      return { ...state, preferences: { ...state.preferences, ...action.payload } };
    case 'SET_CURRENT_DATE':
      return { ...state, currentDate: action.payload };
    case 'LOAD_DAILY_LOGS':
      return { ...state, dailyLogs: action.payload };
    case 'SET_ACTIVE_MEAL_PLAN':
      return { ...state, activeMealPlan: action.payload };

    case 'UPDATE_MEAL_PLAN_MEAL': {
      if (!state.activeMealPlan) return state;
      const { dayOfWeek, mealOrder, meal } = action.payload;
      return {
        ...state,
        activeMealPlan: {
          ...state.activeMealPlan,
          updatedAt: new Date(),
          days: state.activeMealPlan.days.map(day =>
            day.dayOfWeek === dayOfWeek
              ? { ...day, meals: day.meals.map(m => m.mealOrder === mealOrder ? meal : m) }
              : day
          ),
        },
      };
    }

    case 'UPDATE_MEAL_PLAN_DAY': {
      if (!state.activeMealPlan) return state;
      return {
        ...state,
        activeMealPlan: {
          ...state.activeMealPlan,
          updatedAt: new Date(),
          days: state.activeMealPlan.days.map(day =>
            day.dayOfWeek === action.payload.dayOfWeek ? { ...day, meals: action.payload.meals } : day
          ),
        },
      };
    }

    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  getCurrentDayLog: () => DailyLog | null;
  getTodaysTotals: () => NutritionGoal & { hydration: number };
  addFoodItem: (food: Omit<FoodItem, 'id' | 'timestamp'>, date?: string, timestamp?: Date) => Promise<{ success: boolean; error?: any }>;
  removeFoodItem: (id: string, date?: string) => Promise<void>;
  addHydrationEntry: (entry: Omit<HydrationEntry, 'id' | 'timestamp'>, date?: string) => Promise<{ success: boolean; error?: any }>;
  removeHydrationEntry: (id: string, date?: string) => void;
  addExerciseEntry: (entry: Omit<ExerciseEntry, 'id' | 'time'> & { time?: Date }, date?: string) => Promise<{ success: boolean; error?: any }>;
  removeExerciseEntry: (id: string, date?: string) => void;
  addBowelEntry: (bristol: 1 | 2 | 3 | 4 | 5 | 6 | 7, timestamp?: Date, date?: string) => Promise<{ success: boolean; error?: any }>;
  removeBowelEntry: (id: string, date?: string) => Promise<void>;
  addSymptomEntry: (text: string, timestamp?: Date, date?: string) => Promise<{ success: boolean; error?: any }>;
  removeSymptomEntry: (id: string, date?: string) => Promise<void>;
  addWeightEntry: (weightKg: number, recordedAt?: Date) => Promise<{ success: boolean; error?: any }>;
  updateWaterIntake: (amount: number) => void;
  calculateNutritionGoals: (user: User) => NutritionGoal;
  setDefaultPreferencesByLocation: (country: string) => void;
  updateUser: (userData: Partial<User>) => void;
  completeOnboarding: (profile: Partial<User>) => Promise<{ success: boolean; error?: any }>;
  refreshUser: () => Promise<void>;
  clearUser: () => Promise<void>;
  loadActiveMealPlan: () => Promise<void>;
  createTemplatedMealPlan: () => Promise<{ success: boolean; error?: any }>;
  updateMealPlanMeal: (dayOfWeek: number, mealOrder: number, meal: MealPlanMeal) => Promise<{ success: boolean; error?: any }>;
  updateMealPlanDay: (dayOfWeek: number, meals: MealPlanMeal[]) => Promise<{ success: boolean; error?: any }>;
  setActiveMealPlan: (mealPlan: MealPlan) => Promise<{ success: boolean; error?: any }>;
  createMealPlanFromChat: (days: MealPlanDay[]) => Promise<{ success: boolean; error?: any; mealPlanId?: string }>;
  addMealToPlanDay: (dayOfWeek: number, meal: Omit<MealPlanMeal, 'id'>) => Promise<{ success: boolean; error?: any }>;
  logMealPlanToDiary: (days: MealPlanDay[]) => Promise<{ success: boolean; error?: any }>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => { loadStoredData(); }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event: any) => {
      if (event === 'SIGNED_IN') {
        await loadStoredData();
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: 'SET_USER', payload: null });
        dispatch({ type: 'SET_AUTHENTICATED', payload: false });
        try { await AsyncStorage.removeItem('userProfile'); } catch (_) { }
      }
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => { saveDataToStorage(); }, [state.dailyLogs, state.nutritionGoals, state.preferences, state.user]);

  useEffect(() => {
    if (state.isAuthenticated && state.user?.id) loadActiveMealPlan();
  }, [state.isAuthenticated, state.user?.id]);

  // ─── loadStoredData ────────────────────────────────────────────────────────
  const loadStoredData = async () => {
    try {
      const [dailyLogsData, nutritionGoalsData, preferencesData, userProfileData] = await Promise.all([
        AsyncStorage.getItem('dailyLogs'),
        AsyncStorage.getItem('nutritionGoals'),
        AsyncStorage.getItem('preferences'),
        AsyncStorage.getItem('userProfile'),
      ]);

      let userProfile: User | null = null;
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData?.session?.user;

      if (dailyLogsData && !authUser?.id) {
        const logs = JSON.parse(dailyLogsData).map((log: any) => ({
          ...log,
          foods: (log.foods || []).map((f: any) => ({ ...f, timestamp: new Date(f.timestamp) })),
          hydration: (log.hydration || []).map((e: any) => ({ ...e, timestamp: new Date(e.timestamp) })),
        }));
        dispatch({ type: 'LOAD_DAILY_LOGS', payload: logs });
      }
      if (nutritionGoalsData) dispatch({ type: 'SET_NUTRITION_GOALS', payload: JSON.parse(nutritionGoalsData) });
      if (preferencesData) dispatch({ type: 'UPDATE_PREFERENCES', payload: JSON.parse(preferencesData) });

      if (authUser?.id) {
        dispatch({ type: 'SET_AUTHENTICATED', payload: true });
        try {
          const { data: userData, error } = await supabase.from('users').select('*').eq('id', authUser.id).maybeSingle();
          if (userData && !error) {
            userProfile = {
              id: userData.id, email: authUser.email || '',
              firstName: userData.first_name || undefined, lastName: userData.last_name || undefined,
              age: userData.age || undefined, dateOfBirth: userData.date_of_birth || undefined,
              weight: userData.weight || undefined, height: userData.height || undefined,
              gender: userData.gender as any || undefined, country: userData.country || undefined,
              activityLevel: userData.activity_level as any || undefined, goal: userData.goal as any || undefined,
              referralSource: userData.referral_source || undefined,
              onboardingCompleted: (userData as any).onboarding_completed ?? true,
            };
          } else {
            userProfile = { id: authUser.id, email: authUser.email || '', onboardingCompleted: true };
          }
          dispatch({ type: 'SET_USER', payload: userProfile });
          await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
        } catch {
          userProfile = { id: authUser.id, email: authUser.email || '', onboardingCompleted: true };
          dispatch({ type: 'SET_USER', payload: userProfile });
          await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
        }
      } else {
        dispatch({ type: 'SET_AUTHENTICATED', payload: false });
        if (userProfileData) {
          try {
            userProfile = JSON.parse(userProfileData);
            if (userProfile?.id) {
              dispatch({ type: 'SET_USER', payload: userProfile });
              dispatch({ type: 'SET_AUTHENTICATED', payload: true });
            }
          } catch (_) { }
        }
      }

      if (userProfile?.id) {
        await loadAllDailyLogsFromSupabase(userProfile.id);
        await loadNutritionGoalsFromSupabase(userProfile.id);
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // ─── loadAllDailyLogsFromSupabase ──────────────────────────────────────────
  const loadAllDailyLogsFromSupabase = async (userId: string) => {
    try {
      const [
        { data: foodData, error: foodError },
        { data: hydrationData, error: hydrationError },
        { data: exerciseData, error: exerciseError },
        { data: bowelData, error: bowelError },
        { data: symptomData, error: symptomError },
        { data: weightData, error: weightError },
      ] = await Promise.all([
        supabase.from('food_logs').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('hydration_logs').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('exercise_logs').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('bowel_logs').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('symptom_logs').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('weight_logs').select('*').eq('user_id', userId).order('recorded_at', { ascending: true }),
      ]);

      if (foodError) console.error('Error loading food:', foodError);
      if (hydrationError) console.error('Error loading hydration:', hydrationError);
      if (exerciseError) console.error('Error loading exercises:', exerciseError);
      if (bowelError) console.error('Error loading bowel:', bowelError);
      if (symptomError) console.error('Error loading symptoms:', symptomError);
      if (weightError) console.error('Error loading weight:', weightError);

      const foodsByDate: Record<string, FoodItem[]> = {};
      foodData?.forEach((row: any) => {
        const ts = new Date(row.created_at || row.timestamp);
        const date = getLocalDateString(ts);
        if (!foodsByDate[date]) foodsByDate[date] = [];
        foodsByDate[date].push({
          id: row.id, name: row.name, calories: row.calories ?? 0, protein: row.protein ?? 0,
          carbs: row.carbs ?? 0, fat: row.fat ?? 0, fiber: row.fiber ?? 0, sugar: row.sugar ?? 0,
          servingSize: row.serving_size ?? '1 × Serving', confidence: row.confidence ?? 0.8,
          imageUri: row.image_uri || undefined, mealType: row.meal_type ?? 'snack',
          timestamp: ts, servingWeightGrams: row.serving_weight_grams || undefined,
        });
      });

      const hydrationByDate: Record<string, HydrationEntry[]> = {};
      hydrationData?.forEach((entry: any) => {
        const date = getLocalDateString(new Date(entry.created_at));
        if (!hydrationByDate[date]) hydrationByDate[date] = [];
        hydrationByDate[date].push({
          id: entry.id, type: entry.type, volume: entry.volume,
          timestamp: new Date(entry.created_at), calories: entry.calories,
          protein: entry.protein, carbs: entry.carbs, fat: entry.fat, sodium: entry.sodium,
        });
      });

      const exercisesByDate: Record<string, ExerciseEntry[]> = {};
      exerciseData?.forEach((row: any) => {
        const date = getLocalDateString(new Date(row.created_at || row.time));
        if (!exercisesByDate[date]) exercisesByDate[date] = [];
        exercisesByDate[date].push({
          id: row.id, type: row.type, durationMins: row.duration_mins ?? 0,
          rpe: row.rpe ?? 0, time: new Date(row.created_at || row.time),
        });
      });

      const bowelByDate: Record<string, BowelEntry[]> = {};
      bowelData?.forEach((row: any) => {
        const date = getLocalDateString(new Date(row.created_at || row.timestamp));
        if (!bowelByDate[date]) bowelByDate[date] = [];
        bowelByDate[date].push({ id: row.id, bristol: row.bristol, timestamp: new Date(row.created_at || row.timestamp) });
      });

      const symptomsByDate: Record<string, SymptomEntry[]> = {};
      symptomData?.forEach((row: any) => {
        const date = getLocalDateString(new Date(row.created_at || row.timestamp));
        if (!symptomsByDate[date]) symptomsByDate[date] = [];
        symptomsByDate[date].push({ id: row.id, text: row.text, timestamp: new Date(row.created_at || row.timestamp) });
      });

      const weightByDate: Record<string, number> = {};
      let latestWeight: number | null = null;
      let latestWeightTs = 0;
      weightData?.forEach((row: any) => {
        const ts = new Date(row.recorded_at || row.created_at).getTime();
        const date = getLocalDateString(new Date(ts));
        const weight = Number(row.weight_kg ?? row.weight);
        if (!Number.isFinite(weight)) return;
        weightByDate[date] = weight;
        if (ts >= latestWeightTs) { latestWeightTs = ts; latestWeight = weight; }
      });

      const allDates = new Set<string>([
        ...Object.keys(foodsByDate), ...Object.keys(hydrationByDate),
        ...Object.keys(exercisesByDate), ...Object.keys(bowelByDate),
        ...Object.keys(symptomsByDate), ...Object.keys(weightByDate),
      ]);

      const dailyLogs: DailyLog[] = Array.from(allDates).sort().map(date => ({
        date,
        foods: foodsByDate[date] || [],
        waterIntake: 0,
        hydration: hydrationByDate[date] || [],
        exercises: exercisesByDate[date] || [],
        bowel: bowelByDate[date] || [],
        symptoms: symptomsByDate[date] || [],
        weight: weightByDate[date],
      }));

      dispatch({ type: 'LOAD_DAILY_LOGS', payload: dailyLogs });
      if (latestWeight != null && state.user) dispatch({ type: 'UPDATE_USER', payload: { weight: latestWeight } });
    } catch (error) {
      console.error('Error loading all daily logs from Supabase:', error);
    }
  };

  // ─── loadNutritionGoalsFromSupabase ───────────────────────────────────────
  const loadNutritionGoalsFromSupabase = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('nutrition_goals').select('*').eq('user_id', userId).single();
      if (error) { if (error.code !== 'PGRST116') console.error('Error loading nutrition goals:', error); return; }
      if (data) {
        const goals: NutritionGoal = {
          calories: data.calories, protein: parseFloat(data.protein), carbs: parseFloat(data.carbs),
          fat: parseFloat(data.fat), fiber: parseFloat(data.fiber), sugar: parseFloat(data.sugar),
        };
        dispatch({ type: 'SET_NUTRITION_GOALS', payload: goals });
        await AsyncStorage.setItem('nutritionGoals', JSON.stringify(goals));
      }
    } catch (error) { console.error('Error loading nutrition goals:', error); }
  };

  const saveNutritionGoalsToSupabase = async (goals: NutritionGoal, userId: string) => {
    try {
      await supabase.from('nutrition_goals').upsert(
        { user_id: userId, calories: goals.calories, protein: goals.protein, carbs: goals.carbs, fat: goals.fat, fiber: goals.fiber, sugar: goals.sugar },
        { onConflict: 'user_id' }
      );
    } catch (error) { console.error('Error saving nutrition goals:', error); }
  };

  const saveDataToStorage = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem('dailyLogs', JSON.stringify(state.dailyLogs)),
        AsyncStorage.setItem('nutritionGoals', JSON.stringify(state.nutritionGoals)),
        AsyncStorage.setItem('preferences', JSON.stringify(state.preferences)),
        state.user && AsyncStorage.setItem('userProfile', JSON.stringify(state.user)),
      ]);
      if (state.user?.id && state.nutritionGoals) await saveNutritionGoalsToSupabase(state.nutritionGoals, state.user.id);
    } catch (error) { console.error('Error saving data:', error); }
  };

  // ─── Helper functions ──────────────────────────────────────────────────────
  const getCurrentDayLog = (): DailyLog | null =>
    state.dailyLogs.find(log => log.date === state.currentDate) || null;

  const getTodaysTotals = (): NutritionGoal & { hydration: number } => {
    const log = getCurrentDayLog();
    if (!log) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, hydration: 0 };
    const food = log.foods.reduce((t, f) => ({
      calories: t.calories + f.calories, protein: t.protein + f.protein,
      carbs: t.carbs + f.carbs, fat: t.fat + f.fat, fiber: t.fiber + f.fiber, sugar: t.sugar + f.sugar,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 });
    const hydrationTotal = (log.hydration || []).reduce((t, e) => t + e.volume, 0);
    const hydMacros = (log.hydration || []).reduce((t, e) => ({
      calories: t.calories + (e.calories || 0), protein: t.protein + (e.protein || 0),
      carbs: t.carbs + (e.carbs || 0), fat: t.fat + (e.fat || 0), fiber: 0, sugar: 0,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 });
    return {
      calories: food.calories + hydMacros.calories, protein: food.protein + hydMacros.protein,
      carbs: food.carbs + hydMacros.carbs, fat: food.fat + hydMacros.fat,
      fiber: food.fiber, sugar: food.sugar, hydration: hydrationTotal,
    };
  };

  // ─── Food ──────────────────────────────────────────────────────────────────
  const addFoodItem = async (food: Omit<FoodItem, 'id' | 'timestamp'>, date?: string, customTimestamp?: Date): Promise<{ success: boolean; error?: any }> => {
    let foodTimestamp: Date;
    if (customTimestamp) {
      foodTimestamp = customTimestamp;
    } else {
      const targetDate = date || getLocalDateString();
      const now = new Date();
      const [year, month, day] = targetDate.split('-').map(Number);
      foodTimestamp = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }
    const newFood: FoodItem = { ...food, id: Date.now().toString() + Math.random().toString(36).substr(2, 9), timestamp: foodTimestamp };
    let supabaseError: any = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) {
        const { error } = await supabase.from('food_logs').insert({
          id: newFood.id, user_id: authUserId, name: newFood.name, calories: newFood.calories,
          protein: newFood.protein, carbs: newFood.carbs, fat: newFood.fat, fiber: newFood.fiber,
          sugar: newFood.sugar, serving_size: newFood.servingSize, confidence: newFood.confidence,
          image_uri: newFood.imageUri || null, meal_type: newFood.mealType,
          serving_weight_grams: newFood.servingWeightGrams || null, created_at: newFood.timestamp.toISOString(),
        });
        if (error) { console.error('Error saving food:', error); supabaseError = error; }
      }
    } catch (e) { supabaseError = e; } finally {
      dispatch({ type: 'ADD_FOOD_ITEM', payload: newFood, date });
    }
    return { success: !supabaseError, error: supabaseError };
  };

  const removeFoodItem = async (id: string, date?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) await supabase.from('food_logs').delete().eq('id', id).eq('user_id', authUserId);
    } catch (e) { console.error('Error removing food:', e); } finally {
      dispatch({ type: 'REMOVE_FOOD_ITEM', payload: id, date });
    }
  };

  // ─── Hydration ─────────────────────────────────────────────────────────────
  const addHydrationEntry = async (entry: Omit<HydrationEntry, 'id' | 'timestamp'>, date?: string): Promise<{ success: boolean; error?: any }> => {
    const newEntry: HydrationEntry = { ...entry, id: Date.now().toString() + Math.random().toString(36).substr(2, 9), timestamp: new Date() };
    let supabaseError: any = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) {
        const { error } = await supabase.from('hydration_logs').insert({
          id: newEntry.id, user_id: authUserId, type: newEntry.type, volume: newEntry.volume,
          calories: newEntry.calories || 0, protein: newEntry.protein || 0, carbs: newEntry.carbs || 0,
          fat: newEntry.fat || 0, sodium: newEntry.sodium || 0,
        });
        if (error) { supabaseError = error; }
      }
    } catch (e) { supabaseError = e; } finally {
      dispatch({ type: 'ADD_HYDRATION_ENTRY', payload: newEntry, date });
    }
    return { success: !supabaseError, error: supabaseError };
  };

  const removeHydrationEntry = async (id: string, date?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) await supabase.from('hydration_logs').delete().eq('id', id).eq('user_id', authUserId);
    } catch (e) { console.error('Error removing hydration:', e); } finally {
      dispatch({ type: 'REMOVE_HYDRATION_ENTRY', payload: id, date });
    }
  };

  const updateWaterIntake = (amount: number) => {
    const log = getCurrentDayLog();
    dispatch({ type: 'UPDATE_DAILY_LOG', payload: { date: state.currentDate, foods: log?.foods || [], waterIntake: amount, hydration: log?.hydration || [], weight: log?.weight, notes: log?.notes } });
  };

  // ─── Exercise ──────────────────────────────────────────────────────────────
  const addExerciseEntry = async (entry: Omit<ExerciseEntry, 'id' | 'time'> & { time?: Date }, date?: string): Promise<{ success: boolean; error?: any }> => {
    const newEntry: ExerciseEntry = { ...entry, id: Date.now().toString() + Math.random().toString(36).substr(2, 9), time: entry.time || new Date() };
    let supabaseError: any = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) {
        const { error } = await supabase.from('exercise_logs').insert({
          id: newEntry.id, user_id: authUserId, type: newEntry.type,
          duration_mins: newEntry.durationMins, rpe: newEntry.rpe, created_at: newEntry.time.toISOString(),
        });
        if (error) { supabaseError = error; }
      }
    } catch (e) { supabaseError = e; } finally {
      dispatch({ type: 'ADD_EXERCISE_ENTRY', payload: newEntry, date });
    }
    return { success: !supabaseError, error: supabaseError };
  };

  const removeExerciseEntry = async (id: string, date?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) await supabase.from('exercise_logs').delete().eq('id', id).eq('user_id', authUserId);
    } catch (e) { console.error('Error removing exercise:', e); } finally {
      dispatch({ type: 'REMOVE_EXERCISE_ENTRY', payload: id, date });
    }
  };

  // ─── Bowel ─────────────────────────────────────────────────────────────────
  const addBowelEntry = async (bristol: 1 | 2 | 3 | 4 | 5 | 6 | 7, timestamp?: Date, date?: string): Promise<{ success: boolean; error?: any }> => {
    const newEntry: BowelEntry = { id: Date.now().toString() + Math.random().toString(36).substr(2, 9), bristol, timestamp: timestamp || new Date() };
    let supabaseError: any = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) {
        const { error } = await supabase.from('bowel_logs').insert({ id: newEntry.id, user_id: authUserId, bristol: newEntry.bristol, created_at: newEntry.timestamp.toISOString() });
        if (error) supabaseError = error;
      }
    } catch (e) { supabaseError = e; } finally {
      dispatch({ type: 'ADD_BOWEL_ENTRY', payload: newEntry, date });
    }
    return { success: !supabaseError, error: supabaseError };
  };

  const removeBowelEntry = async (id: string, date?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) await supabase.from('bowel_logs').delete().eq('id', id).eq('user_id', authUserId);
    } catch (e) { console.error('Error removing bowel:', e); } finally {
      dispatch({ type: 'REMOVE_BOWEL_ENTRY', payload: id, date });
    }
  };

  // ─── Symptoms ──────────────────────────────────────────────────────────────
  const addSymptomEntry = async (text: string, timestamp?: Date, date?: string): Promise<{ success: boolean; error?: any }> => {
    const trimmed = (text || '').trim();
    if (!trimmed) return { success: false, error: 'Symptom text cannot be empty' };
    const newEntry: SymptomEntry = { id: Date.now().toString() + Math.random().toString(36).substr(2, 9), text: trimmed, timestamp: timestamp || new Date() };
    let supabaseError: any = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) {
        const { error } = await supabase.from('symptom_logs').insert({ id: newEntry.id, user_id: authUserId, text: newEntry.text, created_at: newEntry.timestamp.toISOString() });
        if (error) supabaseError = error;
      }
    } catch (e) { supabaseError = e; } finally {
      dispatch({ type: 'ADD_SYMPTOM_ENTRY', payload: newEntry, date });
    }
    return { success: !supabaseError, error: supabaseError };
  };

  const removeSymptomEntry = async (id: string, date?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) await supabase.from('symptom_logs').delete().eq('id', id).eq('user_id', authUserId);
    } catch (e) { console.error('Error removing symptom:', e); } finally {
      dispatch({ type: 'REMOVE_SYMPTOM_ENTRY', payload: id, date });
    }
  };

  // ─── Weight ────────────────────────────────────────────────────────────────
  const addWeightEntry = async (weightKg: number, recordedAt?: Date): Promise<{ success: boolean; error?: any }> => {
    try {
      const ts = recordedAt || new Date();
      const localDate = getLocalDateString(ts);
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (userErr || !authUserId) return { success: false, error: userErr || new Error('Not logged in') };
      const { error } = await supabase.from('weight_logs').insert({ user_id: authUserId, weight_kg: weightKg, recorded_at: ts.toISOString() });
      dispatch({ type: 'SET_DAILY_WEIGHT', payload: { date: localDate, weight: weightKg } });
      dispatch({ type: 'UPDATE_USER', payload: { weight: weightKg } });
      if (!error) { try { await supabase.from('users').update({ weight: weightKg }).eq('id', authUserId); } catch { } }
      return { success: !error, error };
    } catch (e) { return { success: false, error: e }; }
  };

  // ─── User ──────────────────────────────────────────────────────────────────
  const updateUser = (userData: Partial<User>) => dispatch({ type: 'UPDATE_USER', payload: userData });

  const clearUser = async () => {
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_AUTHENTICATED', payload: false });
    try { await AsyncStorage.removeItem('userProfile'); } catch (_) { }
  };

  const ageFromDateOfBirth = (dob: string | undefined): number | undefined => {
    if (!dob) return undefined;
    const [y, m, d] = dob.split('-').map(Number);
    if (!y || !m || !d) return undefined;
    const today = new Date();
    let age = today.getFullYear() - y;
    if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
    return age >= 0 && age <= 120 ? age : undefined;
  };

  const completeOnboarding = async (profile: Partial<User>): Promise<{ success: boolean; error?: any }> => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return { success: false, error: new Error('Not authenticated') };
      const dob = profile.dateOfBirth ?? state.user?.dateOfBirth ?? undefined;
      const age = ageFromDateOfBirth(dob) ?? profile.age ?? state.user?.age ?? null;
      const row: Record<string, unknown> = {
        id: userId, email: authData.user?.email ?? state.user?.email ?? '',
        first_name: profile.firstName ?? state.user?.firstName ?? null,
        last_name: profile.lastName ?? state.user?.lastName ?? null,
        date_of_birth: dob ?? null, country: profile.country ?? state.user?.country ?? null, age,
        weight: profile.weight ?? state.user?.weight ?? null, height: profile.height ?? state.user?.height ?? null,
        gender: profile.gender ?? state.user?.gender ?? null, goal: profile.goal ?? state.user?.goal ?? null,
        activity_level: profile.activityLevel ?? state.user?.activityLevel ?? null, onboarding_completed: true,
      };
      const { error } = await supabase.from('users').upsert(row, { onConflict: 'id' });
      if (error) return { success: false, error };
      const updatedUser: User = { id: state.user!.id, email: state.user!.email, ...state.user, ...profile, age: age ?? undefined, dateOfBirth: dob ?? undefined, onboardingCompleted: true };
      dispatch({ type: 'SET_USER', payload: updatedUser });
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedUser));
      return { success: true };
    } catch (e) { return { success: false, error: e }; }
  };

  // ─── Meal Plan ─────────────────────────────────────────────────────────────
  const loadActiveMealPlan = async () => {
    try {
      console.log('🍽️ [Meal Plan] Starting loadActiveMealPlan...');
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (!authUserId) return;

      const { data: mealPlanData, error: mealPlanError } = await supabase
        .from('meal_plans').select('*').eq('user_id', authUserId).eq('is_active', true).maybeSingle();

      if (!mealPlanData) {
        const result = await createTemplatedMealPlan();
        if (!result.success) dispatch({ type: 'SET_ACTIVE_MEAL_PLAN', payload: null });
        return;
      }

      if (mealPlanData.is_templated) {
        const { data: existingDays } = await supabase.from('meal_plan_days').select('id, day_of_week').eq('meal_plan_id', mealPlanData.id).order('day_of_week', { ascending: true });
        if (existingDays && existingDays.length === 7) {
          const { data: mondayMeals } = await supabase.from('meal_plan_meals').select('title').eq('meal_plan_day_id', existingDays[0].id).order('meal_order', { ascending: true });
          const { data: tuesdayMeals } = await supabase.from('meal_plan_meals').select('title').eq('meal_plan_day_id', existingDays[1].id).order('meal_order', { ascending: true });
          if (mondayMeals && tuesdayMeals && mondayMeals.length === tuesdayMeals.length) {
            const sameMeals = mondayMeals.every((m: any, i: number) => m.title === tuesdayMeals[i]?.title);
            if (sameMeals) await updateTemplatedMealPlanMeals(mealPlanData.id, existingDays);
          }
        }
      }

      if (mealPlanError) {
        if (mealPlanError.code === 'PGRST116') await createTemplatedMealPlan();
        return;
      }

      const { data: daysData, error: daysError } = await supabase.from('meal_plan_days').select('*').eq('meal_plan_id', mealPlanData.id).order('day_of_week', { ascending: true });
      if (daysError) return;

      const daysWithMeals = await Promise.all((daysData || []).map(async (day: any) => {
        const { data: mealsData } = await supabase.from('meal_plan_meals').select('*').eq('meal_plan_day_id', day.id).order('meal_order', { ascending: true });
        const mealsWithIngredients = await Promise.all(
          (mealsData ?? [])
            .filter((meal: any) => meal && meal.id)   // 🔥 THIS PREVENTS CRASH
            .map(async (meal: any) => {
              const { data: ingredientsData } = await supabase
                .from('meal_plan_ingredients')
                .select('*')
                .eq('meal_plan_meal_id', meal.id);

              return {
                id: meal.id,
                mealType: meal.meal_type ?? 'snack',   // 🔥 SAFE DEFAULT
                mealOrder: meal.meal_order ?? 0,
                title: meal.title ?? '',
                description: meal.description ?? '',
                calories: meal.calories ?? 0,
                protein: meal.protein ?? 0,
                carbs: meal.carbs ?? 0,
                fat: meal.fat ?? 0,
                ingredients: (ingredientsData ?? [])
                  .filter(Boolean)
                  .map((ing: any) => ({
                    id: ing.id,
                    name: ing.name,
                    quantity: ing.quantity,
                    unit: ing.unit,
                    notes: ing.notes,
                  })),
              };
            })
        );
        return { id: day.id, dayOfWeek: day.day_of_week, meals: mealsWithIngredients };
      }));

      dispatch({
        type: 'SET_ACTIVE_MEAL_PLAN', payload: {
          id: mealPlanData.id, userId: mealPlanData.user_id,
          isTemplated: mealPlanData.is_templated, isActive: mealPlanData.is_active,
          days: daysWithMeals, createdAt: new Date(mealPlanData.created_at), updatedAt: new Date(mealPlanData.updated_at),
        },
      });
    } catch (error) { console.error('❌ [Meal Plan] Error:', error); }
  };

  const WEEKLY_TEMPLATE_MEALS = [
    [{ mealType: 'breakfast', mealOrder: 0, title: 'Oatmeal with Berries', description: 'A healthy start to your day' }, { mealType: 'snack', mealOrder: 1, title: 'Apple with Almonds', description: 'Mid-morning energy boost' }, { mealType: 'lunch', mealOrder: 2, title: 'Grilled Chicken Salad', description: 'Balanced lunch option' }, { mealType: 'snack', mealOrder: 3, title: 'Greek Yogurt', description: 'Afternoon protein snack' }, { mealType: 'dinner', mealOrder: 4, title: 'Salmon with Vegetables', description: 'Nutritious evening meal' }],
    [{ mealType: 'breakfast', mealOrder: 0, title: 'Scrambled Eggs with Toast', description: 'Protein-rich breakfast' }, { mealType: 'snack', mealOrder: 1, title: 'Banana with Peanut Butter', description: 'Sustained energy snack' }, { mealType: 'lunch', mealOrder: 2, title: 'Turkey Wrap with Vegetables', description: 'Light and filling' }, { mealType: 'snack', mealOrder: 3, title: 'Mixed Nuts', description: 'Healthy fats and protein' }, { mealType: 'dinner', mealOrder: 4, title: 'Chicken Stir Fry', description: 'Quick and nutritious' }],
    [{ mealType: 'breakfast', mealOrder: 0, title: 'Greek Yogurt Parfait', description: 'Creamy and satisfying' }, { mealType: 'snack', mealOrder: 1, title: 'Orange Slices', description: 'Vitamin C boost' }, { mealType: 'lunch', mealOrder: 2, title: 'Quinoa Bowl with Vegetables', description: 'Plant-based protein' }, { mealType: 'snack', mealOrder: 3, title: 'Hummus with Veggies', description: 'Fiber-rich snack' }, { mealType: 'dinner', mealOrder: 4, title: 'Baked Cod with Sweet Potato', description: 'Lean protein and carbs' }],
    [{ mealType: 'breakfast', mealOrder: 0, title: 'Whole Grain Pancakes', description: 'Comforting morning meal' }, { mealType: 'snack', mealOrder: 1, title: 'Trail Mix', description: 'Energy-dense snack' }, { mealType: 'lunch', mealOrder: 2, title: 'Lentil Soup with Bread', description: 'Hearty and warming' }, { mealType: 'snack', mealOrder: 3, title: 'Cottage Cheese with Berries', description: 'High protein snack' }, { mealType: 'dinner', mealOrder: 4, title: 'Beef and Vegetable Skewers', description: 'Grilled and flavorful' }],
    [{ mealType: 'breakfast', mealOrder: 0, title: 'Avocado Toast with Eggs', description: 'Trendy and nutritious' }, { mealType: 'snack', mealOrder: 1, title: 'Pear with Cheese', description: 'Sweet and savory combo' }, { mealType: 'lunch', mealOrder: 2, title: 'Mediterranean Bowl', description: 'Fresh and colorful' }, { mealType: 'snack', mealOrder: 3, title: 'Protein Smoothie', description: 'Quick protein fix' }, { mealType: 'dinner', mealOrder: 4, title: 'Pasta with Marinara and Meatballs', description: 'Classic comfort food' }],
    [{ mealType: 'breakfast', mealOrder: 0, title: 'French Toast with Berries', description: 'Weekend treat' }, { mealType: 'snack', mealOrder: 1, title: 'Energy Bar', description: 'On-the-go snack' }, { mealType: 'lunch', mealOrder: 2, title: 'Burger with Side Salad', description: 'Satisfying weekend meal' }, { mealType: 'snack', mealOrder: 3, title: 'Dark Chocolate', description: 'Indulgent treat' }, { mealType: 'dinner', mealOrder: 4, title: 'Pork Tenderloin with Roasted Vegetables', description: 'Elegant weekend dinner' }],
    [{ mealType: 'breakfast', mealOrder: 0, title: 'Breakfast Burrito', description: 'Hearty weekend breakfast' }, { mealType: 'snack', mealOrder: 1, title: 'Apple Slices with Cinnamon', description: 'Simple and healthy' }, { mealType: 'lunch', mealOrder: 2, title: 'Caesar Salad with Grilled Chicken', description: 'Classic favorite' }, { mealType: 'snack', mealOrder: 3, title: 'Rice Cakes with Almond Butter', description: 'Light afternoon snack' }, { mealType: 'dinner', mealOrder: 4, title: 'Roast Chicken with Mashed Potatoes', description: 'Sunday comfort meal' }],
  ];

  const createTemplatedMealPlan = async (): Promise<{ success: boolean; error?: any }> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (!authUserId) return { success: false, error: new Error('Not logged in') };

      const { data: mealPlanData, error: mealPlanError } = await supabase.from('meal_plans').insert({ user_id: authUserId, is_templated: true, is_active: true }).select().single();
      if (mealPlanError) return { success: false, error: mealPlanError };

      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const { data: dayData, error: dayError } = await supabase.from('meal_plan_days').insert({ meal_plan_id: mealPlanData.id, day_of_week: dayOfWeek }).select().single();
        if (dayError) { console.error(`Error creating day ${dayOfWeek}:`, dayError); continue; }
        for (const meal of WEEKLY_TEMPLATE_MEALS[dayOfWeek]) {
          await supabase.from('meal_plan_meals').insert({ meal_plan_day_id: dayData.id, meal_type: meal.mealType, meal_order: meal.mealOrder, title: meal.title, description: meal.description });
        }
      }
      await loadActiveMealPlan();
      return { success: true };
    } catch (error) { return { success: false, error }; }
  };

  const updateTemplatedMealPlanMeals = async (mealPlanId: string, days: any[]) => {
    try {
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const day = days.find(d => d.day_of_week === dayOfWeek);
        if (!day) continue;
        await supabase.from('meal_plan_meals').delete().eq('meal_plan_day_id', day.id);
        for (const meal of WEEKLY_TEMPLATE_MEALS[dayOfWeek]) {
          await supabase.from('meal_plan_meals').insert({ meal_plan_day_id: day.id, meal_type: meal.mealType, meal_order: meal.mealOrder, title: meal.title, description: meal.description });
        }
      }
      await loadActiveMealPlan();
    } catch (error) { console.error('Error updating templated meals:', error); }
  };

  const updateMealPlanMeal = async (dayOfWeek: number, mealOrder: number, meal: MealPlanMeal): Promise<{ success: boolean; error?: any }> => {
    try {
      if (!state.activeMealPlan) return { success: false, error: new Error('No active meal plan') };
      const day = state.activeMealPlan.days.find(d => d.dayOfWeek === dayOfWeek);
      if (!day) return { success: false, error: new Error('Day not found') };
      const existingMeal = day.meals.find(m => m.mealOrder === mealOrder);
      if (!existingMeal) return { success: false, error: new Error('Meal not found') };
      const { error } = await supabase.from('meal_plan_meals').update({ title: meal.title, description: meal.description || null }).eq('id', existingMeal.id);
      if (error) return { success: false, error };
      await supabase.from('meal_plan_ingredients').delete().eq('meal_plan_meal_id', existingMeal.id);
      if (meal.ingredients.length > 0) {
        await supabase.from('meal_plan_ingredients').insert(meal.ingredients.map(ing => ({ meal_plan_meal_id: existingMeal.id, name: ing.name, quantity: ing.quantity || null, unit: ing.unit || null, notes: ing.notes || null })));
      }
      dispatch({ type: 'UPDATE_MEAL_PLAN_MEAL', payload: { dayOfWeek, mealOrder, meal } });
      return { success: true };
    } catch (error) { return { success: false, error }; }
  };

  const updateMealPlanDay = async (dayOfWeek: number, meals: MealPlanMeal[]): Promise<{ success: boolean; error?: any }> => {
    try {
      if (!state.activeMealPlan) return { success: false, error: new Error('No active meal plan') };
      for (const meal of meals) await updateMealPlanMeal(dayOfWeek, meal.mealOrder, meal);
      dispatch({ type: 'UPDATE_MEAL_PLAN_DAY', payload: { dayOfWeek, meals } });
      return { success: true };
    } catch (error) { return { success: false, error }; }
  };

  const setActiveMealPlan = async (mealPlan: MealPlan): Promise<{ success: boolean; error?: any }> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (!authUserId) return { success: false, error: new Error('Not logged in') };
      await supabase.from('meal_plans').update({ is_active: false }).eq('user_id', authUserId).eq('is_active', true);
      const { error } = await supabase.from('meal_plans').update({ is_active: true }).eq('id', mealPlan.id);
      if (error) return { success: false, error };
      dispatch({ type: 'SET_ACTIVE_MEAL_PLAN', payload: mealPlan });
      return { success: true };
    } catch (error) { return { success: false, error }; }
  };

  // ─── createMealPlanFromChat — FIXED: MERGES instead of replacing ───────────
  const createMealPlanFromChat = async (days: MealPlanDay[]): Promise<{ success: boolean; error?: any; mealPlanId?: string }> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (!authUserId) return { success: false, error: new Error('Not logged in') };

      console.log('🚀 [Chat Plan] Starting merge for user:', authUserId);

      // Step 1: Get existing active plan or create one (never replace the whole plan)
      let mealPlanId: string;
      const { data: existingPlan } = await supabase
        .from('meal_plans').select('id').eq('user_id', authUserId).eq('is_active', true).maybeSingle();

      if (existingPlan?.id) {
        mealPlanId = existingPlan.id;
        console.log('✅ [Chat Plan] Reusing existing plan:', mealPlanId);
      } else {
        const { data: newPlan, error: planErr } = await supabase
          .from('meal_plans').insert({ user_id: authUserId, is_templated: false, is_active: true }).select().single();
        if (planErr || !newPlan) return { success: false, error: planErr };
        mealPlanId = newPlan.id;
        console.log('✅ [Chat Plan] Created new plan:', mealPlanId);
      }

      // Step 2: For each incoming day — update if exists, create if not
      for (const day of days) {
        const { data: existingDay } = await supabase
          .from('meal_plan_days').select('id').eq('meal_plan_id', mealPlanId).eq('day_of_week', day.dayOfWeek).maybeSingle();

        let dayId: string;

        if (existingDay?.id) {
          // Day exists — replace its meals only (other days untouched)
          dayId = existingDay.id;
          console.log(`♻️  [Chat Plan] Replacing meals for dayOfWeek ${day.dayOfWeek}`);
          const { data: oldMeals } = await supabase.from('meal_plan_meals').select('id').eq('meal_plan_day_id', dayId);
          if (oldMeals && oldMeals.length > 0) {
            const oldIds = oldMeals.map((m: any) => m.id);
            await supabase.from('meal_plan_ingredients').delete().in('meal_plan_meal_id', oldIds);
            await supabase.from('meal_plan_meals').delete().eq('meal_plan_day_id', dayId);
          }
        } else {
          // Day doesn't exist yet — create it
          const { data: newDay, error: dayErr } = await supabase
            .from('meal_plan_days').insert({ meal_plan_id: mealPlanId, day_of_week: day.dayOfWeek }).select().single();
          if (dayErr || !newDay) { console.error(`❌ [Chat Plan] Error creating day ${day.dayOfWeek}:`, dayErr); continue; }
          dayId = newDay.id;
        }

        // Step 3: Insert new meals for this day
        for (const meal of day.meals) {
          const { data: mealData, error: mealErr } = await supabase.from('meal_plan_meals').insert({
            meal_plan_day_id: dayId, meal_type: meal.mealType, meal_order: meal.mealOrder,
            title: meal.title, description: meal.description || null,
            calories: meal.calories || null, protein: meal.protein || null, carbs: meal.carbs || null, fat: meal.fat || null,
          }).select().single();

          if (mealErr || !mealData) { console.error('❌ [Chat Plan] Error creating meal:', mealErr); continue; }

          if (meal.ingredients && meal.ingredients.length > 0) {
            await supabase.from('meal_plan_ingredients').insert(
              meal.ingredients.map(ing => ({ meal_plan_meal_id: mealData.id, name: ing.name, quantity: ing.quantity || null, unit: ing.unit || null, notes: ing.notes || null }))
            );
          }
        }
      }

      // Step 4: Mark as custom (not templated)
      await supabase.from('meal_plans').update({ is_templated: false, updated_at: new Date().toISOString() }).eq('id', mealPlanId);

      // Step 5: Reload
      console.log('🔄 [Chat Plan] Merge complete, reloading...');
      await loadActiveMealPlan();
      console.log('✨ [Chat Plan] Done.');

      return { success: true, mealPlanId };
    } catch (error) {
      console.error('❌ [Chat Plan] Error:', error);
      return { success: false, error };
    }
  };

  const addMealToPlanDay = async (dayOfWeek: number, meal: Omit<MealPlanMeal, 'id'>): Promise<{ success: boolean; error?: any }> => {
    try {
      if (!state.activeMealPlan) return { success: false, error: new Error('No active meal plan') };
      const day = state.activeMealPlan.days.find(d => d.dayOfWeek === dayOfWeek);
      if (!day) return { success: false, error: new Error('Day not found') };
      const { data: mealData, error: mealError } = await supabase.from('meal_plan_meals').insert({ meal_plan_day_id: day.id, meal_type: meal.mealType, meal_order: meal.mealOrder, title: meal.title, description: meal.description || null }).select().single();
      if (mealError) return { success: false, error: mealError };
      if (meal.ingredients && meal.ingredients.length > 0) {
        await supabase.from('meal_plan_ingredients').insert(meal.ingredients.map(ing => ({ meal_plan_meal_id: mealData.id, name: ing.name, quantity: ing.quantity || null, unit: ing.unit || null, notes: ing.notes || null })));
      }
      await loadActiveMealPlan();
      return { success: true };
    } catch (error) { return { success: false, error }; }
  };

  const logMealPlanToDiary = async (days: MealPlanDay[]): Promise<{ success: boolean; error?: any }> => {
    try {
      const today = new Date();
      const dayOfWeekToday = (today.getDay() + 6) % 7;
      for (const day of days) {
        let diff = day.dayOfWeek - dayOfWeekToday;
        if (diff < 0) diff += 7;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + diff);
        const dateStr = targetDate.toISOString().slice(0, 10);
        for (const meal of day.meals) {
          await addFoodItem({ name: meal.title, mealType: meal.mealType, calories: meal.calories || 0, protein: meal.protein || 0, carbs: meal.carbs || 0, fat: meal.fat || 0, fiber: 0, sugar: 0, servingSize: '1 serving', confidence: 1.0 }, dateStr);
        }
      }
      return { success: true };
    } catch (error) { return { success: false, error }; }
  };

  // ─── Preferences / Goals ───────────────────────────────────────────────────
  const setDefaultPreferencesByLocation = (country: string) => {
    const isUSA = country.toUpperCase() === 'US';
    const isMetric = ['AU', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 'NZ', 'ZA', 'IN', 'JP', 'KR', 'CN', 'BR', 'MX', 'AR', 'CL', 'CO', 'PE', 'UY', 'PY', 'BO', 'EC', 'VE', 'GY', 'SR', 'GF'].includes(country.toUpperCase());
    dispatch({ type: 'UPDATE_PREFERENCES', payload: { units: isUSA ? 'imperial' : 'metric', energy: isUSA ? 'calories' : (isMetric ? 'kilojoules' : 'calories') } });
  };

  const calculateNutritionGoals = (user: User): NutritionGoal => {
    let bmr = user.gender === 'male'
      ? 10 * (user.weight || 70) + 6.25 * (user.height || 170) - 5 * (user.age || 30) + 5
      : 10 * (user.weight || 60) + 6.25 * (user.height || 160) - 5 * (user.age || 30) - 161;
    const multipliers: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    let tdee = bmr * (multipliers[user.activityLevel || 'moderate']);
    if (user.goal === 'lose_weight') tdee *= 0.8;
    else if (user.goal === 'gain_weight') tdee *= 1.2;
    return { calories: Math.round(tdee), protein: Math.round((tdee * 0.25) / 4), carbs: Math.round((tdee * 0.45) / 4), fat: Math.round((tdee * 0.30) / 9), fiber: 25, sugar: 50 };
  };

  return (
    <AppContext.Provider value={{
      state, dispatch, getCurrentDayLog, getTodaysTotals,
      addFoodItem, removeFoodItem, addHydrationEntry, removeHydrationEntry,
      addExerciseEntry, removeExerciseEntry, addBowelEntry, removeBowelEntry,
      addSymptomEntry, removeSymptomEntry, addWeightEntry, updateWaterIntake,
      calculateNutritionGoals, setDefaultPreferencesByLocation, updateUser,
      completeOnboarding, refreshUser: loadStoredData, clearUser,
      loadActiveMealPlan, createTemplatedMealPlan, updateMealPlanMeal,
      updateMealPlanDay, setActiveMealPlan, createMealPlanFromChat,
      addMealToPlanDay, logMealPlanToDiary,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}