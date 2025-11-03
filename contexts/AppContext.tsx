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
  weight?: number;
  height?: number;
  gender?: 'male' | 'female' | 'other';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal?: 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'build_muscle';
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
  type: 'Walk' | 'Run' | 'Swim' | 'Gym' | 'Sport' | 'Other';
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
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'ADD_FOOD_ITEM'; payload: FoodItem }
  | { type: 'REMOVE_FOOD_ITEM'; payload: string }
  | { type: 'ADD_HYDRATION_ENTRY'; payload: HydrationEntry }
  | { type: 'REMOVE_HYDRATION_ENTRY'; payload: string }
  | { type: 'ADD_EXERCISE_ENTRY'; payload: ExerciseEntry }
  | { type: 'REMOVE_EXERCISE_ENTRY'; payload: string }
  | { type: 'ADD_BOWEL_ENTRY'; payload: BowelEntry }
  | { type: 'REMOVE_BOWEL_ENTRY'; payload: string }
  | { type: 'ADD_SYMPTOM_ENTRY'; payload: SymptomEntry }
  | { type: 'REMOVE_SYMPTOM_ENTRY'; payload: string }
  | { type: 'UPDATE_DAILY_LOG'; payload: DailyLog }
  | { type: 'SET_NUTRITION_GOALS'; payload: NutritionGoal }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<AppState['preferences']> }
  | { type: 'SET_CURRENT_DATE'; payload: string }
  | { type: 'LOAD_DAILY_LOGS'; payload: DailyLog[] };

// Initial state
const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  dailyLogs: [],
  currentDate: new Date().toISOString().split('T')[0],
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
    
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    
    case 'ADD_FOOD_ITEM':
      const today = state.currentDate;
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
        };
        return { ...state, dailyLogs: [...state.dailyLogs, newLog] };
      }
    
    case 'REMOVE_FOOD_ITEM':
      const todayForRemoval = state.currentDate;
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
      const todayForHydration = state.currentDate;
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
      const todayForHydrationRemoval = state.currentDate;
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
        const today = state.currentDate;
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
        const today = state.currentDate;
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
        const today = state.currentDate;
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
        const today = state.currentDate;
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
        const today = state.currentDate;
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
  addFoodItem: (food: Omit<FoodItem, 'id' | 'timestamp'>) => void;
  removeFoodItem: (id: string) => void;
  addHydrationEntry: (entry: Omit<HydrationEntry, 'id' | 'timestamp'>) => void;
  removeHydrationEntry: (id: string) => void;
  addExerciseEntry: (entry: Omit<ExerciseEntry, 'id' | 'time'> & { time?: Date }) => void;
  removeExerciseEntry: (id: string) => void;
  addBowelEntry: (bristol: 1 | 2 | 3 | 4 | 5 | 6 | 7, timestamp?: Date) => void;
  removeBowelEntry: (id: string) => void;
  addSymptomEntry: (text: string, timestamp?: Date) => void;
  removeSymptomEntry: (id: string) => void;
  updateWaterIntake: (amount: number) => void;
  calculateNutritionGoals: (user: User) => NutritionGoal;
  setDefaultPreferencesByLocation: (country: string) => void;
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
  }, [state.dailyLogs, state.nutritionGoals, state.preferences]);

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

      if (userProfileData) {
        const userProfile = JSON.parse(userProfileData);
        dispatch({ type: 'SET_USER', payload: userProfile });
        console.log('Loaded user profile from storage:', userProfile);
        
        // Load hydration entries from Supabase if user is authenticated
        if (userProfile?.id) {
          await loadHydrationFromSupabase(userProfile.id);
          await loadExercisesFromSupabase(userProfile.id);
        }
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

  const saveDataToStorage = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem('dailyLogs', JSON.stringify(state.dailyLogs)),
        AsyncStorage.setItem('nutritionGoals', JSON.stringify(state.nutritionGoals)),
        AsyncStorage.setItem('preferences', JSON.stringify(state.preferences)),
      ]);
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

  const addFoodItem = (food: Omit<FoodItem, 'id' | 'timestamp'>) => {
    const newFood: FoodItem = {
      ...food,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_FOOD_ITEM', payload: newFood });
  };

  const removeFoodItem = (id: string) => {
    dispatch({ type: 'REMOVE_FOOD_ITEM', payload: id });
  };

  const addHydrationEntry = async (entry: Omit<HydrationEntry, 'id' | 'timestamp'>) => {
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
      const { error } = authUserId ? await supabase
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
        }) : { error: null } as any;

      if (error) {
        console.error('Error saving hydration to Supabase:', error);
        // Still add to local state even if Supabase fails
      }

      dispatch({ type: 'ADD_HYDRATION_ENTRY', payload: newEntry });
    } catch (error) {
      console.error('Error adding hydration entry:', error);
      // Still add to local state even if Supabase fails
      const newEntry: HydrationEntry = {
        ...entry,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_HYDRATION_ENTRY', payload: newEntry });
    }
  };

  const removeHydrationEntry = async (id: string) => {
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

      dispatch({ type: 'REMOVE_HYDRATION_ENTRY', payload: id });
    } catch (error) {
      console.error('Error removing hydration entry:', error);
      // Still remove from local state even if Supabase fails
      dispatch({ type: 'REMOVE_HYDRATION_ENTRY', payload: id });
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

  const addExerciseEntry = async (entry: Omit<ExerciseEntry, 'id' | 'time'> & { time?: Date }) => {
    const newEntry: ExerciseEntry = {
      ...entry,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      time: entry.time || new Date(),
    };

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
        }
      }
    } catch (e) {
      console.error('Error during exercise supabase save:', e);
    } finally {
      dispatch({ type: 'ADD_EXERCISE_ENTRY', payload: newEntry });
    }
  };

  const removeExerciseEntry = async (id: string) => {
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
      dispatch({ type: 'REMOVE_EXERCISE_ENTRY', payload: id });
    }
  };

  const addBowelEntry = (bristol: 1 | 2 | 3 | 4 | 5 | 6 | 7, timestamp?: Date) => {
    const newEntry: BowelEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      bristol,
      timestamp: timestamp || new Date(),
    };
    dispatch({ type: 'ADD_BOWEL_ENTRY', payload: newEntry });
  };

  const removeBowelEntry = (id: string) => {
    dispatch({ type: 'REMOVE_BOWEL_ENTRY', payload: id });
  };

  const addSymptomEntry = (text: string, timestamp?: Date) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    const newEntry: SymptomEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: trimmed,
      timestamp: timestamp || new Date(),
    };
    dispatch({ type: 'ADD_SYMPTOM_ENTRY', payload: newEntry });
  };

  const removeSymptomEntry = (id: string) => {
    dispatch({ type: 'REMOVE_SYMPTOM_ENTRY', payload: id });
  };

  const setDefaultPreferencesByLocation = (country: string) => {
    const isMetricCountry = ['AU', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 'NZ', 'ZA', 'IN', 'JP', 'KR', 'CN', 'BR', 'MX', 'AR', 'CL', 'CO', 'PE', 'UY', 'PY', 'BO', 'EC', 'VE', 'GY', 'SR', 'GF'].includes(country.toUpperCase());
    const isUSA = country.toUpperCase() === 'US';
    
    const defaultPreferences = {
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
