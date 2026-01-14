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

// State interface
interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  dailyLogs: DailyLog[];
  currentDate: string;
  nutritionGoals: NutritionGoal | null;
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
  | { type: 'UPDATE_DAILY_LOG'; payload: DailyLog }
  | { type: 'SET_NUTRITION_GOALS'; payload: NutritionGoal }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<AppState['preferences']> }
  | { type: 'SET_CURRENT_DATE'; payload: string }
  | { type: 'LOAD_DAILY_LOGS'; payload: DailyLog[] };

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
  preferences: {
    theme: 'light',
    units: 'metric',
    energy: 'calories',
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
            exercises: [ ...(existing.exercises || []), action.payload ],
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
            bowel: [ ...(existing.bowel || []), action.payload ],
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
            symptoms: [ ...(existing.symptoms || []), action.payload ],
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
  updateWaterIntake: (amount: number) => void;
  calculateNutritionGoals: (user: User) => NutritionGoal;
  setDefaultPreferencesByLocation: (country: string) => void;
  updateUser: (userData: Partial<User>) => void;
} | null>(null);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load data from storage on app start
  useEffect(() => {
    loadStoredData();
  }, []);

  // Save data to storage when state changes
  useEffect(() => {
    saveDataToStorage();
  }, [state.dailyLogs, state.nutritionGoals, state.preferences, state.user]);

  const loadStoredData = async () => {
    try {
      const [dailyLogsData, nutritionGoalsData, preferencesData, userProfileData] = await Promise.all([
        AsyncStorage.getItem('dailyLogs'),
        AsyncStorage.getItem('nutritionGoals'),
        AsyncStorage.getItem('preferences'),
        AsyncStorage.getItem('userProfile'),
      ]);

      if (dailyLogsData) {
        const logs = JSON.parse(dailyLogsData).map((log: any) => ({
          ...log,
          foods: log.foods.map((food: any) => ({
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

      // Load user data from Supabase first (most up-to-date)
      let userProfile: User | null = null;
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();
          
          if (userData && !error) {
            // Map database fields to User interface
            userProfile = {
              id: userData.id,
              email: authData.user.email || '',
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
            };
            dispatch({ type: 'SET_USER', payload: userProfile });
            await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
            console.log('✅ Loaded user profile from Supabase:', userProfile);
            
            // LogMeal removed - now using Passio.ai
          }
        }
      } catch (supabaseError) {
        console.log('Could not load user from Supabase, falling back to AsyncStorage:', supabaseError);
      }
      
      // Fallback to AsyncStorage if Supabase load failed or no user found
      if (!userProfile && userProfileData) {
        userProfile = JSON.parse(userProfileData);
        dispatch({ type: 'SET_USER', payload: userProfile });
        console.log('Loaded user profile from storage:', userProfile);
      }
      
      // Load hydration entries from Supabase if user is authenticated
      if (userProfile?.id) {
        await loadHydrationFromSupabase(userProfile.id);
        await loadExercisesFromSupabase(userProfile.id);
        await loadFoodFromSupabase(userProfile.id);
        await loadBowelFromSupabase(userProfile.id);
        await loadSymptomFromSupabase(userProfile.id);
        await loadNutritionGoalsFromSupabase(userProfile.id);
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
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
        updateWaterIntake,
        calculateNutritionGoals,
        setDefaultPreferencesByLocation,
        updateUser,
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
