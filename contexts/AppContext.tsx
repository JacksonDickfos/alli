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
  /** Set when loaded from Supabase users table; false for new users who haven't completed onboarding */
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
  servingWeightGrams?: number; // Optional: weight in grams for the base serving
}

export interface HydrationEntry {
  id: string;
  type: 'water' | 'tea' | 'coffee' | 'soda' | 'sports_drink' | 'milk';
  volume: number; // in ml
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
  rpe: number; // 1-10
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
  date: string; // YYYY-MM-DD format
  foods: FoodItem[];
  waterIntake: number; // in ml - legacy field
  hydration: HydrationEntry[]; // new hydration tracking
  exercises?: ExerciseEntry[];
  bowel?: BowelEntry[];
  symptoms?: SymptomEntry[];
  weight?: number;
  notes?: string;
}

// Meal Plan Types
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
  mealOrder: number; // 0=breakfast, 1=snack, 2=lunch, 3=snack, 4=dinner
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
  dayOfWeek: number; // 0=Monday, 6=Sunday
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

// State interface
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

// Action types
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

// Helper function to get local date string in YYYY-MM-DD format
const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Initial state
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

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_USER':
      return { ...state, user: action.payload };

    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null
      };

    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };

    case 'ADD_FOOD_ITEM':
      const today = action.date || state.currentDate;
      const existingLogIndex = state.dailyLogs.findIndex(log => log.date === today);

      if (existingLogIndex >= 0) {
        const updatedLogs = [...state.dailyLogs];
        updatedLogs[existingLogIndex] = {
          ...updatedLogs[existingLogIndex],
          foods: [...updatedLogs[existingLogIndex].foods, action.payload],
        };
        return { ...state, dailyLogs: updatedLogs };
      } else {
        const newLog: DailyLog = {
          date: today,
          foods: [action.payload],
          waterIntake: 0,
          hydration: [],
        };
        return { ...state, dailyLogs: [...state.dailyLogs, newLog] };
      }

    case 'REMOVE_FOOD_ITEM':
      const todayForRemoval = action.date || state.currentDate;
      const logIndexForRemoval = state.dailyLogs.findIndex(log => log.date === todayForRemoval);

      if (logIndexForRemoval >= 0) {
        const updatedLogsForRemoval = [...state.dailyLogs];
        updatedLogsForRemoval[logIndexForRemoval] = {
          ...updatedLogsForRemoval[logIndexForRemoval],
          foods: updatedLogsForRemoval[logIndexForRemoval].foods.filter(
            food => food.id !== action.payload
          ),
        };
        return { ...state, dailyLogs: updatedLogsForRemoval };
      }
      return state;

    case 'ADD_HYDRATION_ENTRY':
      const todayForHydration = action.date || state.currentDate;
      const existingHydrationLogIndex = state.dailyLogs.findIndex(log => log.date === todayForHydration);

      if (existingHydrationLogIndex >= 0) {
        const updatedHydrationLogs = [...state.dailyLogs];
        updatedHydrationLogs[existingHydrationLogIndex] = {
          ...updatedHydrationLogs[existingHydrationLogIndex],
          hydration: [...(updatedHydrationLogs[existingHydrationLogIndex].hydration || []), action.payload],
        };
        return { ...state, dailyLogs: updatedHydrationLogs };
      } else {
        const newHydrationLog: DailyLog = {
          date: todayForHydration,
          foods: [],
          waterIntake: 0,
          hydration: [action.payload],
        };
        return { ...state, dailyLogs: [...state.dailyLogs, newHydrationLog] };
      }

    case 'REMOVE_HYDRATION_ENTRY':
      const todayForHydrationRemoval = action.date || state.currentDate;
      const hydrationLogIndexForRemoval = state.dailyLogs.findIndex(log => log.date === todayForHydrationRemoval);

      if (hydrationLogIndexForRemoval >= 0) {
        const updatedHydrationLogsForRemoval = [...state.dailyLogs];
        updatedHydrationLogsForRemoval[hydrationLogIndexForRemoval] = {
          ...updatedHydrationLogsForRemoval[hydrationLogIndexForRemoval],
          hydration: (updatedHydrationLogsForRemoval[hydrationLogIndexForRemoval].hydration || []).filter(
            entry => entry.id !== action.payload
          ),
        };
        return { ...state, dailyLogs: updatedHydrationLogsForRemoval };
      }
      return state;

    case 'ADD_EXERCISE_ENTRY':
      {
        const today = action.date || state.currentDate;
        const idx = state.dailyLogs.findIndex(l => l.date === today);
        if (idx >= 0) {
          const logs = [...state.dailyLogs];
          const existing = logs[idx];
          logs[idx] = {
            ...existing,
            exercises: [...(existing.exercises || []), action.payload],
          };
          return { ...state, dailyLogs: logs };
        } else {
          const newLog: DailyLog = {
            date: today,
            foods: [],
            waterIntake: 0,
            hydration: [],
            exercises: [action.payload],
          };
          return { ...state, dailyLogs: [...state.dailyLogs, newLog] };
        }
      }

    case 'REMOVE_EXERCISE_ENTRY':
      {
        const today = state.currentDate;
        const idx = state.dailyLogs.findIndex(l => l.date === today);
        if (idx >= 0) {
          const logs = [...state.dailyLogs];
          const existing = logs[idx];
          logs[idx] = {
            ...existing,
            exercises: (existing.exercises || []).filter(e => e.id !== action.payload),
          };
          return { ...state, dailyLogs: logs };
        }
        return state;
      }

    case 'ADD_BOWEL_ENTRY':
      {
        const today = action.date || state.currentDate;
        const idx = state.dailyLogs.findIndex(l => l.date === today);
        if (idx >= 0) {
          const logs = [...state.dailyLogs];
          const existing = logs[idx];
          logs[idx] = {
            ...existing,
            bowel: [...(existing.bowel || []), action.payload],
          };
          return { ...state, dailyLogs: logs };
        } else {
          const newLog: DailyLog = {
            date: today,
            foods: [],
            waterIntake: 0,
            hydration: [],
            exercises: [],
            bowel: [action.payload],
            symptoms: [],
          };
          return { ...state, dailyLogs: [...state.dailyLogs, newLog] };
        }
      }

    case 'REMOVE_BOWEL_ENTRY':
      {
        const today = action.date || state.currentDate;
        const idx = state.dailyLogs.findIndex(l => l.date === today);
        if (idx >= 0) {
          const logs = [...state.dailyLogs];
          const existing = logs[idx];
          logs[idx] = {
            ...existing,
            bowel: (existing.bowel || []).filter(b => b.id !== action.payload),
          };
          return { ...state, dailyLogs: logs };
        }
        return state;
      }

    case 'ADD_SYMPTOM_ENTRY':
      {
        const today = action.date || state.currentDate;
        const idx = state.dailyLogs.findIndex(l => l.date === today);
        if (idx >= 0) {
          const logs = [...state.dailyLogs];
          const existing = logs[idx];
          logs[idx] = {
            ...existing,
            symptoms: [...(existing.symptoms || []), action.payload],
          };
          return { ...state, dailyLogs: logs };
        } else {
          const newLog: DailyLog = {
            date: today,
            foods: [],
            waterIntake: 0,
            hydration: [],
            exercises: [],
            bowel: [],
            symptoms: [action.payload],
          };
          return { ...state, dailyLogs: [...state.dailyLogs, newLog] };
        }
      }

    case 'REMOVE_SYMPTOM_ENTRY':
      {
        const today = action.date || state.currentDate;
        const idx = state.dailyLogs.findIndex(l => l.date === today);
        if (idx >= 0) {
          const logs = [...state.dailyLogs];
          const existing = logs[idx];
          logs[idx] = {
            ...existing,
            symptoms: (existing.symptoms || []).filter(s => s.id !== action.payload),
          };
          return { ...state, dailyLogs: logs };
        }
        return state;
      }

    case 'REMOVE_EXERCISE_ENTRY':
      {
        const today = state.currentDate;
        const idx = state.dailyLogs.findIndex(l => l.date === today);
        if (idx >= 0) {
          const logs = [...state.dailyLogs];
          const existing = logs[idx];
          logs[idx] = {
            ...existing,
            exercises: (existing.exercises || []).filter(e => e.id !== action.payload),
          };
          return { ...state, dailyLogs: logs };
        }
        return state;
      }

    case 'SET_DAILY_WEIGHT':
      {
        const date = action.payload.date || state.currentDate;
        const idx = state.dailyLogs.findIndex(l => l.date === date);
        if (idx >= 0) {
          const logs = [...state.dailyLogs];
          logs[idx] = { ...logs[idx], weight: action.payload.weight };
          return { ...state, dailyLogs: logs };
        }
        const newLog: DailyLog = {
          date,
          foods: [],
          waterIntake: 0,
          hydration: [],
          exercises: [],
          bowel: [],
          symptoms: [],
          weight: action.payload.weight,
        };
        return { ...state, dailyLogs: [...state.dailyLogs, newLog] };
      }

    case 'UPDATE_DAILY_LOG':
      const logIndex = state.dailyLogs.findIndex(log => log.date === action.payload.date);
      if (logIndex >= 0) {
        const updatedLogs = [...state.dailyLogs];
        updatedLogs[logIndex] = action.payload;
        return { ...state, dailyLogs: updatedLogs };
      } else {
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
      const updatedDays = state.activeMealPlan.days.map(day => {
        if (day.dayOfWeek === dayOfWeek) {
          const updatedMeals = day.meals.map(m =>
            m.mealOrder === mealOrder ? meal : m
          );
          return { ...day, meals: updatedMeals };
        }
        return day;
      });
      return {
        ...state,
        activeMealPlan: {
          ...state.activeMealPlan,
          days: updatedDays,
          updatedAt: new Date(),
        },
      };
    }

    case 'UPDATE_MEAL_PLAN_DAY': {
      if (!state.activeMealPlan) return state;
      const { dayOfWeek, meals } = action.payload;
      const updatedDays = state.activeMealPlan.days.map(day =>
        day.dayOfWeek === dayOfWeek ? { ...day, meals } : day
      );
      return {
        ...state,
        activeMealPlan: {
          ...state.activeMealPlan,
          days: updatedDays,
          updatedAt: new Date(),
        },
      };
    }

    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Helper functions
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
  /** Force-reload user from Supabase (current session). Call after sign-up/sign-in so UI shows the right account. */
  refreshUser: () => Promise<void>;
  /** Clear user from state and storage. Call on logout so the next sign-up shows the new account. */
  clearUser: () => Promise<void>;
  // Meal Plan functions
  loadActiveMealPlan: () => Promise<void>;
  createTemplatedMealPlan: () => Promise<{ success: boolean; error?: any }>;
  updateMealPlanMeal: (dayOfWeek: number, mealOrder: number, meal: MealPlanMeal) => Promise<{ success: boolean; error?: any }>;
  updateMealPlanDay: (dayOfWeek: number, meals: MealPlanMeal[]) => Promise<{ success: boolean; error?: any }>;
  setActiveMealPlan: (mealPlan: MealPlan) => Promise<{ success: boolean; error?: any }>;
  createMealPlanFromChat: (days: MealPlanDay[]) => Promise<{ success: boolean; error?: any; mealPlanId?: string }>;
  addMealToPlanDay: (dayOfWeek: number, meal: Omit<MealPlanMeal, 'id'>) => Promise<{ success: boolean; error?: any }>;
  logMealPlanToDiary: (days: MealPlanDay[]) => Promise<{ success: boolean; error?: any }>;

} | null>(null);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load data from storage on app start
  useEffect(() => {
    loadStoredData();
  }, []);

  // When auth state changes: sign in = load user; sign out = clear user so new signups get the right account
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event: any) => {
      if (event === 'SIGNED_IN') {

        await loadStoredData();
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: 'SET_USER', payload: null });
        dispatch({ type: 'SET_AUTHENTICATED', payload: false });
        try {
          await AsyncStorage.removeItem('userProfile');
        } catch (_) { }
      }
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // Save data to storage when state changes
  useEffect(() => {
    saveDataToStorage();
  }, [state.dailyLogs, state.nutritionGoals, state.preferences, state.user]);

  // Load meal plan when user is authenticated
  useEffect(() => {
    if (state.isAuthenticated && state.user?.id) {
      // Always try to load meal plan - it will auto-create if needed
      loadActiveMealPlan();
    }
  }, [state.isAuthenticated, state.user?.id]);

  const loadStoredData = async () => {
    try {
      const [dailyLogsData, nutritionGoalsData, preferencesData, userProfileData] = await Promise.all([
        AsyncStorage.getItem('dailyLogs'),
        AsyncStorage.getItem('nutritionGoals'),
        AsyncStorage.getItem('preferences'),
        AsyncStorage.getItem('userProfile'),
      ]);

      // Resolve session first so we know whether to use Supabase as source of truth for daily logs
      let userProfile: User | null = null;
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData?.session?.user;

      // Only load dailyLogs from AsyncStorage when user is NOT authenticated (e.g. offline).
      // When authenticated, we load from Supabase as source of truth so app updates never wipe data.
      if (dailyLogsData && !authUser?.id) {
        const logs = JSON.parse(dailyLogsData).map((log: any) => ({
          ...log,
          foods: (log.foods || []).map((food: any) => ({
            ...food,
            timestamp: new Date(food.timestamp),
          })),
          hydration: (log.hydration || []).map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp),
          })),
        }));
        dispatch({ type: 'LOAD_DAILY_LOGS', payload: logs });
      }

      if (nutritionGoalsData) {
        dispatch({ type: 'SET_NUTRITION_GOALS', payload: JSON.parse(nutritionGoalsData) });
      }

      if (preferencesData) {
        dispatch({ type: 'UPDATE_PREFERENCES', payload: JSON.parse(preferencesData) });
      }

      // Load user profile from Supabase or storage
      if (authUser?.id) {
        dispatch({ type: 'SET_AUTHENTICATED', payload: true });
        console.log('✅ [AppContext] Session user:', authUser.id, authUser.email);
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();
          if (userData && !error) {
            userProfile = {
              id: userData.id,
              email: authUser.email || '',
              firstName: userData.first_name || undefined,
              lastName: userData.last_name || undefined,
              age: userData.age || undefined,
              dateOfBirth: userData.date_of_birth || undefined,
              weight: userData.weight || undefined,
              height: userData.height || undefined,
              gender: userData.gender as any || undefined,
              country: userData.country || undefined,
              activityLevel: userData.activity_level as any || undefined,
              goal: userData.goal as any || undefined,
              referralSource: userData.referral_source || undefined,
              onboardingCompleted: (userData as any).onboarding_completed ?? true,
            };
            console.log('✅ Loaded user profile from Supabase:', userProfile.email);
          } else {
            userProfile = {
              id: authUser.id,
              email: authUser.email || '',
              onboardingCompleted: true,
            };
            console.log('✅ New user (no profile row), onboarding required:', userProfile.email);
          }
          dispatch({ type: 'SET_USER', payload: userProfile });
          await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
        } catch (supabaseError) {
          console.log('Supabase users fetch failed, using session email only:', supabaseError);
          userProfile = {
            id: authUser.id,
            email: authUser.email || '',
            onboardingCompleted: true,
          };
          dispatch({ type: 'SET_USER', payload: userProfile });
          await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
        }
      } else {
        dispatch({ type: 'SET_AUTHENTICATED', payload: false });
        console.log('❌ [AppContext] No authenticated user found');
        // Only use AsyncStorage when there is no current session (e.g. app reopened offline)
        if (userProfileData) {
          try {
            userProfile = JSON.parse(userProfileData);
            if (userProfile?.id) {
              dispatch({ type: 'SET_USER', payload: userProfile });
              dispatch({ type: 'SET_AUTHENTICATED', payload: true });
              console.log('Loaded user profile from storage (no session):', userProfile.email);
            }
          } catch (_) { }
        }
      }

      // When authenticated, load all daily logs from Supabase in one go (source of truth).
      // This avoids stale closure bugs and ensures users never lose data after app updates.
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

  /** Load all daily log data from Supabase in one go and dispatch once. Use this when authenticated so the DB is the source of truth and app updates never wipe data. */
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

      if (foodError) console.error('Error loading food from Supabase:', foodError);
      if (hydrationError) console.error('Error loading hydration from Supabase:', hydrationError);
      if (exerciseError) console.error('Error loading exercises from Supabase:', exerciseError);
      if (bowelError) console.error('Error loading bowel from Supabase:', bowelError);
      if (symptomError) console.error('Error loading symptoms from Supabase:', symptomError);
      if (weightError) console.error('Error loading weight from Supabase:', weightError);

      const foodsByDate: { [date: string]: FoodItem[] } = {};
      if (foodData?.length) {
        foodData.forEach((row: any) => {
          const utcTimestamp = new Date(row.created_at || row.timestamp);
          const localDate = getLocalDateString(utcTimestamp);
          if (!foodsByDate[localDate]) foodsByDate[localDate] = [];
          foodsByDate[localDate].push({
            id: row.id,
            name: row.name,
            calories: row.calories ?? 0,
            protein: row.protein ?? 0,
            carbs: row.carbs ?? 0,
            fat: row.fat ?? 0,
            fiber: row.fiber ?? 0,
            sugar: row.sugar ?? 0,
            servingSize: row.serving_size ?? '1 × Serving',
            confidence: row.confidence ?? 0.8,
            imageUri: row.image_uri || undefined,
            mealType: row.meal_type ?? 'snack',
            timestamp: utcTimestamp,
            servingWeightGrams: row.serving_weight_grams || undefined,
          });
        });
      }

      const hydrationByDate: { [date: string]: HydrationEntry[] } = {};
      if (hydrationData?.length) {
        hydrationData.forEach((entry: any) => {
          const date = getLocalDateString(new Date(entry.created_at));
          if (!hydrationByDate[date]) hydrationByDate[date] = [];
          hydrationByDate[date].push({
            id: entry.id,
            type: entry.type,
            volume: entry.volume,
            timestamp: new Date(entry.created_at),
            calories: entry.calories,
            protein: entry.protein,
            carbs: entry.carbs,
            fat: entry.fat,
            sodium: entry.sodium,
          });
        });
      }

      const exercisesByDate: { [date: string]: ExerciseEntry[] } = {};
      if (exerciseData?.length) {
        exerciseData.forEach((row: any) => {
          const date = getLocalDateString(new Date(row.created_at || row.time));
          if (!exercisesByDate[date]) exercisesByDate[date] = [];
          exercisesByDate[date].push({
            id: row.id,
            type: row.type,
            durationMins: row.duration_mins ?? row.durationMins ?? 0,
            rpe: row.rpe ?? 0,
            time: new Date(row.created_at || row.time),
          });
        });
      }

      const bowelByDate: { [date: string]: BowelEntry[] } = {};
      if (bowelData?.length) {
        bowelData.forEach((row: any) => {
          const date = getLocalDateString(new Date(row.created_at || row.timestamp));
          if (!bowelByDate[date]) bowelByDate[date] = [];
          bowelByDate[date].push({
            id: row.id,
            bristol: row.bristol,
            timestamp: new Date(row.created_at || row.timestamp),
          });
        });
      }

      const symptomsByDate: { [date: string]: SymptomEntry[] } = {};
      if (symptomData?.length) {
        symptomData.forEach((row: any) => {
          const date = getLocalDateString(new Date(row.created_at || row.timestamp));
          if (!symptomsByDate[date]) symptomsByDate[date] = [];
          symptomsByDate[date].push({
            id: row.id,
            text: row.text,
            timestamp: new Date(row.created_at || row.timestamp),
          });
        });
      }

      const weightByDate: { [date: string]: number } = {};
      let latestWeight: number | null = null;
      let latestWeightTs = 0;
      if (weightData?.length) {
        weightData.forEach((row: any) => {
          const ts = new Date(row.recorded_at || row.created_at).getTime();
          const date = getLocalDateString(new Date(ts));
          const weight = Number(row.weight_kg ?? row.weight);
          if (!Number.isFinite(weight)) return;
          weightByDate[date] = weight;
          if (ts >= latestWeightTs) {
            latestWeightTs = ts;
            latestWeight = weight;
          }
        });
      }

      const allDates = new Set<string>([
        ...Object.keys(foodsByDate),
        ...Object.keys(hydrationByDate),
        ...Object.keys(exercisesByDate),
        ...Object.keys(bowelByDate),
        ...Object.keys(symptomsByDate),
        ...Object.keys(weightByDate),
      ]);

      const dailyLogs: DailyLog[] = Array.from(allDates)
        .sort()
        .map((date) => ({
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

      if (latestWeight != null && state.user) {
        dispatch({ type: 'UPDATE_USER', payload: { weight: latestWeight } });
      }
    } catch (error) {
      console.error('Error loading all daily logs from Supabase:', error);
    }
  };

  const loadHydrationFromSupabase = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('hydration_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading hydration from Supabase:', error);
        return;
      }

      if (data && data.length > 0) {
        // Group hydration entries by date and merge with existing daily logs
        const hydrationByDate: { [date: string]: HydrationEntry[] } = {};

        data.forEach((entry: any) => {
          const date = entry.created_at.split('T')[0];
          if (!hydrationByDate[date]) {
            hydrationByDate[date] = [];
          }
          hydrationByDate[date].push({
            id: entry.id,
            type: entry.type,
            volume: entry.volume,
            timestamp: new Date(entry.created_at),
            calories: entry.calories,
            protein: entry.protein,
            carbs: entry.carbs,
            fat: entry.fat,
            sodium: entry.sodium,
          });
        });

        // Update daily logs with hydration data
        const updatedLogs = state.dailyLogs.map(log => ({
          ...log,
          hydration: hydrationByDate[log.date] || log.hydration || [],
        }));

        // Add new daily logs for dates that only have hydration
        Object.keys(hydrationByDate).forEach(date => {
          if (!updatedLogs.find(log => log.date === date)) {
            updatedLogs.push({
              date,
              foods: [],
              waterIntake: 0,
              hydration: hydrationByDate[date],
            });
          }
        });

        dispatch({ type: 'LOAD_DAILY_LOGS', payload: updatedLogs });
      }
    } catch (error) {
      console.error('Error loading hydration from Supabase:', error);
    }
  };

  const loadExercisesFromSupabase = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading exercises from Supabase:', error);
        return;
      }

      if (data && data.length > 0) {
        const exercisesByDate: { [date: string]: ExerciseEntry[] } = {};

        data.forEach((row: any) => {
          const date = (row.created_at || row.time).split('T')[0];
          if (!exercisesByDate[date]) exercisesByDate[date] = [];
          exercisesByDate[date].push({
            id: row.id,
            type: row.type,
            durationMins: row.duration_mins ?? row.durationMins ?? 0,
            rpe: row.rpe ?? 0,
            time: new Date(row.created_at || row.time),
          });
        });

        const updatedLogs = state.dailyLogs.map(log => ({
          ...log,
          exercises: exercisesByDate[log.date] || log.exercises || [],
        }));

        Object.keys(exercisesByDate).forEach(date => {
          if (!updatedLogs.find(l => l.date === date)) {
            updatedLogs.push({
              date,
              foods: [],
              waterIntake: 0,
              hydration: [],
              exercises: exercisesByDate[date],
            });
          }
        });

        dispatch({ type: 'LOAD_DAILY_LOGS', payload: updatedLogs });
      }
    } catch (error) {
      console.error('Error loading exercises from Supabase:', error);
    }
  };

  const loadFoodFromSupabase = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading food from Supabase:', error);
        return;
      }

      if (data && data.length > 0) {
        const foodsByDate: { [date: string]: FoodItem[] } = {};

        data.forEach((row: any) => {
          // Convert UTC timestamp to local timezone before extracting date
          const utcTimestamp = new Date(row.created_at || row.timestamp);
          // Use local timezone to get the correct date
          const localDate = getLocalDateString(utcTimestamp);

          if (!foodsByDate[localDate]) foodsByDate[localDate] = [];
          foodsByDate[localDate].push({
            id: row.id,
            name: row.name,
            calories: row.calories ?? 0,
            protein: row.protein ?? 0,
            carbs: row.carbs ?? 0,
            fat: row.fat ?? 0,
            fiber: row.fiber ?? 0,
            sugar: row.sugar ?? 0,
            servingSize: row.serving_size ?? '1 × Serving',
            confidence: row.confidence ?? 0.8,
            imageUri: row.image_uri || undefined,
            mealType: row.meal_type ?? 'snack',
            timestamp: utcTimestamp, // Keep original timestamp for display
            servingWeightGrams: row.serving_weight_grams || undefined,
          });
        });

        const updatedLogs = state.dailyLogs.map(log => ({
          ...log,
          foods: foodsByDate[log.date] || log.foods || [],
        }));

        Object.keys(foodsByDate).forEach(date => {
          if (!updatedLogs.find(l => l.date === date)) {
            updatedLogs.push({
              date,
              foods: foodsByDate[date],
              waterIntake: 0,
              hydration: [],
            });
          }
        });

        dispatch({ type: 'LOAD_DAILY_LOGS', payload: updatedLogs });
      }
    } catch (error) {
      console.error('Error loading food from Supabase:', error);
    }
  };

  const loadBowelFromSupabase = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('bowel_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading bowel logs from Supabase:', error);
        return;
      }

      if (data && data.length > 0) {
        const bowelByDate: { [date: string]: BowelEntry[] } = {};

        data.forEach((row: any) => {
          const date = (row.created_at || row.timestamp).split('T')[0];
          if (!bowelByDate[date]) bowelByDate[date] = [];
          bowelByDate[date].push({
            id: row.id,
            bristol: row.bristol,
            timestamp: new Date(row.created_at || row.timestamp),
          });
        });

        const updatedLogs = state.dailyLogs.map(log => ({
          ...log,
          bowel: bowelByDate[log.date] || log.bowel || [],
        }));

        Object.keys(bowelByDate).forEach(date => {
          const existingLog = updatedLogs.find(l => l.date === date);
          if (existingLog) {
            existingLog.bowel = bowelByDate[date];
          } else {
            updatedLogs.push({
              date,
              foods: [],
              waterIntake: 0,
              hydration: [],
              bowel: bowelByDate[date],
            });
          }
        });

        dispatch({ type: 'LOAD_DAILY_LOGS', payload: updatedLogs });
      }
    } catch (error) {
      console.error('Error loading bowel logs from Supabase:', error);
    }
  };

  const loadSymptomFromSupabase = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('symptom_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading symptom logs from Supabase:', error);
        return;
      }

      if (data && data.length > 0) {
        const symptomsByDate: { [date: string]: SymptomEntry[] } = {};

        data.forEach((row: any) => {
          const date = (row.created_at || row.timestamp).split('T')[0];
          if (!symptomsByDate[date]) symptomsByDate[date] = [];
          symptomsByDate[date].push({
            id: row.id,
            text: row.text,
            timestamp: new Date(row.created_at || row.timestamp),
          });
        });

        const updatedLogs = state.dailyLogs.map(log => ({
          ...log,
          symptoms: symptomsByDate[log.date] || log.symptoms || [],
        }));

        Object.keys(symptomsByDate).forEach(date => {
          const existingLog = updatedLogs.find(l => l.date === date);
          if (existingLog) {
            existingLog.symptoms = symptomsByDate[date];
          } else {
            updatedLogs.push({
              date,
              foods: [],
              waterIntake: 0,
              hydration: [],
              symptoms: symptomsByDate[date],
            });
          }
        });

        dispatch({ type: 'LOAD_DAILY_LOGS', payload: updatedLogs });
      }
    } catch (error) {
      console.error('Error loading symptom logs from Supabase:', error);
    }
  };

  const loadWeightFromSupabase = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: true });

      if (error) {
        console.error('Error loading weight logs from Supabase:', error);
        return;
      }

      if (!data || data.length === 0) return;

      // For Diary, store latest weight per local date in dailyLogs.weight
      const weightByDate: { [date: string]: { weight: number; ts: Date } } = {};
      let latestWeight: { weight: number; ts: Date } | null = null;

      data.forEach((row: any) => {
        const ts = new Date(row.recorded_at || row.created_at);
        const date = getLocalDateString(ts);
        const weight = Number(row.weight_kg ?? row.weight);
        if (!Number.isFinite(weight)) return;

        const prev = weightByDate[date];
        if (!prev || ts.getTime() >= prev.ts.getTime()) {
          weightByDate[date] = { weight, ts };
        }

        if (!latestWeight || ts.getTime() >= latestWeight.ts.getTime()) {
          latestWeight = { weight, ts };
        }
      });

      const updatedLogs = state.dailyLogs.map(log => ({
        ...log,
        weight: weightByDate[log.date]?.weight ?? log.weight,
      }));

      Object.keys(weightByDate).forEach(date => {
        if (!updatedLogs.find(l => l.date === date)) {
          updatedLogs.push({
            date,
            foods: [],
            waterIntake: 0,
            hydration: [],
            exercises: [],
            bowel: [],
            symptoms: [],
            weight: weightByDate[date].weight,
          });
        }
      });

      dispatch({ type: 'LOAD_DAILY_LOGS', payload: updatedLogs });

      // Keep user's current weight updated for hydration targets
      if (latestWeight && state.user) {
        dispatch({ type: 'UPDATE_USER', payload: { weight: latestWeight.weight } });
      }
    } catch (e) {
      console.error('Error loading weight logs from Supabase:', e);
    }
  };

  const loadNutritionGoalsFromSupabase = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('nutrition_goals')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No nutrition goals found - that's okay, user hasn't set them yet
          console.log('No nutrition goals found in Supabase for user');
          return;
        }
        console.error('Error loading nutrition goals from Supabase:', error);
        return;
      }

      if (data) {
        const goals: NutritionGoal = {
          calories: data.calories,
          protein: parseFloat(data.protein.toString()),
          carbs: parseFloat(data.carbs.toString()),
          fat: parseFloat(data.fat.toString()),
          fiber: parseFloat(data.fiber.toString()),
          sugar: parseFloat(data.sugar.toString()),
        };
        dispatch({ type: 'SET_NUTRITION_GOALS', payload: goals });
        // Also save to AsyncStorage for offline access
        await AsyncStorage.setItem('nutritionGoals', JSON.stringify(goals));
      }
    } catch (error) {
      console.error('Error loading nutrition goals from Supabase:', error);
    }
  };

  const saveNutritionGoalsToSupabase = async (goals: NutritionGoal, userId: string): Promise<{ success: boolean; error?: any }> => {
    try {
      const { data, error } = await supabase
        .from('nutrition_goals')
        .upsert({
          user_id: userId,
          calories: goals.calories,
          protein: goals.protein,
          carbs: goals.carbs,
          fat: goals.fat,
          fiber: goals.fiber,
          sugar: goals.sugar,
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving nutrition goals to Supabase:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error saving nutrition goals to Supabase:', error);
      return { success: false, error };
    }
  };

  const saveDataToStorage = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem('dailyLogs', JSON.stringify(state.dailyLogs)),
        AsyncStorage.setItem('nutritionGoals', JSON.stringify(state.nutritionGoals)),
        AsyncStorage.setItem('preferences', JSON.stringify(state.preferences)),
        state.user && AsyncStorage.setItem('userProfile', JSON.stringify(state.user)),
      ]);

      // Also save nutrition goals to Supabase if user is authenticated
      if (state.user?.id && state.nutritionGoals) {
        await saveNutritionGoalsToSupabase(state.nutritionGoals, state.user.id);
      }
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  // Helper functions
  const getCurrentDayLog = (): DailyLog | null => {
    return state.dailyLogs.find(log => log.date === state.currentDate) || null;
  };

  const getTodaysTotals = (): NutritionGoal & { hydration: number } => {
    const currentLog = getCurrentDayLog();
    if (!currentLog) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, hydration: 0 };
    }

    const foodTotals = currentLog.foods.reduce(
      (totals, food) => ({
        calories: totals.calories + food.calories,
        protein: totals.protein + food.protein,
        carbs: totals.carbs + food.carbs,
        fat: totals.fat + food.fat,
        fiber: totals.fiber + food.fiber,
        sugar: totals.sugar + food.sugar,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
    );

    const hydrationTotal = (currentLog.hydration || []).reduce(
      (total, entry) => total + entry.volume, 0
    );

    const hydrationMacros = (currentLog.hydration || []).reduce(
      (totals, entry) => ({
        calories: totals.calories + (entry.calories || 0),
        protein: totals.protein + (entry.protein || 0),
        carbs: totals.carbs + (entry.carbs || 0),
        fat: totals.fat + (entry.fat || 0),
        fiber: totals.fiber + 0, // hydration doesn't add fiber
        sugar: totals.sugar + 0, // hydration doesn't add sugar
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
    );

    return {
      calories: foodTotals.calories + hydrationMacros.calories,
      protein: foodTotals.protein + hydrationMacros.protein,
      carbs: foodTotals.carbs + hydrationMacros.carbs,
      fat: foodTotals.fat + hydrationMacros.fat,
      fiber: foodTotals.fiber + hydrationMacros.fiber,
      sugar: foodTotals.sugar + hydrationMacros.sugar,
      hydration: hydrationTotal,
    };
  };

  const addFoodItem = async (food: Omit<FoodItem, 'id' | 'timestamp'>, date?: string, customTimestamp?: Date): Promise<{ success: boolean; error?: any }> => {
    // Use custom timestamp if provided, otherwise create timestamp using selected date + current local time
    // This ensures the food appears on the correct day in the user's timezone
    let foodTimestamp: Date;

    if (customTimestamp) {
      foodTimestamp = customTimestamp;
    } else {
      const targetDate = date || getLocalDateString();
      const now = new Date();
      const [year, month, day] = targetDate.split('-').map(Number);

      // Create date using local time components to avoid timezone conversion issues
      foodTimestamp = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }

    const newFood: FoodItem = {
      ...food,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: foodTimestamp,
    };

    let supabaseError: any = null;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) {
        const { error } = await supabase
          .from('food_logs')
          .insert({
            id: newFood.id,
            user_id: authUserId,
            name: newFood.name,
            calories: newFood.calories,
            protein: newFood.protein,
            carbs: newFood.carbs,
            fat: newFood.fat,
            fiber: newFood.fiber,
            sugar: newFood.sugar,
            serving_size: newFood.servingSize,
            confidence: newFood.confidence,
            image_uri: newFood.imageUri || null,
            meal_type: newFood.mealType,
            serving_weight_grams: newFood.servingWeightGrams || null,
            created_at: newFood.timestamp.toISOString(), // Store as ISO string (UTC), but timestamp is created with local timezone components
          });
        if (error) {
          console.error('Error saving food to Supabase:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            data: {
              id: newFood.id,
              user_id: authUserId,
              name: newFood.name,
              meal_type: newFood.mealType,
            }
          });
          supabaseError = error;
        }
      }
    } catch (e) {
      console.error('Error during food supabase save:', e);
      supabaseError = e;
    } finally {
      // Always add to local state even if Supabase fails (for offline support)
      dispatch({ type: 'ADD_FOOD_ITEM', payload: newFood, date });
    }

    return { success: !supabaseError, error: supabaseError };
  };

  const removeFoodItem = async (id: string, date?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) {
        const { error } = await supabase
          .from('food_logs')
          .delete()
          .eq('id', id)
          .eq('user_id', authUserId);
        if (error) {
          console.error('Error removing food from Supabase:', error);
        }
      }
    } catch (e) {
      console.error('Error during food supabase delete:', e);
    } finally {
      // Always remove from local state even if Supabase fails
      dispatch({ type: 'REMOVE_FOOD_ITEM', payload: id, date });
    }
  };

  const addHydrationEntry = async (entry: Omit<HydrationEntry, 'id' | 'timestamp'>, date?: string): Promise<{ success: boolean; error?: any }> => {
    try {
      const newEntry: HydrationEntry = {
        ...entry,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
      };

      // Get authenticated user id from Supabase session
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;

      // Save to Supabase (only if we have an authenticated user)
      let supabaseError = null;
      if (authUserId) {
        const { error } = await supabase
          .from('hydration_logs')
          .insert({
            id: newEntry.id,
            user_id: authUserId,
            type: newEntry.type,
            volume: newEntry.volume,
            calories: newEntry.calories || 0,
            protein: newEntry.protein || 0,
            carbs: newEntry.carbs || 0,
            fat: newEntry.fat || 0,
            sodium: newEntry.sodium || 0,
            // created_at will default to now() on the server
          });

        if (error) {
          console.error('Error saving hydration to Supabase:', error);
          supabaseError = error;
        }
      }

      // Always add to local state, even if Supabase fails
      dispatch({ type: 'ADD_HYDRATION_ENTRY', payload: newEntry, date });

      if (supabaseError) {
        return { success: false, error: supabaseError };
      }
      return { success: true };
    } catch (error) {
      console.error('Error adding hydration entry:', error);
      // Still add to local state even if Supabase fails
      const newEntry: HydrationEntry = {
        ...entry,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_HYDRATION_ENTRY', payload: newEntry, date });
      return { success: false, error };
    }
  };

  const removeHydrationEntry = async (id: string, date?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      // Remove from Supabase
      const { error } = authUserId ? await supabase
        .from('hydration_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', authUserId) : { error: null } as any;

      if (error) {
        console.error('Error removing hydration from Supabase:', error);
        // Still remove from local state even if Supabase fails
      }

      dispatch({ type: 'REMOVE_HYDRATION_ENTRY', payload: id, date });
    } catch (error) {
      console.error('Error removing hydration entry:', error);
      // Still remove from local state even if Supabase fails
      dispatch({ type: 'REMOVE_HYDRATION_ENTRY', payload: id, date });
    }
  };

  const updateWaterIntake = (amount: number) => {
    const currentLog = getCurrentDayLog();
    const updatedLog: DailyLog = {
      date: state.currentDate,
      foods: currentLog?.foods || [],
      waterIntake: amount,
      hydration: currentLog?.hydration || [],
      weight: currentLog?.weight,
      notes: currentLog?.notes,
    };
    dispatch({ type: 'UPDATE_DAILY_LOG', payload: updatedLog });
  };

  const addExerciseEntry = async (entry: Omit<ExerciseEntry, 'id' | 'time'> & { time?: Date }, date?: string): Promise<{ success: boolean; error?: any }> => {
    const newEntry: ExerciseEntry = {
      ...entry,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      time: entry.time || new Date(),
    };

    let supabaseError: any = null;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) {
        const { error } = await supabase
          .from('exercise_logs')
          .insert({
            id: newEntry.id,
            user_id: authUserId,
            type: newEntry.type,
            duration_mins: newEntry.durationMins,
            rpe: newEntry.rpe,
            created_at: newEntry.time.toISOString(),
          });
        if (error) {
          console.error('Error saving exercise to Supabase:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            data: {
              id: newEntry.id,
              user_id: authUserId,
              type: newEntry.type,
              duration_mins: newEntry.durationMins,
              rpe: newEntry.rpe,
              created_at: newEntry.time.toISOString(),
            }
          });
          supabaseError = error;
        }
      }
    } catch (e) {
      console.error('Error during exercise supabase save:', e);
      supabaseError = e;
    } finally {
      // Always add to local state even if Supabase fails (for offline support)
      dispatch({ type: 'ADD_EXERCISE_ENTRY', payload: newEntry, date });
    }

    return { success: !supabaseError, error: supabaseError };
  };

  const removeExerciseEntry = async (id: string, date?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) {
        const { error } = await supabase
          .from('exercise_logs')
          .delete()
          .eq('id', id)
          .eq('user_id', authUserId);
        if (error) {
          console.error('Error removing exercise from Supabase:', error);
        }
      }
    } catch (e) {
      console.error('Error during exercise supabase delete:', e);
    } finally {
      dispatch({ type: 'REMOVE_EXERCISE_ENTRY', payload: id, date });
    }
  };

  const addBowelEntry = async (bristol: 1 | 2 | 3 | 4 | 5 | 6 | 7, timestamp?: Date, date?: string) => {
    const newEntry: BowelEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      bristol,
      timestamp: timestamp || new Date(),
    };

    let supabaseError: any = null;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) {
        const { error } = await supabase
          .from('bowel_logs')
          .insert({
            id: newEntry.id,
            user_id: authUserId,
            bristol: newEntry.bristol,
            created_at: newEntry.timestamp.toISOString(),
          });
        if (error) {
          console.error('Error saving bowel entry to Supabase:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          supabaseError = error;
        }
      }
    } catch (e) {
      console.error('Error during bowel entry Supabase save:', e);
      supabaseError = e;
    } finally {
      // Always add to local state even if Supabase fails (for offline support)
      dispatch({ type: 'ADD_BOWEL_ENTRY', payload: newEntry, date });
    }

    return { success: !supabaseError, error: supabaseError };
  };

  const removeBowelEntry = async (id: string, date?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) {
        const { error } = await supabase
          .from('bowel_logs')
          .delete()
          .eq('id', id)
          .eq('user_id', authUserId);
        if (error) {
          console.error('Error removing bowel entry from Supabase:', error);
        }
      }
    } catch (e) {
      console.error('Error during bowel entry Supabase delete:', e);
    } finally {
      // Always remove from local state even if Supabase fails
      dispatch({ type: 'REMOVE_BOWEL_ENTRY', payload: id, date });
    }
  };

  const addSymptomEntry = async (text: string, timestamp?: Date, date?: string): Promise<{ success: boolean; error?: any }> => {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return { success: false, error: 'Symptom text cannot be empty' };
    }

    const newEntry: SymptomEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: trimmed,
      timestamp: timestamp || new Date(),
    };

    let supabaseError: any = null;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) {
        const { error } = await supabase
          .from('symptom_logs')
          .insert({
            id: newEntry.id,
            user_id: authUserId,
            text: newEntry.text,
            created_at: newEntry.timestamp.toISOString(),
          });
        if (error) {
          console.error('Error saving symptom entry to Supabase:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          supabaseError = error;
        }
      }
    } catch (e) {
      console.error('Error during symptom entry Supabase save:', e);
      supabaseError = e;
    } finally {
      // Always add to local state even if Supabase fails (for offline support)
      dispatch({ type: 'ADD_SYMPTOM_ENTRY', payload: newEntry, date });
    }

    return { success: !supabaseError, error: supabaseError };

    return { success: !supabaseError, error: supabaseError };
  };

  const addWeightEntry = async (weightKg: number, recordedAt?: Date): Promise<{ success: boolean; error?: any }> => {
    try {
      const ts = recordedAt || new Date();
      const localDate = getLocalDateString(ts);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (userErr || !authUserId) {
        return { success: false, error: userErr || new Error('Not logged in') };
      }

      // Save to Supabase (source of truth for "forever" tracking)
      const { error } = await supabase.from('weight_logs').insert({
        user_id: authUserId,
        weight_kg: weightKg,
        recorded_at: ts.toISOString(),
      });

      if (error) {
        console.error('Error saving weight to Supabase:', error);
        // Still update local state so UI reflects the change immediately
        dispatch({ type: 'SET_DAILY_WEIGHT', payload: { date: localDate, weight: weightKg } });
        dispatch({ type: 'UPDATE_USER', payload: { weight: weightKg } });
        return { success: false, error };
      }

      // Update local daily log + user weight
      dispatch({ type: 'SET_DAILY_WEIGHT', payload: { date: localDate, weight: weightKg } });
      dispatch({ type: 'UPDATE_USER', payload: { weight: weightKg } });

      // Also update users table current weight field (optional convenience)
      try {
        await supabase.from('users').update({ weight: weightKg }).eq('id', authUserId);
      } catch { }

      return { success: true };
    } catch (e) {
      console.error('Error during weight entry save:', e);
      return { success: false, error: e };
    }
  };

  const removeSymptomEntry = async (id: string, date?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (authUserId) {
        const { error } = await supabase
          .from('symptom_logs')
          .delete()
          .eq('id', id)
          .eq('user_id', authUserId);
        if (error) {
          console.error('Error removing symptom entry from Supabase:', error);
        }
      }
    } catch (e) {
      console.error('Error during symptom entry Supabase delete:', e);
    } finally {
      // Always remove from local state even if Supabase fails
      dispatch({ type: 'REMOVE_SYMPTOM_ENTRY', payload: id, date });
    }
  };

  const updateUser = (userData: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const clearUser = async () => {
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_AUTHENTICATED', payload: false });
    try {
      await AsyncStorage.removeItem('userProfile');
    } catch (_) { }
  };

  /** Compute age from dateOfBirth (YYYY-MM-DD). Returns undefined if invalid. */
  const ageFromDateOfBirth = (dateOfBirth: string | undefined): number | undefined => {
    if (!dateOfBirth) return undefined;
    const [y, m, d] = dateOfBirth.split('-').map(Number);
    if (!y || !m || !d) return undefined;
    const today = new Date();
    let age = today.getFullYear() - y;
    if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
    return age >= 0 && age <= 120 ? age : undefined;
  };

  /** Save onboarding profile to Supabase and mark onboarding complete. Call after user finishes onboarding steps. */
  const completeOnboarding = async (profile: Partial<User>): Promise<{ success: boolean; error?: any }> => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return { success: false, error: new Error('Not authenticated') };

      const dob = profile.dateOfBirth ?? state.user?.dateOfBirth ?? undefined;
      const age = ageFromDateOfBirth(dob) ?? profile.age ?? state.user?.age ?? null;

      const row: Record<string, unknown> = {
        id: userId,
        email: authData.user?.email ?? state.user?.email ?? '',
        first_name: profile.firstName ?? state.user?.firstName ?? null,
        last_name: profile.lastName ?? state.user?.lastName ?? null,
        date_of_birth: dob ?? null,
        country: profile.country ?? state.user?.country ?? null,
        age,
        weight: profile.weight ?? state.user?.weight ?? null,
        height: profile.height ?? state.user?.height ?? null,
        gender: profile.gender ?? state.user?.gender ?? null,
        goal: profile.goal ?? state.user?.goal ?? null,
        activity_level: profile.activityLevel ?? state.user?.activityLevel ?? null,
        onboarding_completed: true,
      };

      const { error } = await supabase.from('users').upsert(row, { onConflict: 'id' });
      if (error) {
        console.error('completeOnboarding Supabase error:', error);
        return { success: false, error };
      }

      const updatedUser: User = {
        id: state.user!.id,
        email: state.user!.email,
        ...state.user,
        ...profile,
        age: age ?? undefined,
        dateOfBirth: dob ?? undefined,
        onboardingCompleted: true,
      };
      dispatch({ type: 'SET_USER', payload: updatedUser });
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedUser));
      return { success: true };
    } catch (e) {
      console.error('completeOnboarding error:', e);
      return { success: false, error: e };
    }
  };

  // Meal Plan Functions
  const loadActiveMealPlan = async () => {
    try {
      console.log('🍽️ [Meal Plan] Starting loadActiveMealPlan...');
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (!authUserId) {
        console.log('❌ [Meal Plan] No user ID, cannot load meal plan');
        return;
      }
      console.log('✅ [Meal Plan] User ID found:', authUserId);

      // Get active meal plan
      console.log('🔍 [Meal Plan] Querying database for meal plan...');
      const { data: mealPlanData, error: mealPlanError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', authUserId)
        .eq('is_active', true)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no rows gracefully

      console.log('📊 [Meal Plan] Query result:', { mealPlanData: mealPlanData ? 'Found' : 'Not found', error: mealPlanError });

      // If no active meal plan exists, create templated one
      if (!mealPlanData) {
        console.log('📝 [Meal Plan] No meal plan found, creating templated one...');
        const result = await createTemplatedMealPlan();
        if (!result.success) {
          console.error('❌ [Meal Plan] Failed to create templated meal plan:', result.error);
          // Set a placeholder so UI doesn't stay in loading state
          dispatch({ type: 'SET_ACTIVE_MEAL_PLAN', payload: null });
        } else {
          console.log('✅ [Meal Plan] Templated meal plan created successfully');
        }
        // createTemplatedMealPlan already calls loadActiveMealPlan at the end, so we're done
        return;
      }

      // Check if templated meal plan has same meals for all days (old version) and update if needed
      if (mealPlanData.is_templated) {
        const { data: existingDays } = await supabase
          .from('meal_plan_days')
          .select('id, day_of_week')
          .eq('meal_plan_id', mealPlanData.id)
          .order('day_of_week', { ascending: true });

        if (existingDays && existingDays.length === 7) {
          // Check if all days have the same meals (old version)
          const { data: mondayMeals } = await supabase
            .from('meal_plan_meals')
            .select('title')
            .eq('meal_plan_day_id', existingDays[0].id)
            .order('meal_order', { ascending: true });

          const { data: tuesdayMeals } = await supabase
            .from('meal_plan_meals')
            .select('title')
            .eq('meal_plan_day_id', existingDays[1].id)
            .order('meal_order', { ascending: true });

          // If Monday and Tuesday have same meals, update all days with different meals
          if (mondayMeals && tuesdayMeals && mondayMeals.length === tuesdayMeals.length) {
            const sameMeals = mondayMeals.every((meal: any, index: number) => meal.title === tuesdayMeals[index]?.title);
            if (sameMeals) {

              console.log('🔄 [Meal Plan] Detected old templated plan with same meals, updating...');
              await updateTemplatedMealPlanMeals(mealPlanData.id, existingDays);
            }
          }
        }
      }

      if (mealPlanError) {
        console.error('❌ [Meal Plan] Error loading meal plan:', mealPlanError);
        // If error is just "no rows", try creating templated plan
        if (mealPlanError.code === 'PGRST116') {
          console.log('📝 [Meal Plan] No meal plan found (PGRST116), creating templated one...');
          const result = await createTemplatedMealPlan();
          if (!result.success) {
            console.error('❌ [Meal Plan] Failed to create templated meal plan:', result.error);
            dispatch({ type: 'SET_ACTIVE_MEAL_PLAN', payload: null });
          }
        }
        return;
      }

      // Load days
      const { data: daysData, error: daysError } = await supabase
        .from('meal_plan_days')
        .select('*')
        .eq('meal_plan_id', mealPlanData.id)
        .order('day_of_week', { ascending: true });

      if (daysError) {
        console.error('Error loading meal plan days:', daysError);
        return;
      }

      // Load meals for each day
      const daysWithMeals = await Promise.all(
        (daysData || []).map(async (day: any) => {
          const { data: mealsData, error: mealsError } = await supabase

            .from('meal_plan_meals')
            .select('*')
            .eq('meal_plan_day_id', day.id)
            .order('meal_order', { ascending: true });

          if (mealsError) {
            console.error('Error loading meals:', mealsError);
            return { ...day, meals: [] };
          }

          // Load ingredients for each meal
          const mealsWithIngredients = await Promise.all(
            (mealsData || []).map(async (meal: any) => {
              const { data: ingredientsData, error: ingredientsError } = await supabase

                .from('meal_plan_ingredients')
                .select('*')
                .eq('meal_plan_meal_id', meal.id);

              if (ingredientsError) {
                console.error('Error loading ingredients:', ingredientsError);
                return { ...meal, ingredients: [] };
              }

              return {
                id: meal.id,
                mealType: meal.meal_type as 'breakfast' | 'snack' | 'lunch' | 'dinner',
                mealOrder: meal.meal_order,
                title: meal.title,
                description: meal.description,
                calories: meal.calories,
                protein: meal.protein,
                carbs: meal.carbs,
                fat: meal.fat,
                ingredients: (ingredientsData || []).map((ing: any) => ({
                  id: ing.id,
                  name: ing.name,
                  quantity: ing.quantity,
                  unit: ing.unit,
                  notes: ing.notes,
                })),
              };
            })
          );

          return {
            id: day.id,
            dayOfWeek: day.day_of_week,
            meals: mealsWithIngredients,
          };
        })
      );

      const mealPlan: MealPlan = {
        id: mealPlanData.id,
        userId: mealPlanData.user_id,
        isTemplated: mealPlanData.is_templated,
        isActive: mealPlanData.is_active,
        days: daysWithMeals,
        createdAt: new Date(mealPlanData.created_at),
        updatedAt: new Date(mealPlanData.updated_at),
      };

      console.log('✅ [Meal Plan] Meal plan loaded successfully:', {
        id: mealPlan.id,
        isTemplated: mealPlan.isTemplated,
        daysCount: mealPlan.days.length,
      });
      dispatch({ type: 'SET_ACTIVE_MEAL_PLAN', payload: mealPlan });
    } catch (error) {
      console.error('❌ [Meal Plan] Error loading meal plan:', error);
    }
  };

  const createTemplatedMealPlan = async (): Promise<{ success: boolean; error?: any }> => {
    try {
      console.log('🍽️ [Meal Plan] Starting createTemplatedMealPlan...');
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (!authUserId) {
        console.error('❌ [Meal Plan] Not logged in');
        return { success: false, error: new Error('Not logged in') };
      }
      console.log('✅ [Meal Plan] User ID:', authUserId);

      // Create meal plan
      console.log('📝 [Meal Plan] Creating meal plan record...');
      const { data: mealPlanData, error: mealPlanError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: authUserId,
          is_templated: true,
          is_active: true,
        })
        .select()
        .single();

      if (mealPlanError) {
        console.error('❌ [Meal Plan] Error creating meal plan record:', mealPlanError);
        return { success: false, error: mealPlanError };
      }
      console.log('✅ [Meal Plan] Meal plan record created:', mealPlanData.id);

      // Create different templated meals for each day of the week
      const weeklyMeals = [
        // Monday
        [
          { mealType: 'breakfast', mealOrder: 0, title: 'Oatmeal with Berries', description: 'A healthy start to your day' },
          { mealType: 'snack', mealOrder: 1, title: 'Apple with Almonds', description: 'Mid-morning energy boost' },
          { mealType: 'lunch', mealOrder: 2, title: 'Grilled Chicken Salad', description: 'Balanced lunch option' },
          { mealType: 'snack', mealOrder: 3, title: 'Greek Yogurt', description: 'Afternoon protein snack' },
          { mealType: 'dinner', mealOrder: 4, title: 'Salmon with Vegetables', description: 'Nutritious evening meal' },
        ],
        // Tuesday
        [
          { mealType: 'breakfast', mealOrder: 0, title: 'Scrambled Eggs with Toast', description: 'Protein-rich breakfast' },
          { mealType: 'snack', mealOrder: 1, title: 'Banana with Peanut Butter', description: 'Sustained energy snack' },
          { mealType: 'lunch', mealOrder: 2, title: 'Turkey Wrap with Vegetables', description: 'Light and filling' },
          { mealType: 'snack', mealOrder: 3, title: 'Mixed Nuts', description: 'Healthy fats and protein' },
          { mealType: 'dinner', mealOrder: 4, title: 'Chicken Stir Fry', description: 'Quick and nutritious' },
        ],
        // Wednesday
        [
          { mealType: 'breakfast', mealOrder: 0, title: 'Greek Yogurt Parfait', description: 'Creamy and satisfying' },
          { mealType: 'snack', mealOrder: 1, title: 'Orange Slices', description: 'Vitamin C boost' },
          { mealType: 'lunch', mealOrder: 2, title: 'Quinoa Bowl with Vegetables', description: 'Plant-based protein' },
          { mealType: 'snack', mealOrder: 3, title: 'Hummus with Veggies', description: 'Fiber-rich snack' },
          { mealType: 'dinner', mealOrder: 4, title: 'Baked Cod with Sweet Potato', description: 'Lean protein and carbs' },
        ],
        // Thursday
        [
          { mealType: 'breakfast', mealOrder: 0, title: 'Whole Grain Pancakes', description: 'Comforting morning meal' },
          { mealType: 'snack', mealOrder: 1, title: 'Trail Mix', description: 'Energy-dense snack' },
          { mealType: 'lunch', mealOrder: 2, title: 'Lentil Soup with Bread', description: 'Hearty and warming' },
          { mealType: 'snack', mealOrder: 3, title: 'Cottage Cheese with Berries', description: 'High protein snack' },
          { mealType: 'dinner', mealOrder: 4, title: 'Beef and Vegetable Skewers', description: 'Grilled and flavorful' },
        ],
        // Friday
        [
          { mealType: 'breakfast', mealOrder: 0, title: 'Avocado Toast with Eggs', description: 'Trendy and nutritious' },
          { mealType: 'snack', mealOrder: 1, title: 'Pear with Cheese', description: 'Sweet and savory combo' },
          { mealType: 'lunch', mealOrder: 2, title: 'Mediterranean Bowl', description: 'Fresh and colorful' },
          { mealType: 'snack', mealOrder: 3, title: 'Protein Smoothie', description: 'Quick protein fix' },
          { mealType: 'dinner', mealOrder: 4, title: 'Pasta with Marinara and Meatballs', description: 'Classic comfort food' },
        ],
        // Saturday
        [
          { mealType: 'breakfast', mealOrder: 0, title: 'French Toast with Berries', description: 'Weekend treat' },
          { mealType: 'snack', mealOrder: 1, title: 'Energy Bar', description: 'On-the-go snack' },
          { mealType: 'lunch', mealOrder: 2, title: 'Burger with Side Salad', description: 'Satisfying weekend meal' },
          { mealType: 'snack', mealOrder: 3, title: 'Dark Chocolate', description: 'Indulgent treat' },
          { mealType: 'dinner', mealOrder: 4, title: 'Pork Tenderloin with Roasted Vegetables', description: 'Elegant weekend dinner' },
        ],
        // Sunday
        [
          { mealType: 'breakfast', mealOrder: 0, title: 'Breakfast Burrito', description: 'Hearty weekend breakfast' },
          { mealType: 'snack', mealOrder: 1, title: 'Apple Slices with Cinnamon', description: 'Simple and healthy' },
          { mealType: 'lunch', mealOrder: 2, title: 'Caesar Salad with Grilled Chicken', description: 'Classic favorite' },
          { mealType: 'snack', mealOrder: 3, title: 'Rice Cakes with Almond Butter', description: 'Light afternoon snack' },
          { mealType: 'dinner', mealOrder: 4, title: 'Roast Chicken with Mashed Potatoes', description: 'Sunday comfort meal' },
        ],
      ];

      // Create days and meals
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const { data: dayData, error: dayError } = await supabase
          .from('meal_plan_days')
          .insert({
            meal_plan_id: mealPlanData.id,
            day_of_week: dayOfWeek,
          })
          .select()
          .single();

        if (dayError) {
          console.error(`Error creating day ${dayOfWeek}:`, dayError);
          continue;
        }

        // Create meals for this day (using different meals for each day)
        const dayMeals = weeklyMeals[dayOfWeek];
        for (const meal of dayMeals) {
          const { error: mealError } = await supabase
            .from('meal_plan_meals')
            .insert({
              meal_plan_day_id: dayData.id,
              meal_type: meal.mealType,
              meal_order: meal.mealOrder,
              title: meal.title,
              description: meal.description,
            });

          if (mealError) {
            console.error(`Error creating meal for day ${dayOfWeek}, meal ${meal.mealOrder}:`, mealError);
          }
        }
      }

      console.log('✅ [Meal Plan] All days and meals created successfully, reloading...');
      // Reload the meal plan
      await loadActiveMealPlan();

      return { success: true };
    } catch (error) {
      console.error('❌ [Meal Plan] Error creating templated meal plan:', error);
      return { success: false, error };
    }
  };

  const updateTemplatedMealPlanMeals = async (mealPlanId: string, days: any[]) => {
    try {
      console.log('🔄 [Meal Plan] Updating templated meal plan with different meals for each day...');

      // Get the weekly meals array (same as in createTemplatedMealPlan)
      const weeklyMeals = [
        // Monday
        [
          { mealType: 'breakfast', mealOrder: 0, title: 'Oatmeal with Berries', description: 'A healthy start to your day' },
          { mealType: 'snack', mealOrder: 1, title: 'Apple with Almonds', description: 'Mid-morning energy boost' },
          { mealType: 'lunch', mealOrder: 2, title: 'Grilled Chicken Salad', description: 'Balanced lunch option' },
          { mealType: 'snack', mealOrder: 3, title: 'Greek Yogurt', description: 'Afternoon protein snack' },
          { mealType: 'dinner', mealOrder: 4, title: 'Salmon with Vegetables', description: 'Nutritious evening meal' },
        ],
        // Tuesday
        [
          { mealType: 'breakfast', mealOrder: 0, title: 'Scrambled Eggs with Toast', description: 'Protein-rich breakfast' },
          { mealType: 'snack', mealOrder: 1, title: 'Banana with Peanut Butter', description: 'Sustained energy snack' },
          { mealType: 'lunch', mealOrder: 2, title: 'Turkey Wrap with Vegetables', description: 'Light and filling' },
          { mealType: 'snack', mealOrder: 3, title: 'Mixed Nuts', description: 'Healthy fats and protein' },
          { mealType: 'dinner', mealOrder: 4, title: 'Chicken Stir Fry', description: 'Quick and nutritious' },
        ],
        // Wednesday
        [
          { mealType: 'breakfast', mealOrder: 0, title: 'Greek Yogurt Parfait', description: 'Creamy and satisfying' },
          { mealType: 'snack', mealOrder: 1, title: 'Orange Slices', description: 'Vitamin C boost' },
          { mealType: 'lunch', mealOrder: 2, title: 'Quinoa Bowl with Vegetables', description: 'Plant-based protein' },
          { mealType: 'snack', mealOrder: 3, title: 'Hummus with Veggies', description: 'Fiber-rich snack' },
          { mealType: 'dinner', mealOrder: 4, title: 'Baked Cod with Sweet Potato', description: 'Lean protein and carbs' },
        ],
        // Thursday
        [
          { mealType: 'breakfast', mealOrder: 0, title: 'Whole Grain Pancakes', description: 'Comforting morning meal' },
          { mealType: 'snack', mealOrder: 1, title: 'Trail Mix', description: 'Energy-dense snack' },
          { mealType: 'lunch', mealOrder: 2, title: 'Lentil Soup with Bread', description: 'Hearty and warming' },
          { mealType: 'snack', mealOrder: 3, title: 'Cottage Cheese with Berries', description: 'High protein snack' },
          { mealType: 'dinner', mealOrder: 4, title: 'Beef and Vegetable Skewers', description: 'Grilled and flavorful' },
        ],
        // Friday
        [
          { mealType: 'breakfast', mealOrder: 0, title: 'Avocado Toast with Eggs', description: 'Trendy and nutritious' },
          { mealType: 'snack', mealOrder: 1, title: 'Pear with Cheese', description: 'Sweet and savory combo' },
          { mealType: 'lunch', mealOrder: 2, title: 'Mediterranean Bowl', description: 'Fresh and colorful' },
          { mealType: 'snack', mealOrder: 3, title: 'Protein Smoothie', description: 'Quick protein fix' },
          { mealType: 'dinner', mealOrder: 4, title: 'Pasta with Marinara and Meatballs', description: 'Classic comfort food' },
        ],
        // Saturday
        [
          { mealType: 'breakfast', mealOrder: 0, title: 'French Toast with Berries', description: 'Weekend treat' },
          { mealType: 'snack', mealOrder: 1, title: 'Energy Bar', description: 'On-the-go snack' },
          { mealType: 'lunch', mealOrder: 2, title: 'Burger with Side Salad', description: 'Satisfying weekend meal' },
          { mealType: 'snack', mealOrder: 3, title: 'Dark Chocolate', description: 'Indulgent treat' },
          { mealType: 'dinner', mealOrder: 4, title: 'Pork Tenderloin with Roasted Vegetables', description: 'Elegant weekend dinner' },
        ],
        // Sunday
        [
          { mealType: 'breakfast', mealOrder: 0, title: 'Breakfast Burrito', description: 'Hearty weekend breakfast' },
          { mealType: 'snack', mealOrder: 1, title: 'Apple Slices with Cinnamon', description: 'Simple and healthy' },
          { mealType: 'lunch', mealOrder: 2, title: 'Caesar Salad with Grilled Chicken', description: 'Classic favorite' },
          { mealType: 'snack', mealOrder: 3, title: 'Rice Cakes with Almond Butter', description: 'Light afternoon snack' },
          { mealType: 'dinner', mealOrder: 4, title: 'Roast Chicken with Mashed Potatoes', description: 'Sunday comfort meal' },
        ],
      ];

      // Update meals for each day
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const day = days.find(d => d.day_of_week === dayOfWeek);
        if (!day) {
          console.error(`Day ${dayOfWeek} not found`);
          continue;
        }

        // Delete existing meals for this day
        const { error: deleteError } = await supabase
          .from('meal_plan_meals')
          .delete()
          .eq('meal_plan_day_id', day.id);

        if (deleteError) {
          console.error(`Error deleting meals for day ${dayOfWeek}:`, deleteError);
          continue;
        }

        // Insert new meals for this day
        const dayMeals = weeklyMeals[dayOfWeek];
        for (const meal of dayMeals) {
          const { error: mealError } = await supabase
            .from('meal_plan_meals')
            .insert({
              meal_plan_day_id: day.id,
              meal_type: meal.mealType,
              meal_order: meal.mealOrder,
              title: meal.title,
              description: meal.description,
            });

          if (mealError) {
            console.error(`Error inserting meal for day ${dayOfWeek}, meal ${meal.mealOrder}:`, mealError);
          }
        }
      }

      console.log('✅ [Meal Plan] Updated templated meal plan with different meals for each day');
      // Reload the meal plan to show updated meals
      await loadActiveMealPlan();
    } catch (error) {
      console.error('❌ [Meal Plan] Error updating templated meal plan:', error);
    }
  };

  const updateMealPlanMeal = async (
    dayOfWeek: number,
    mealOrder: number,
    meal: MealPlanMeal
  ): Promise<{ success: boolean; error?: any }> => {
    try {
      if (!state.activeMealPlan) {
        return { success: false, error: new Error('No active meal plan') };
      }

      const day = state.activeMealPlan.days.find(d => d.dayOfWeek === dayOfWeek);
      if (!day) {
        return { success: false, error: new Error('Day not found') };
      }

      const existingMeal = day.meals.find(m => m.mealOrder === mealOrder);
      if (!existingMeal) {
        return { success: false, error: new Error('Meal not found') };
      }

      // Update meal in database
      const { error: mealError } = await supabase
        .from('meal_plan_meals')
        .update({
          title: meal.title,
          description: meal.description || null,
        })
        .eq('id', existingMeal.id);

      if (mealError) {
        console.error('Error updating meal:', mealError);
        return { success: false, error: mealError };
      }

      // Update ingredients
      // Delete existing ingredients
      await supabase
        .from('meal_plan_ingredients')
        .delete()
        .eq('meal_plan_meal_id', existingMeal.id);

      // Insert new ingredients
      if (meal.ingredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('meal_plan_ingredients')
          .insert(
            meal.ingredients.map(ing => ({
              meal_plan_meal_id: existingMeal.id,
              name: ing.name,
              quantity: ing.quantity || null,
              unit: ing.unit || null,
              notes: ing.notes || null,
            }))
          );

        if (ingredientsError) {
          console.error('Error updating ingredients:', ingredientsError);
        }
      }

      // Update local state
      dispatch({ type: 'UPDATE_MEAL_PLAN_MEAL', payload: { dayOfWeek, mealOrder, meal } });

      return { success: true };
    } catch (error) {
      console.error('Error updating meal plan meal:', error);
      return { success: false, error };
    }
  };

  const updateMealPlanDay = async (
    dayOfWeek: number,
    meals: MealPlanMeal[]
  ): Promise<{ success: boolean; error?: any }> => {
    try {
      if (!state.activeMealPlan) {
        return { success: false, error: new Error('No active meal plan') };
      }

      const day = state.activeMealPlan.days.find(d => d.dayOfWeek === dayOfWeek);
      if (!day) {
        return { success: false, error: new Error('Day not found') };
      }

      // Update all meals for the day
      for (const meal of meals) {
        await updateMealPlanMeal(dayOfWeek, meal.mealOrder, meal);
      }

      // Update local state
      dispatch({ type: 'UPDATE_MEAL_PLAN_DAY', payload: { dayOfWeek, meals } });

      return { success: true };
    } catch (error) {
      console.error('Error updating meal plan day:', error);
      return { success: false, error };
    }
  };

  const setActiveMealPlan = async (mealPlan: MealPlan): Promise<{ success: boolean; error?: any }> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (!authUserId) {
        return { success: false, error: new Error('Not logged in') };
      }

      // Deactivate all other meal plans
      await supabase
        .from('meal_plans')
        .update({ is_active: false })
        .eq('user_id', authUserId)
        .eq('is_active', true);

      // Activate this meal plan
      const { error } = await supabase
        .from('meal_plans')
        .update({ is_active: true })
        .eq('id', mealPlan.id);

      if (error) {
        console.error('Error setting active meal plan:', error);
        return { success: false, error };
      }

      dispatch({ type: 'SET_ACTIVE_MEAL_PLAN', payload: mealPlan });
      return { success: true };
    } catch (error) {
      console.error('Error setting active meal plan:', error);
      return { success: false, error };
    }
  };

  const createMealPlanFromChat = async (days: MealPlanDay[]): Promise<{ success: boolean; error?: any; mealPlanId?: string }> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      if (!authUserId) {
        return { success: false, error: new Error('Not logged in') };
      }

      // Deactivate existing active meal plan
      await supabase
        .from('meal_plans')
        .update({ is_active: false })
        .eq('user_id', authUserId)
        .eq('is_active', true);

      // Create new meal plan
      const { data: mealPlanData, error: mealPlanError } = await supabase
        .from('meal_plans')
        .insert({
          user_id: authUserId,
          is_templated: false,
          is_active: true,
        })
        .select()
        .single();

      if (mealPlanError) {
        console.error('Error creating meal plan:', mealPlanError);
        return { success: false, error: mealPlanError };
      }

      // Create days and meals
      for (const day of days) {
        const { data: dayData, error: dayError } = await supabase
          .from('meal_plan_days')
          .insert({
            meal_plan_id: mealPlanData.id,
            day_of_week: day.dayOfWeek,
          })
          .select()
          .single();

        if (dayError) {
          console.error('Error creating day:', dayError);
          continue;
        }

        // Create meals for this day
        for (const meal of day.meals) {
          const { data: mealData, error: mealError } = await supabase
            .from('meal_plan_meals')
            .insert({
              meal_plan_day_id: dayData.id,
              meal_type: meal.mealType,
              meal_order: meal.mealOrder,
              title: meal.title,
              description: meal.description || null,
            })
            .select()
            .single();

          if (mealError) {
            console.error('Error creating meal:', mealError);
            continue;
          }

          // Create ingredients
          if (meal.ingredients.length > 0) {
            const { error: ingredientsError } = await supabase
              .from('meal_plan_ingredients')
              .insert(
                meal.ingredients.map(ing => ({
                  meal_plan_meal_id: mealData.id,
                  name: ing.name,
                  quantity: ing.quantity || null,
                  unit: ing.unit || null,
                  notes: ing.notes || null,
                }))
              );

            if (ingredientsError) {
              console.error('Error creating ingredients:', ingredientsError);
            }
          }
        }
      }

      // Reload the meal plan
      await loadActiveMealPlan();

      return { success: true, mealPlanId: mealPlanData.id };
    } catch (error) {
      console.error('Error creating meal plan from chat:', error);
      return { success: false, error };
    }
  };

  const addMealToPlanDay = async (
    dayOfWeek: number,
    meal: Omit<MealPlanMeal, 'id'>
  ): Promise<{ success: boolean; error?: any }> => {
    try {
      if (!state.activeMealPlan) {
        return { success: false, error: new Error('No active meal plan') };
      }

      const day = state.activeMealPlan.days.find(d => d.dayOfWeek === dayOfWeek);
      if (!day) {
        return { success: false, error: new Error('Day not found') };
      }

      // Insert meal
      const { data: mealData, error: mealError } = await supabase
        .from('meal_plan_meals')
        .insert({
          meal_plan_day_id: day.id,
          meal_type: meal.mealType,
          meal_order: meal.mealOrder,
          title: meal.title,
          description: meal.description || null,
        })
        .select()
        .single();

      if (mealError) return { success: false, error: mealError };

      // Insert ingredients
      if (meal.ingredients && meal.ingredients.length > 0) {
        const { error: ingError } = await supabase
          .from('meal_plan_ingredients')
          .insert(
            meal.ingredients.map(ing => ({
              meal_plan_meal_id: mealData.id,
              name: ing.name,
              quantity: ing.quantity || null,
              unit: ing.unit || null,
              notes: ing.notes || null,
            }))
          );
        if (ingError) console.error('Error adding ingredients:', ingError);
      }

      await loadActiveMealPlan();
      return { success: true };
    } catch (error) {
      console.error('Error adding meal to plan day:', error);
      return { success: false, error };
    }
  };

  const logMealPlanToDiary = async (days: MealPlanDay[]): Promise<{ success: boolean; error?: any }> => {
    try {
      const today = new Date();
      const dayOfWeekToday = (today.getDay() + 6) % 7; // Monday=0, Sunday=6

      for (const day of days) {
        // Calculate date for this day of the week
        // For now, assume it's for the current/next week
        let diff = day.dayOfWeek - dayOfWeekToday;
        if (diff < 0) diff += 7; // If day is earlier in week, move to next week

        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + diff);
        const dateStr = targetDate.toISOString().slice(0, 10);

        for (const meal of day.meals) {
          // Create a food item from the meal
          // Default macros if not provided
          const food: Omit<FoodItem, 'id' | 'timestamp'> = {
            name: meal.title,
            mealType: meal.mealType,
            calories: meal.calories || 0,
            protein: meal.protein || 0,
            carbs: meal.carbs || 0,
            fat: meal.fat || 0,
            fiber: 0,
            sugar: 0,
            servingSize: '1 serving',
            confidence: 1.0,
          };


          await addFoodItem(food, dateStr);
        }
      }
      return { success: true };
    } catch (error) {
      console.error('Error logging meal plan to diary:', error);
      return { success: false, error };
    }
  };

  const setDefaultPreferencesByLocation = (country: string) => {
    const isMetricCountry = ['AU', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 'NZ', 'ZA', 'IN', 'JP', 'KR', 'CN', 'BR', 'MX', 'AR', 'CL', 'CO', 'PE', 'UY', 'PY', 'BO', 'EC', 'VE', 'GY', 'SR', 'GF'].includes(country.toUpperCase());
    const isUSA = country.toUpperCase() === 'US';

    const defaultPreferences: Partial<AppState['preferences']> = {
      units: isUSA ? 'imperial' : (isMetricCountry ? 'metric' : 'metric'),
      energy: isUSA ? 'calories' : (isMetricCountry ? 'kilojoules' : 'calories'),
    };

    dispatch({
      type: 'UPDATE_PREFERENCES',
      payload: defaultPreferences
    });
  };

  const calculateNutritionGoals = (user: User): NutritionGoal => {
    // Basic BMR calculation (Mifflin-St Jeor Equation)
    let bmr: number;
    if (user.gender === 'male') {
      bmr = 10 * (user.weight || 70) + 6.25 * (user.height || 170) - 5 * (user.age || 30) + 5;
    } else {
      bmr = 10 * (user.weight || 60) + 6.25 * (user.height || 160) - 5 * (user.age || 30) - 161;
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const tdee = bmr * (activityMultipliers[user.activityLevel || 'moderate']);

    // Goal adjustments
    let targetCalories = tdee;
    if (user.goal === 'lose_weight') {
      targetCalories = tdee * 0.8; // 20% deficit
    } else if (user.goal === 'gain_weight') {
      targetCalories = tdee * 1.2; // 20% surplus
    }

    // Macro distribution (25% protein, 45% carbs, 30% fat)
    const protein = (targetCalories * 0.25) / 4; // 4 cal/g
    const carbs = (targetCalories * 0.45) / 4; // 4 cal/g
    const fat = (targetCalories * 0.30) / 9; // 9 cal/g

    return {
      calories: Math.round(targetCalories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      fiber: 25, // Recommended daily fiber
      sugar: 50, // Recommended daily sugar limit
    };
  };

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        getCurrentDayLog,
        getTodaysTotals,
        addFoodItem,
        removeFoodItem,
        addHydrationEntry,
        removeHydrationEntry,
        addExerciseEntry,
        removeExerciseEntry,
        addBowelEntry,
        removeBowelEntry,
        addSymptomEntry,
        removeSymptomEntry,
        addWeightEntry,
        updateWaterIntake,
        calculateNutritionGoals,
        setDefaultPreferencesByLocation,
        updateUser,
        completeOnboarding,
        refreshUser: loadStoredData,
        clearUser,
        loadActiveMealPlan,
        createTemplatedMealPlan,
        updateMealPlanMeal,
        updateMealPlanDay,
        setActiveMealPlan,
        createMealPlanFromChat,
        addMealToPlanDay,
        logMealPlanToDiary,

      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
