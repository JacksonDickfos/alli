import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  Platform,
  Vibration,
  Animated,
  KeyboardAvoidingView,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../contexts/AppContext';
import { FoodItem } from '../contexts/AppContext';
import { FoodAnalysisService } from '../services/FoodAnalysisService';
import type { FoodAnalysisResult } from '../services/FoodAnalysisService';
import { analyzeImage as analyzeImageWithPassio } from '../services/PassioService';
import { supabase } from '../lib/supabase';

interface NutritionScreenProps {
  navigation: any;
  route?: any;
}

// Helper function to get local date string in YYYY-MM-DD format
const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function NutritionScreen({ navigation, route }: NutritionScreenProps) {
  const { state, getCurrentDayLog, getTodaysTotals, addFoodItem, removeFoodItem, addHydrationEntry, addBowelEntry, removeBowelEntry, addSymptomEntry, removeSymptomEntry, addExerciseEntry, removeExerciseEntry } = useApp();
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  // Animation values for loading icon
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const gradientAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  // Smooth progress animation that continuously updates
  const smoothProgressAnim = useRef(new Animated.Value(0)).current;
  const progressAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  // Success animation
  const successScaleAnim = useRef(new Animated.Value(0)).current;
  // Track if we should launch camera after modal closes (for retake functionality)
  const shouldRetakeAfterModalClose = useRef(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [showManualFoodModal, setShowManualFoodModal] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [manualFood, setManualFood] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    sugar: '',
    servingSize: '',
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [mealTime, setMealTime] = useState<Date>(new Date());
  const [showHydrationModal, setShowHydrationModal] = useState(false);
  const [hydrationType, setHydrationType] = useState('water');
  const [hydrationVolume, setHydrationVolume] = useState('');
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseType, setExerciseType] = useState<'Walk'|'Run'|'Swim'|'Gym'|'Sport'|'Cycling'|'Other'>('Walk');
  const [exerciseStartTime, setExerciseStartTime] = useState(new Date());
  const [exerciseDuration, setExerciseDuration] = useState(30);
  const [exerciseRpe, setExerciseRpe] = useState(6);
  
  // Helper to set exercise time to selected date with current time
  const initializeExerciseTime = () => {
    // Parse selectedDate (YYYY-MM-DD) and set to current time on that date
    const [year, month, day] = selectedDate.split('-').map(Number);
    const now = new Date();
    const selectedDateObj = new Date(year, month - 1, day, now.getHours(), now.getMinutes());
    setExerciseStartTime(selectedDateObj);
  };
  const [showBristolModal, setShowBristolModal] = useState(false);
  const [bowelTime, setBowelTime] = useState(new Date());
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [symptomText, setSymptomText] = useState('');
  const [symptomTime, setSymptomTime] = useState(new Date());
  
  // Helper to set bowel time to selected date with current time
  const initializeBowelTime = () => {
    // Parse selectedDate (YYYY-MM-DD) and set to current time on that date
    const [year, month, day] = selectedDate.split('-').map(Number);
    const now = new Date();
    const selectedDateObj = new Date(year, month - 1, day, now.getHours(), now.getMinutes());
    setBowelTime(selectedDateObj);
  };
  
  // Helper to set symptom time to selected date with current time
  const initializeSymptomTime = () => {
    // Parse selectedDate (YYYY-MM-DD) and set to current time on that date
    const [year, month, day] = selectedDate.split('-').map(Number);
    const now = new Date();
    const selectedDateObj = new Date(year, month - 1, day, now.getHours(), now.getMinutes());
    setSymptomTime(selectedDateObj);
  };
  
  // Helper to check if selected date is today
  const isSelectedDateToday = () => {
    const today = getLocalDateString();
    return selectedDate === today;
  };
  
  // Helper to get current time for validation
  const getCurrentTime = () => {
    return new Date();
  };
  
  // Helper to check if a time is in the future (for selected date)
  const isTimeInFuture = (time: Date) => {
    if (!isSelectedDateToday()) return false; // Past dates allow any time
    const now = getCurrentTime();
    return time > now;
  };
  
  // Helper to clamp time to current time if it's in the future
  const clampToCurrentTime = (time: Date) => {
    if (isTimeInFuture(time)) {
      return getCurrentTime();
    }
    return time;
  };
  // Pending food analysis result before user confirms / sets portion
  const [pendingAnalysis, setPendingAnalysis] = useState<(FoodAnalysisResult & { 
    imageUri?: string; 
    ingredients?: Array<{
      id: number | string;
      name: string;
      foodId?: number;
      position?: number;
      segmentIndex?: number;
      imageId?: number;
      nutrition?: { calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number };
    }>; 
    detectedSegments?: Array<{ id: number | string; name: string; foodId?: number; position?: number; segmentIndex?: number; imageId?: number; weightGrams?: number; passioItem?: any }>;
  }) | null>(null);
  const [showConfirmFoodModal, setShowConfirmFoodModal] = useState(false);
  const [showPortionModal, setShowPortionModal] = useState(false);
  const [portionServings, setPortionServings] = useState<string>('1');
  // Store ingredient serving sizes: { ingredientId: servingSize }
  const [ingredientServings, setIngredientServings] = useState<Record<string, string>>({});
  const [removedIngredients, setRemovedIngredients] = useState<Set<string>>(new Set());
  // Track selected ingredients (all start as selected)
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  // Adjust Serving Size modal state
  const [showAdjustServingModal, setShowAdjustServingModal] = useState(false);
  const [selectedIngredientForAdjustment, setSelectedIngredientForAdjustment] = useState<any>(null);
  const [adjustServingNumber, setAdjustServingNumber] = useState<string>('1');
  const [adjustServingUnit, setAdjustServingUnit] = useState<string>('g');
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const servingSizeScrollRef = useRef<ScrollView>(null);
  // Time picker for editing food
  const [editFoodTime, setEditFoodTime] = useState<Date>(new Date());
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [editFoodDate, setEditFoodDate] = useState<string>(getLocalDateString());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  // Portion editing for existing food
  const [editPortionServings, setEditPortionServings] = useState<string>('1');
  const [editBaseServingWeight, setEditBaseServingWeight] = useState<number | undefined>(undefined);
  const [editBaseServingSize, setEditBaseServingSize] = useState<string>('Serving');

  // Helper functions to get data for selected date
  const getSelectedDayLog = (date: string) => {
    return state.dailyLogs.find(log => log.date === date) || null;
  };

  const getSelectedDayTotals = (date: string) => {
    const dayLog = getSelectedDayLog(date);
    if (!dayLog) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, hydration: 0 };
    }

    const foodTotals = dayLog.foods.reduce(
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

    const hydrationTotal = (dayLog.hydration || []).reduce(
      (total, entry) => total + entry.volume, 0
    );

    const hydrationMacros = (dayLog.hydration || []).reduce(
      (totals, entry) => ({
        calories: totals.calories + (entry.calories || 0),
        protein: totals.protein + (entry.protein || 0),
        carbs: totals.carbs + (entry.carbs || 0),
        fat: totals.fat + (entry.fat || 0),
        fiber: totals.fiber + 0,
        sugar: totals.sugar + 0,
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

  const currentLog = getSelectedDayLog(selectedDate);
  const todaysTotals = getSelectedDayTotals(selectedDate);
  const goals = state.nutritionGoals;
  // Use default goals if none exist, so progress bars can show when food is logged
  const defaultGoals = {
    calories: 2000,
    protein: 120,
    carbs: 225,
    fat: 67,
    fiber: 25,
    sugar: 50,
  };
  const effectiveGoals = goals || defaultGoals;
  const hasFoodLogged = currentLog && currentLog.foods.length > 0;

  // Generate list of dates to show in scrollable selector
  const generateDateList = () => {
    const dates: string[] = [];
    const today = new Date();
    // Show 30 days in the past up to today (today is the last date)
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(getLocalDateString(date));
    }
    return dates;
  };

  const dateList = generateDateList();
  const todayDateString = getLocalDateString();
  const dateSelectorRef = useRef<ScrollView>(null);

  // Scroll to today's date (last date) when component loads
  useEffect(() => {
    if (dateList.length > 0 && dateSelectorRef.current) {
      // Today is the last date in the list, so scroll to the end
      setTimeout(() => {
        dateSelectorRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, []);

  // If we were navigated here with autoLogFood, behave as if the user tapped "Take"
  useEffect(() => {
    if (route?.params?.autoLogFood) {
      console.log('📸 Auto log food triggered from HomeScreen');
      // Go directly to camera, skipping meal type selection
      takePicture();
      // Clear the flag so it doesn't retrigger on re-render/back nav
      navigation.setParams?.({ autoLogFood: false });
    }
  }, [route?.params?.autoLogFood]);

  // Check camera permission status on mount (non-blocking)
  useEffect(() => {
    (async () => {
      try {
        // Check permission status without requesting
        const result = await ImagePicker.getCameraPermissionsAsync();
        setCameraPermission(result.granted);
      } catch (error: any) {
        // Silently handle permission check errors - don't show to user
        // This can happen on simulators or devices without camera
        // We'll request permission when user actually tries to take a photo
        console.log('Camera permission check unavailable (non-critical):', error?.message || 'Unknown error');
        setCameraPermission(null); // Let it be null so we can request on demand
      }
    })();
  }, []);

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      // Try ImagePicker first (more reliable)
      let result = await ImagePicker.getCameraPermissionsAsync();
      
      if (!result.granted) {
        result = await ImagePicker.requestCameraPermissionsAsync();
      }
      
      if (result.granted) {
        setCameraPermission(true);
        return true;
      } else {
        setCameraPermission(false);
        return false;
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setCameraPermission(false);
      return false;
    }
  };

  const takePicture = async () => {
    // Check and request permission if needed
    let hasPermission = cameraPermission === true;
    
    if (!hasPermission) {
      hasPermission = await requestCameraPermission();
      
      if (!hasPermission) {
        Alert.alert(
          'Permission Required', 
          'Camera permission is required to take food photos. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: async () => {
                try {
                  // Open app settings so user can grant permission
                  if (Platform.OS === 'ios') {
                    await Linking.openURL('app-settings:');
                  } else {
                    await Linking.openSettings();
                  }
                } catch (error) {
                  console.error('Error opening settings:', error);
                  Alert.alert('Error', 'Could not open settings. Please manually enable camera permission in your device settings.');
                }
              }
            }
          ]
        );
        return;
      }
    }

    try {
      console.log('Launching camera...');
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6, // Reduced from 0.8 to reduce file size
        exif: false,
      });

      console.log('Camera result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('Processing image:', result.assets[0].uri);
        await analyzeAndLogFood(result.assets[0].uri);
      } else {
        console.log('Camera was canceled or no assets returned');
      }
    } catch (error: any) {
      console.error('Camera error details:', error);
      const errorMessage = error?.message || 'Unknown error';
      
      // If camera fails, it's likely a simulator - offer to use image picker
      if (Platform.OS === 'ios' && (errorMessage.includes('simulator') || errorMessage.includes('not available'))) {
        Alert.alert(
          'Camera Not Available',
          'The iOS Simulator doesn\'t have a camera. Would you like to choose a photo from your library instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Choose Photo', onPress: () => pickImage() }
          ]
        );
      } else {
        Alert.alert('Error', `Failed to take picture: ${errorMessage}`);
      }
    }
  };

  const pickImage = async () => {
    console.log('📸 pickImage function called!');
    try {
      console.log('📸 Launching image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6, // Reduced from 0.8 to reduce file size
      });

      console.log('📸 Image picker result:', result);
      console.log('📸 Canceled?', result.canceled);
      console.log('📸 Assets?', result.assets);

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('📸 Image selected, calling analyzeAndLogFood...');
        console.log('📸 Image URI:', result.assets[0].uri);
        await analyzeAndLogFood(result.assets[0].uri);
      } else {
        console.log('📸 Image selection was canceled or no assets');
      }
    } catch (error) {
      console.error('❌ Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Animate loading icon when analyzing
  useEffect(() => {
    if (isAnalyzing) {
      // Start rotation animation
      const rotateAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      
      // Start scale pulse animation
      const scaleAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      
      // Start gradient color animation
      const gradientAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(gradientAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(gradientAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      );
      
      rotateAnimation.start();
      scaleAnimation.start();
      gradientAnimation.start();
      
      return () => {
        rotateAnimation.stop();
        scaleAnimation.stop();
        gradientAnimation.stop();
        rotateAnim.setValue(0);
        scaleAnim.setValue(1);
        gradientAnim.setValue(0);
      };
    }
  }, [isAnalyzing]);

  // Handle retake photo after modal closes
  useEffect(() => {
    // When modal closes and we have retake flag set, launch camera
    if (!showPortionModal && !showConfirmFoodModal && shouldRetakeAfterModalClose.current) {
      shouldRetakeAfterModalClose.current = false;
      // Use a small delay to ensure modal animation completes
      // This prevents UI conflicts that cause freezing
      const timer = setTimeout(() => {
        takePicture();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showPortionModal, showConfirmFoodModal]);

  // Initialize scroll position when Adjust Serving Size modal opens
  useEffect(() => {
    if (showAdjustServingModal && selectedIngredientForAdjustment && servingSizeScrollRef.current) {
      const currentValue = parseFloat(adjustServingNumber) || 1;
      const minValue = 0.1;
      const step = 0.1;
      const markerWidth = 40; // Width of each marker
      // Calculate marker index (each marker represents 0.1 increment)
      const markerIndex = Math.round((currentValue - minValue) / step);
      const scrollPosition = markerIndex * markerWidth;
      
      setTimeout(() => {
        servingSizeScrollRef.current?.scrollTo({ x: scrollPosition, animated: false });
      }, 200);
    }
  }, [showAdjustServingModal, selectedIngredientForAdjustment]);

  const analyzeAndLogFood = async (imageUri: string) => {
    // Clear any previous analysis state to prevent showing wrong photo data
    // Use a timestamp to ensure we're not using stale data
    const currentImageTimestamp = Date.now();
    setPendingAnalysis(null);
    setIngredientServings({});
    setRemovedIngredients(new Set());
    setPortionServings('1');
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    progressAnim.setValue(0);
    smoothProgressAnim.setValue(0);
    
    // Stop any existing smooth progress animation
    if (progressAnimationRef.current) {
      progressAnimationRef.current.stop();
    }
    
    // Start smooth continuous progress animation (0-100% over ~5-8 seconds)
    const estimatedDuration = 6000; // 6 seconds estimated total time
    progressAnimationRef.current = Animated.timing(smoothProgressAnim, {
      toValue: 100,
      duration: estimatedDuration,
      useNativeDriver: false,
    });
    progressAnimationRef.current.start();
    
    // Listen to smooth progress animation and update displayed percentage
    let progressListener: string | null = null;
    try {
      progressListener = smoothProgressAnim.addListener(({ value }) => {
        setAnalysisProgress(Math.min(100, Math.max(0, Math.round(value))));
      });
      console.log('🍽️ Analyzing food image:', imageUri, 'at', currentImageTimestamp);
      
      // Update progress: Starting analysis
      // Don't set discrete values, let smooth animation handle it
      
      // Use Passio Nutrition AI for multi-item detection with nutrition data
      console.log('🍽️ Using Passio Nutrition AI for food analysis...');
      
      const passioResults = await analyzeImageWithPassio(imageUri);
      console.log('📊 Passio returned items:', passioResults);
      console.log('🖼️ Passio image check:', passioResults.map((item: any) => ({
        name: item.name,
        ingredientImageUrl: item.ingredientImageUrl,
        imageUri: item.imageUri,
        hasImage: !!(item.ingredientImageUrl || item.imageUri)
      })));

      if (!passioResults || passioResults.length === 0) {
        throw new Error('No food items detected in the image');
      }
      
      const results = passioResults;

      // Passio returns all detected items with nutrition data
      // Sort by confidence/score to get the primary item
      const primaryItem = results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
      
      // Use ALL detected items as potential ingredients
      // Passio returns comprehensive ingredient detection with weight estimates
      const allDetectedItems = results.map((item, index) => ({
        id: item.passioResultId || item.passioReferenceId || item.name || `item-${index}`,
        name: item.name,
        foodId: item.passioProductCode ? parseInt(item.passioProductCode, 10) : undefined,
        position: index,
        segmentIndex: index,
        confidence: item.confidence,
        // Include weight data from Passio (estimated from image analysis)
        weightGrams: item.servingWeightGrams || undefined,
        // Include serving unit information from Passio
        servingUnit: item.servingUnit,
        servingQuantity: item.servingQuantity,
        // Include ingredient image URL if available
        ingredientImageUrl: item.ingredientImageUrl,
        // Also store the full item for reference
        passioItem: item,
      }));
      
      // Remove duplicates based on name
      const uniqueItems = allDetectedItems.filter((item, index, self) => 
        index === self.findIndex((t) => t.name === item.name || (t.foodId === item.foodId && item.foodId))
      );
      
      console.log(`🍽️ Primary item: "${primaryItem.name}", ${uniqueItems.length} total detected items (including primary)`);
      console.log(`📋 All detected items:`, uniqueItems.map(item => `${item.name}`).join(', '));

      // Process ingredients directly and show portion modal (skip confirmation modal)
      // If we have multiple detected items, use them as ingredients
      if (uniqueItems.length > 1) {
        console.log(`📋 Processing ${uniqueItems.length} detected items as ingredients...`);
        
        // Fetch nutrition for each ingredient using Edamam (fallback for individual ingredients)
        const totalIngredients = uniqueItems.length;
        const ingredientsWithNutrition = await Promise.all(
          uniqueItems.map(async (seg: any, index: number) => {
            const ingName = seg.name || 'Unknown';
            console.log(`  📊 Fetching nutrition for: ${ingName}`);
            
            // Smooth progress will continue automatically
            
            // Preserve ingredient image URL from Passio before processing
            const ingredientImageUrl = seg.ingredientImageUrl || seg.passioItem?.ingredientImageUrl;
            
            // Extract serving unit from Passio data (now available directly in FoodAnalysisResult)
            const servingUnit = seg.servingUnit;
            const servingQuantity = seg.servingQuantity || 1;
            
            try {
              const edamamNutrition = await FoodAnalysisService.analyzeFoodFromText(ingName);
              
              // Use weight from Passio if available (estimated from image analysis)
              // If Passio didn't provide weight, try to estimate based on nutrition preview
              let weightGrams = seg.weightGrams;
              
              // If no weight from Passio, try to estimate from nutrition preview
              if (!weightGrams && seg.passioItem?.nutritionPreview) {
                const preview = seg.passioItem.nutritionPreview;
                const portion = preview.portion;
                if (portion?.weight?.value) {
                  weightGrams = portion.weight.value;
                } else if (preview.calories && edamamNutrition.calories > 0) {
                  // Estimate weight based on calorie ratio
                  // If Passio says 200 cal and Edamam says 100 cal per 100g, then weight is ~200g
                  weightGrams = Math.round((preview.calories / edamamNutrition.calories) * 100);
                }
              }
              
              // Final fallback: use a reasonable default based on food type
              if (!weightGrams || weightGrams <= 0) {
                // Default estimates for common foods (in grams)
                const defaultWeights: Record<string, number> = {
                  'apple': 180,
                  'banana': 120,
                  'egg': 50,
                  'bread': 25,
                  'chicken': 100,
                  'rice': 150,
                  'pasta': 200,
                };
                const lowerName = ingName.toLowerCase();
                weightGrams = defaultWeights[lowerName] || 100; // Default to 100g if unknown
                console.log(`    ⚠️ No weight from Passio for ${ingName}, using default: ${weightGrams}g`);
              } else {
                console.log(`    ✅ Using Passio estimated weight for ${ingName}: ${weightGrams}g`);
              }
              
              const multiplier = weightGrams / 100;
              
              const nutrition = {
                calories: Math.round((edamamNutrition.calories || 0) * multiplier),
                protein: Math.round((edamamNutrition.protein || 0) * multiplier * 10) / 10,
                carbs: Math.round((edamamNutrition.carbs || 0) * multiplier * 10) / 10,
                fat: Math.round((edamamNutrition.fat || 0) * multiplier * 10) / 10,
                fiber: Math.round((edamamNutrition.fiber || 0) * multiplier * 10) / 10,
                sugar: Math.round((edamamNutrition.sugar || 0) * multiplier * 10) / 10,
                weight: weightGrams,
                unit: 'g',
              };
              
              console.log(`    ✅ Got nutrition for ${ingName}: ${nutrition.calories} cal`);
              
              return {
                ...seg,
                nutrition,
                ingredientImageUrl,
                servingUnit: servingUnit || undefined,
                servingQuantity: servingQuantity || 1,
              };
            } catch (error: any) {
              console.warn(`    ⚠️ Failed to get nutrition for ${ingName}:`, error.message);
              return {
                ...seg,
                nutrition: {
                  calories: 0,
                  protein: 0,
                  carbs: 0,
                  fat: 0,
                  fiber: 0,
                  sugar: 0,
                  weight: seg.weightGrams || 100,
                  unit: 'g',
                },
                ingredientImageUrl,
                servingUnit: servingUnit || undefined,
                servingQuantity: servingQuantity || 1,
              };
            }
          })
        );
        
        // Initialize ingredient servings with Passio's estimated weights
        const initialServings: Record<string, string> = {};
        ingredientsWithNutrition.forEach((ing: any, index: number) => {
          const ingId = ing.id || ing.name || `ingredient-${index}`;
          const uniqueKey = `${ingId}-${index}`;
          // Use Passio's estimated weight, or nutrition weight, or fallback to 100g
          const baseWeight = ing.weightGrams || ing.nutrition?.weight || 100;
          initialServings[uniqueKey] = String(baseWeight);
          console.log(`    📊 ${ing.name}: ${baseWeight}g (from Passio: ${ing.weightGrams ? 'yes' : 'no'})`);
        });
        setIngredientServings(initialServings);
        
        // Initialize all ingredients as selected
        const allIngredientKeys = new Set<string>();
        ingredientsWithNutrition.forEach((ing: any, index: number) => {
          const ingId = ing.id || ing.name || `ingredient-${index}`;
          const uniqueKey = `${ingId}-${index}`;
          allIngredientKeys.add(uniqueKey);
        });
        setSelectedIngredients(allIngredientKeys);
        
        // Store all detected items with processed ingredients
        setPendingAnalysis({
          ...primaryItem, // Use primary item as default
          imageUri: primaryItem.imageUri || imageUri,
          // Store ALL detected segments as ingredients (comprehensive list)
          detectedSegments: uniqueItems,
          ingredients: ingredientsWithNutrition,
        });
      } else {
        console.log('⚠️ Single item detected, no separate ingredients');
        
        // Store single item for portion modal
        setPendingAnalysis({
          ...primaryItem, // Use primary item as default
          imageUri: primaryItem.imageUri || imageUri,
          // Store ALL detected segments as ingredients (comprehensive list)
          detectedSegments: uniqueItems,
        });
      }
      
      // Ensure smooth animation reaches 100%
      smoothProgressAnim.setValue(100);
      setAnalysisProgress(100);
      progressAnim.setValue(100);
      
      // Remove progress listener
      if (progressListener) {
        smoothProgressAnim.removeListener(progressListener);
      }
      
      // Small delay to show 100% before closing
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setPortionServings('1');
      // Skip confirmation modal, go directly to portion/ingredients modal
      setShowPortionModal(true);
    } catch (error: any) {
      // Stop smooth progress animation on error
      if (progressAnimationRef.current) {
        progressAnimationRef.current.stop();
      }
      if (progressListener) {
        smoothProgressAnim.removeListener(progressListener);
      }
      
      console.error('❌ Analysis error:', error);
      const rawMessage: string = error?.message || '';

      // Detect Passio API errors (rate limits, etc.)
      const isRateLimitOrTokenIssue =
        rawMessage.includes('429') ||
        rawMessage.toLowerCase().includes('rate limit') ||
        rawMessage.toLowerCase().includes('quota') ||
        rawMessage.toLowerCase().includes('limit');

      if (isRateLimitOrTokenIssue) {
        Alert.alert(
          'Photo Limit Reached',
          "You've hit the limit for food photo analysis.\n\n" +
            "Please wait a moment and try again later.\n\n" +
            'If you keep seeing this message, please contact support.',
          [{ text: 'OK' }]
        );
      } else {
        const friendlyMessage =
          rawMessage || 'Failed to analyze food. Please try again in a moment.';

        // Generic analysis error with tips
        Alert.alert(
          'Analysis Error',
          friendlyMessage +
            '\n\nTips:\n• Use a clear photo of food\n• Make sure the food is well-lit\n• Avoid photos of non-food items',
          [{ text: 'OK' }]
        );
      }
    } finally {
      // Hide loading spinner; user will confirm / adjust portion next
      setIsAnalyzing(false);
    }
  };

  const showMealTypeSelector = () => {
    // Go directly to camera, skipping meal type selection
    takePicture();
  };

  const handleRetakePhoto = () => {
    // Close modals and clear state first
    setShowConfirmFoodModal(false);
    setShowPortionModal(false);
    setPendingAnalysis(null);
    setIngredientServings({});
    setRemovedIngredients(new Set());
    setSelectedIngredients(new Set());
    // Reset analyzing state in case it's stuck
    setIsAnalyzing(false);
    // Set flag to launch camera after modal fully closes
    // This prevents UI conflicts that cause freezing
    shouldRetakeAfterModalClose.current = true;
  };

  const handleConfirmFoodYes = async () => {
    if (!pendingAnalysis) {
      setShowConfirmFoodModal(false);
      setShowPortionModal(true);
      return;
    }

    // Passio already provides nutrition data in the response, so we can proceed directly
    // If we have multiple detected items, use them as ingredients
    try {
      setIsAnalyzing(true);
      console.log(`🔍 Processing Passio results for: ${pendingAnalysis.name}`);

      // Passio returns all detected items with nutrition data
      // Use detected segments as ingredients if available
      if (pendingAnalysis.detectedSegments && pendingAnalysis.detectedSegments.length > 1) {
        console.log(`📋 Processing ${pendingAnalysis.detectedSegments.length} detected items as ingredients...`);
        
        // Fetch nutrition for each ingredient using Edamam (fallback for individual ingredients)
        const ingredientsWithNutrition = await Promise.all(
          pendingAnalysis.detectedSegments.map(async (seg: any, index: number) => {
            const ingName = seg.name || 'Unknown';
            console.log(`  📊 Fetching nutrition for: ${ingName}`);
            
            try {
              const edamamNutrition = await FoodAnalysisService.analyzeFoodFromText(ingName);
              
              // Use weight from Passio if available (estimated from image analysis)
              // If Passio didn't provide weight, try to estimate based on nutrition preview
              let weightGrams = seg.weightGrams;
              
              // If no weight from Passio, try to estimate from nutrition preview
              if (!weightGrams && seg.passioItem?.nutritionPreview) {
                const preview = seg.passioItem.nutritionPreview;
                const portion = preview.portion;
                if (portion?.weight?.value) {
                  weightGrams = portion.weight.value;
                } else if (preview.calories && edamamNutrition.calories > 0) {
                  // Estimate weight based on calorie ratio
                  // If Passio says 200 cal and Edamam says 100 cal per 100g, then weight is ~200g
                  weightGrams = Math.round((preview.calories / edamamNutrition.calories) * 100);
                }
              }
              
              // Final fallback: use a reasonable default based on food type
              if (!weightGrams || weightGrams <= 0) {
                // Default estimates for common foods (in grams)
                const defaultWeights: Record<string, number> = {
                  'apple': 180,
                  'banana': 120,
                  'egg': 50,
                  'bread': 25,
                  'chicken': 100,
                  'rice': 150,
                  'pasta': 200,
                };
                const lowerName = ingName.toLowerCase();
                weightGrams = defaultWeights[lowerName] || 100; // Default to 100g if unknown
                console.log(`    ⚠️ No weight from Passio for ${ingName}, using default: ${weightGrams}g`);
              } else {
                console.log(`    ✅ Using Passio estimated weight for ${ingName}: ${weightGrams}g`);
              }
              
              const multiplier = weightGrams / 100;
              
              const nutrition = {
                calories: Math.round((edamamNutrition.calories || 0) * multiplier),
                protein: Math.round((edamamNutrition.protein || 0) * multiplier * 10) / 10,
                carbs: Math.round((edamamNutrition.carbs || 0) * multiplier * 10) / 10,
                fat: Math.round((edamamNutrition.fat || 0) * multiplier * 10) / 10,
                fiber: Math.round((edamamNutrition.fiber || 0) * multiplier * 10) / 10,
                sugar: Math.round((edamamNutrition.sugar || 0) * multiplier * 10) / 10,
                weight: weightGrams,
                unit: 'g',
              };
              
              console.log(`    ✅ Got nutrition for ${ingName}: ${nutrition.calories} cal`);
              
              return {
                ...seg,
                nutrition,
              };
            } catch (error: any) {
              console.warn(`    ⚠️ Failed to get nutrition for ${ingName}:`, error.message);
              return {
                ...seg,
                nutrition: {
                  calories: 0,
                  protein: 0,
                  carbs: 0,
                  fat: 0,
                  fiber: 0,
                  sugar: 0,
                  weight: seg.weightGrams || 100,
                  unit: 'g',
                },
              };
            }
          })
        );
        
        // Initialize ingredient servings with Passio's estimated weights
        const initialServings: Record<string, string> = {};
        ingredientsWithNutrition.forEach((ing: any, index: number) => {
          const ingId = ing.id || ing.name || `ingredient-${index}`;
          const uniqueKey = `${ingId}-${index}`;
          // Use Passio's estimated weight, or nutrition weight, or fallback to 100g
          const baseWeight = ing.weightGrams || ing.nutrition?.weight || 100;
          initialServings[uniqueKey] = String(baseWeight);
          console.log(`    📊 ${ing.name}: ${baseWeight}g (from Passio: ${ing.weightGrams ? 'yes' : 'no'})`);
        });
        setIngredientServings(initialServings);
        setPendingAnalysis({
          ...pendingAnalysis,
          ingredients: ingredientsWithNutrition,
        });
      } else {
        console.log('⚠️ Single item detected, no separate ingredients');
      }

      setShowConfirmFoodModal(false);
      setShowPortionModal(true);
    } catch (error: any) {
      console.error('❌ Error confirming dish:', error);
      
      Alert.alert(
        'Processing Error',
        'Failed to process food data. You can still log the food manually.',
        [
          {
            text: 'Continue',
            onPress: () => {
              setShowConfirmFoodModal(false);
              setShowPortionModal(true);
            },
          },
          { text: 'Cancel', style: 'cancel', onPress: () => setShowConfirmFoodModal(false) },
        ]
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper function to check if a food item is an alcoholic beverage
  const isAlcoholicBeverage = (foodName: string): boolean => {
    const alcoholKeywords = [
      'beer', 'wine', 'champagne', 'whiskey', 'whisky', 'vodka', 'rum', 'gin', 'tequila',
      'cocktail', 'martini', 'margarita', 'mojito', 'sangria', 'cider', 'liquor', 'liqueur',
      'sake', 'soju', 'brandy', 'cognac', 'bourbon', 'scotch', 'alcohol', 'alcoholic',
      'hard seltzer', 'spritzer', 'mimosa', 'bloody mary', 'moscow mule', 'negroni'
    ];
    const lowerName = foodName.toLowerCase();
    return alcoholKeywords.some(keyword => lowerName.includes(keyword));
  };

  // Helper function to extract volume in ml from a food item
  const extractVolumeFromFood = (
    foodName: string,
    servingSize: string,
    servingWeightGrams?: number,
    ingredients?: any[]
  ): number | null => {
    // Check if any ingredient has ml unit
    if (ingredients && ingredients.length > 0) {
      let totalMl = 0;
      let hasMlUnit = false;
      
      ingredients.forEach((ingredient: any, index: number) => {
        const ingId = ingredient.id || ingredient.name || `ingredient-${index}`;
        const uniqueKey = `${ingId}-${index}`;
        
        // Skip removed ingredients
        if (removedIngredients.has(uniqueKey)) {
          return;
        }
        
        const unit = ingredient.unit || ingredient.nutrition?.unit || 'g';
        const baseWeight = ingredient.weight || ingredient.nutrition?.weight || 0;
        const userAmount = parseFloat(ingredientServings[uniqueKey] || ingredientServings[ingId] || String(baseWeight)) || baseWeight;
        
        if (unit === 'ml' || unit === 'milliliters' || unit === 'millilitre') {
          hasMlUnit = true;
          totalMl += userAmount;
        }
      });
      
      if (hasMlUnit && totalMl > 0) {
        return Math.round(totalMl);
      }
    }
    
    // Check servingSize for ml
    const mlMatch = servingSize.match(/(\d+(?:\.\d+)?)\s*(ml|milliliters?|millilitres?)/i);
    if (mlMatch) {
      return Math.round(parseFloat(mlMatch[1]));
    }
    
    // If servingWeightGrams is provided and the food name suggests it's a liquid,
    // assume 1g ≈ 1ml for liquids (approximation)
    const liquidKeywords = ['water', 'juice', 'soda', 'drink', 'beverage', 'tea', 'coffee', 'milk', 'smoothie', 'shake'];
    const isLikelyLiquid = liquidKeywords.some(keyword => foodName.toLowerCase().includes(keyword));
    
    if (isLikelyLiquid && servingWeightGrams && servingWeightGrams > 0) {
      return Math.round(servingWeightGrams);
    }
    
    return null;
  };

  // Helper function to determine hydration type from food name
  const getHydrationTypeFromFood = (foodName: string): 'water' | 'tea' | 'coffee' | 'soda' | 'sports_drink' | 'milk' => {
    const lowerName = foodName.toLowerCase();
    
    if (lowerName.includes('water') || lowerName.includes('h2o')) {
      return 'water';
    } else if (lowerName.includes('tea')) {
      return 'tea';
    } else if (lowerName.includes('coffee') || lowerName.includes('espresso') || lowerName.includes('latte') || lowerName.includes('cappuccino')) {
      return 'coffee';
    } else if (lowerName.includes('milk') || lowerName.includes('dairy')) {
      return 'milk';
    } else if (lowerName.includes('sports drink') || lowerName.includes('gatorade') || lowerName.includes('powerade') || lowerName.includes('electrolyte')) {
      return 'sports_drink';
    } else if (lowerName.includes('soda') || lowerName.includes('pop') || lowerName.includes('cola') || lowerName.includes('soft drink')) {
      return 'soda';
    }
    
    // Default to water for other liquids
    return 'water';
  };

  const handlePortionConfirm = async () => {
    if (!pendingAnalysis) return;
    
    // If ingredients are available, calculate nutrition from ingredients
    if (pendingAnalysis.ingredients && pendingAnalysis.ingredients.length > 0) {
      console.log('🍽️ Logging individual ingredients...');
      
      // Log each selected ingredient as a separate food item
      const ingredientPromises = pendingAnalysis.ingredients.map(async (ingredient: any, index: number) => {
        const ingId = ingredient.id || ingredient.name || `ingredient-${index}`;
        const uniqueKey = `${ingId}-${index}`;
        
        // Skip unselected ingredients
        if (!selectedIngredients.has(uniqueKey)) {
          console.log(`  ${ingredient.name}: not selected, skipping`);
          return;
        }
        
        // Get the amount entered by user (in the ingredient's unit: g, ml, etc.)
        const baseWeight = ingredient.weight || ingredient.nutrition?.weight || 0;
        const userAmount = parseFloat(ingredientServings[uniqueKey] || ingredientServings[ingId] || String(baseWeight)) || baseWeight;
        const baseUnit = ingredient.unit || ingredient.nutrition?.unit || 'g';
        
        // Calculate multiplier: userAmount / baseWeight
        // If user enters 25g and base is 18.75g, multiplier = 25/18.75 = 1.33x
        const multiplier = baseWeight > 0 ? userAmount / baseWeight : 1;
        
        const ingNutrition = ingredient.nutrition || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
        };
        
        // Build serving size string with unit if available
        let servingSizeStr = `${userAmount} ${baseUnit}`;
        if (ingredient.servingUnit && ingredient.servingQuantity) {
          servingSizeStr = `${ingredient.servingQuantity} ${ingredient.servingUnit} (${userAmount} ${baseUnit})`;
        }
        
        // Create individual food item for this ingredient
        // Prioritize ingredient-specific image from Passio, don't fall back to original photo
        const ingredientImageUri = ingredient.ingredientImageUrl || ingredient.imageUri || undefined;
        
        const ingredientFood: Omit<FoodItem, 'id' | 'timestamp'> = {
          name: ingredient.name || ingredient.label || 'Unknown ingredient',
          calories: Math.round(ingNutrition.calories * multiplier),
          protein: Math.round(ingNutrition.protein * multiplier),
          carbs: Math.round(ingNutrition.carbs * multiplier),
          fat: Math.round(ingNutrition.fat * multiplier),
          fiber: Math.round(ingNutrition.fiber * multiplier),
          sugar: Math.round(ingNutrition.sugar * multiplier),
          servingSize: servingSizeStr,
          confidence: ingredient.confidence || pendingAnalysis.confidence || 0.8,
          imageUri: ingredientImageUri, // Only use ingredient-specific image, not the original photo
          mealType: selectedMealType,
          servingWeightGrams: Math.round(userAmount),
        };
        
        console.log(`  ✅ Logging ingredient: ${ingredientFood.name} - ${ingredientFood.calories} cal`);
        
        const result = await addFoodItem(ingredientFood, selectedDate);
        if (!result.success) {
          console.error(`Error saving ingredient ${ingredientFood.name} to Supabase:`, result.error);
        }
        
        return result;
      });
      
      // Wait for all ingredients to be logged
      await Promise.all(ingredientPromises);
      
      // Check each ingredient for hydration (liquids)
      pendingAnalysis.ingredients.forEach(async (ingredient: any, index: number) => {
        const ingId = ingredient.id || ingredient.name || `ingredient-${index}`;
        const uniqueKey = `${ingId}-${index}`;
        
        // Skip unselected ingredients
        if (!selectedIngredients.has(uniqueKey)) {
          return;
        }
        
        const baseWeight = ingredient.weight || ingredient.nutrition?.weight || 0;
        const userAmount = parseFloat(ingredientServings[uniqueKey] || ingredientServings[ingId] || String(baseWeight)) || baseWeight;
        const baseUnit = ingredient.unit || ingredient.nutrition?.unit || 'g';
        
        // Check if this ingredient is a liquid and should be added to hydration
        const volumeMl = extractVolumeFromFood(
          ingredient.name || 'Unknown',
          `${userAmount} ${baseUnit}`,
          userAmount,
          [ingredient]
        );
        
        if (volumeMl && volumeMl > 0 && !isAlcoholicBeverage(ingredient.name)) {
          const hydrationType = getHydrationTypeFromFood(ingredient.name);
          console.log(`💧 Auto-adding ${volumeMl}ml of ${hydrationType} to hydration from ingredient: ${ingredient.name}`);
          await addHydration(volumeMl, hydrationType);
        }
      });
      
      // Close modal and clear state
      setShowPortionModal(false);
      setPendingAnalysis(null);
      setIngredientServings({});
      setSelectedIngredients(new Set());
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      
      // Small delay to ensure modal fully closes before showing success animation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Success feedback
      if (Platform.OS === 'ios') {
        Vibration.vibrate([0, 100, 50, 100]);
      } else {
        Vibration.vibrate(200);
      }
      
      successScaleAnim.setValue(0);
      Animated.spring(successScaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }).start(() => {
        // Scale back down after a moment
        setTimeout(() => {
          Animated.timing(successScaleAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, 500);
      });
      
      return;
    }
    
    // Fallback: Use dish-level nutrition if no ingredients
    let servings = parseFloat(portionServings || '1');
    if (!isFinite(servings) || servings <= 0) {
      servings = 1;
    }

    const multiplier = servings;
    const base = pendingAnalysis;

    const newFood: Omit<FoodItem, 'id' | 'timestamp'> = {
      name: base.name,
      calories: Math.round(base.calories * multiplier),
      protein: Math.round(base.protein * multiplier),
      carbs: Math.round(base.carbs * multiplier),
      fat: Math.round(base.fat * multiplier),
      fiber: Math.round(base.fiber * multiplier),
      sugar: Math.round(base.sugar * multiplier),
      servingSize: `${servings} × ${base.servingSize || 'serving'}`,
      confidence: base.confidence || 0.8,
      imageUri: base.imageUri,
      mealType: selectedMealType,
      servingWeightGrams: base.servingWeightGrams ? Math.round(base.servingWeightGrams * multiplier) : undefined,
    };

    const result = await addFoodItem(newFood, selectedDate);
    if (!result.success) {
      console.error('Error saving food to Supabase:', result.error);
    }
    
    // Check if this food item is a liquid (ml unit) and should be added to hydration
    const volumeMl = extractVolumeFromFood(
      newFood.name,
      newFood.servingSize,
      newFood.servingWeightGrams
    );
    
    if (volumeMl && volumeMl > 0 && !isAlcoholicBeverage(newFood.name)) {
      const hydrationType = getHydrationTypeFromFood(newFood.name);
      console.log(`💧 Auto-adding ${volumeMl}ml of ${hydrationType} to hydration from food item: ${newFood.name}`);
      await addHydration(volumeMl, hydrationType);
    }
    
    // Close modal and clear state
    setShowPortionModal(false);
    setPendingAnalysis(null);
    setIsAnalyzing(false);
    setAnalysisProgress(0);
    
    // Small delay to ensure modal fully closes before showing success animation
    await new Promise(resolve => setTimeout(resolve, 100));

    // Success feedback: vibration and animation
    if (Platform.OS === 'ios') {
      // Strong vibration pattern for success
      Vibration.vibrate([0, 100, 50, 100]);
    } else {
      Vibration.vibrate(200);
    }

    // Success animation
    successScaleAnim.setValue(0);
    Animated.spring(successScaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start(() => {
      // Scale back down after a moment
      setTimeout(() => {
        Animated.timing(successScaleAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 500);
    });

    // Close the meal selection sheet silently so the success animation is fully visible
    setShowMealModal(false);
  };

  const handleMealTypeSelect = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    setSelectedMealType(mealType);
    setShowMealModal(false);
    // Skip time picker for now - go directly to camera
    setTimeout(() => takePicture(), 300);
  };

  const onConfirmMealTime = (_event: any, date?: Date) => {
    const chosen = date || mealTime;
    if (Platform.OS !== 'ios') setShowTimePicker(false);
    setMealTime(chosen);
    setTimeout(() => takePicture(), 150);
  };

  const openManualFoodModal = () => {
    setEditingFood(null);
    setManualFood({
      name: '',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      fiber: '',
      sugar: '',
      servingSize: '',
    });
    setShowManualFoodModal(true);
  };

  const editFood = (food: FoodItem) => {
    // Parse serving size to extract amount and unit
    // Format could be: "500 g", "2 slices (500 g)", "1 cup (250 g)", etc.
    let servingAmount = food.servingWeightGrams || 100;
    let servingUnit = 'g';
    
    // Try to extract from servingSize string
    const servingSizeStr = food.servingSize || '';
    
    // Check for pattern like "2 slices (500 g)" or "1 cup (250 g)"
    const withUnitMatch = servingSizeStr.match(/(\d+(?:\.\d+)?)\s+(\w+)\s*\((\d+(?:\.\d+)?)\s*(\w+)\)/);
    if (withUnitMatch) {
      servingUnit = withUnitMatch[2]; // e.g., "slices", "cup"
      servingAmount = parseFloat(withUnitMatch[3]) || servingAmount; // grams value
    } else {
      // Check for simple pattern like "500 g"
      const simpleMatch = servingSizeStr.match(/(\d+(?:\.\d+)?)\s*(\w+)/);
      if (simpleMatch) {
        servingAmount = parseFloat(simpleMatch[1]) || servingAmount;
        servingUnit = simpleMatch[2] || 'g';
      }
    }
    
    // Set up the adjustment modal with food data
    const adjustmentData = {
      uniqueKey: food.id,
      ingId: food.id,
      ingName: food.name,
      currentServingAmount: String(servingAmount),
      currentServingUnit: servingUnit,
      baseWeight: food.servingWeightGrams || servingAmount,
      nutrition: {
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        sugar: food.sugar,
        weight: food.servingWeightGrams || servingAmount,
        unit: 'g',
      },
      ingredientImageUrl: food.imageUri,
      servingUnit: servingUnit !== 'g' ? servingUnit : undefined,
      servingQuantity: servingUnit !== 'g' ? 1 : undefined,
    };
    
    // Store the food item being edited for later update
    setEditingFood(food);
    setSelectedIngredientForAdjustment(adjustmentData);
    setAdjustServingNumber(String(servingAmount));
    setAdjustServingUnit(servingUnit);
    
    // Initialize date/time for editing
    // Extract date from food timestamp (use local timezone)
    const foodDate = getLocalDateString(food.timestamp);
    setEditFoodDate(foodDate);
    setEditFoodTime(food.timestamp);
    
    // Open the Adjust Serving Size modal
    setShowAdjustServingModal(true);
  };

  const saveManualFood = async () => {
    if (!manualFood.name || !manualFood.calories) {
      Alert.alert('Missing Information', 'Please enter at least food name and calories.');
      return;
    }

    // Calculate portion multiplier if editing
    let portionMultiplier = 1;
    let finalServingSize = manualFood.servingSize || '1 × Serving';
    let finalServingWeightGrams: number | undefined = editBaseServingWeight;

    if (editingFood) {
      // Use the portion servings multiplier
      portionMultiplier = parseFloat(editPortionServings || '1');
      if (!isFinite(portionMultiplier) || portionMultiplier <= 0) {
        portionMultiplier = 1;
      }
      finalServingSize = `${portionMultiplier} × ${editBaseServingSize || manualFood.servingSize || 'Serving'}`;
      if (editBaseServingWeight) {
        finalServingWeightGrams = editBaseServingWeight * portionMultiplier;
      }
    }

    // Always store base serving weight as a whole number (no decimals)
    if (finalServingWeightGrams !== undefined) {
      finalServingWeightGrams = Math.round(finalServingWeightGrams);
    }

    const foodItem: Omit<FoodItem, 'id' | 'timestamp'> = {
      name: manualFood.name,
      calories: Math.round((parseFloat(manualFood.calories) || 0) * portionMultiplier),
      protein: Math.round((parseFloat(manualFood.protein) || 0) * portionMultiplier),
      carbs: Math.round((parseFloat(manualFood.carbs) || 0) * portionMultiplier),
      fat: Math.round((parseFloat(manualFood.fat) || 0) * portionMultiplier),
      fiber: Math.round((parseFloat(manualFood.fiber) || 0) * portionMultiplier),
      sugar: Math.round((parseFloat(manualFood.sugar) || 0) * portionMultiplier),
      servingSize: finalServingSize,
      confidence: editingFood?.confidence ?? 0.8,
      imageUri: editingFood?.imageUri,
      mealType: selectedMealType,
      servingWeightGrams: finalServingWeightGrams,
    };

    if (editingFood) {
      // Update existing food
      await removeFoodItem(editingFood.id);
      const result = await addFoodItem(foodItem);
      if (!result.success) {
        console.error('Error saving food to Supabase:', result.error);
      }
      
      // Check if this food item is a liquid (ml unit) and should be added to hydration
      const volumeMl = extractVolumeFromFood(
        foodItem.name,
        foodItem.servingSize,
        foodItem.servingWeightGrams
      );
      
      if (volumeMl && volumeMl > 0 && !isAlcoholicBeverage(foodItem.name)) {
        const hydrationType = getHydrationTypeFromFood(foodItem.name);
        console.log(`💧 Auto-adding ${volumeMl}ml of ${hydrationType} to hydration from food item: ${foodItem.name}`);
        await addHydration(volumeMl, hydrationType);
      }
    } else {
      // Add new food
      const result = await addFoodItem(foodItem);
      if (!result.success) {
        console.error('Error saving food to Supabase:', result.error);
      }
      
      // Check if this food item is a liquid (ml unit) and should be added to hydration
      const volumeMl = extractVolumeFromFood(
        foodItem.name,
        foodItem.servingSize,
        foodItem.servingWeightGrams
      );
      
      if (volumeMl && volumeMl > 0 && !isAlcoholicBeverage(foodItem.name)) {
        const hydrationType = getHydrationTypeFromFood(foodItem.name);
        console.log(`💧 Auto-adding ${volumeMl}ml of ${hydrationType} to hydration from food item: ${foodItem.name}`);
        await addHydration(volumeMl, hydrationType);
      }
    }

    // Close modals and reset state immediately
    setShowManualFoodModal(false);
    setEditingFood(null);
    setShowEditTimePicker(false); // Ensure time picker is closed
    
    // Don't show alert - it blocks the UI. The user can see the updated food in the diary.
  };

  const addHydration = async (volume: number, type: string = 'water') => {
    try {
      // Normalize type: convert 'sports drink' to 'sports_drink' for database compatibility
      const normalizedType = type === 'sports drink' ? 'sports_drink' : type;
      
      // Calculate macros based on drink type and volume
      const macros = calculateDrinkMacros(normalizedType, volume);
      
      const hydrationEntry = {
        type: normalizedType as 'water' | 'tea' | 'coffee' | 'soda' | 'sports_drink' | 'milk',
        volume: volume,
        ...macros,
      };
      
      const result = await addHydrationEntry(hydrationEntry, selectedDate);
      if (result.success) {
        // Display the original type name (with space) for better UX
        Alert.alert('Success', `Added ${volume}ml of ${type}!`);
      } else {
        // Hydration was saved locally but Supabase sync failed
        const errorMsg = result.error?.message || 'Unknown error';
        const errorCode = result.error?.code || 'UNKNOWN';
        console.error('Supabase error details:', result.error);
        
        Alert.alert(
          'Hydration Saved Locally', 
          `Your hydration has been saved locally, but there was an issue syncing to the server.\n\nError: ${errorCode}\n${errorMsg}\n\nPlease check your Supabase setup. See supabase-hydration-schema.sql for instructions.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error adding hydration:', error);
      Alert.alert('Error', 'Failed to add hydration. Please try again.');
    }
  };

  const calculateDrinkMacros = (type: string, volume: number) => {
    const ratio = volume / 250; // Base calculations on 250ml
    
    switch (type) {
      case 'sports_drink':
        return {
          calories: Math.round(60 * ratio),
          protein: 0,
          carbs: Math.round(15 * ratio),
          fat: 0,
          sodium: Math.round(110 * ratio),
        };
      case 'milk':
        return {
          calories: Math.round(160 * ratio),
          protein: Math.round(8 * ratio),
          carbs: Math.round(12 * ratio),
          fat: Math.round(8 * ratio),
          sodium: Math.round(100 * ratio),
        };
      case 'water':
        return {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          sodium: 0,
        };
      case 'tea':
        return {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          sodium: Math.round(10 * ratio),
        };
      case 'coffee':
        return {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          sodium: Math.round(10 * ratio),
        };
      case 'soda':
        return {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          sodium: Math.round(20 * ratio),
        };
      default:
        return {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          sodium: 0,
        };
    }
  };

  const saveExercise = async () => {
    if (exerciseDuration <= 0 || exerciseRpe < 1 || exerciseRpe > 10) {
      Alert.alert('Invalid', 'Please select valid duration and effort (1-10).');
      return;
    }
    // Combine selected date with the time from picker - use local time components
    const [year, month, day] = selectedDate.split('-').map(Number);
    const hour = exerciseStartTime.getHours();
    const minute = exerciseStartTime.getMinutes();
    // Create date using local time components to avoid timezone conversion
    const finalTime = new Date(year, month - 1, day, hour, minute, 0, 0);
    
    // Add to context
    const result = await addExerciseEntry({ type: exerciseType, durationMins: exerciseDuration, rpe: exerciseRpe, time: finalTime }, selectedDate);
    
    setShowExerciseModal(false);
    setExerciseDuration(30);
    setExerciseRpe(6);
    setExerciseStartTime(new Date());
    
    if (result.success) {
      Alert.alert('Success', 'Exercise logged.');
    } else {
      // Exercise was saved locally but Supabase sync failed
      const errorMsg = result.error?.message || 'Unknown error';
      const errorCode = result.error?.code || 'UNKNOWN';
      console.error('Supabase error details:', result.error);
      
      Alert.alert(
        'Exercise Saved Locally', 
        `Your exercise has been saved locally, but there was an issue syncing to the server.\n\nError: ${errorCode}\n${errorMsg}\n\nPlease check your Supabase setup. See SUPABASE_SETUP.md for instructions.`,
        [{ text: 'OK' }]
      );
    }
  };

  const saveHydrationEntry = async () => {
    if (!hydrationVolume) {
      Alert.alert('Missing Information', 'Please enter volume.');
      return;
    }

    const volume = parseFloat(hydrationVolume);
    if (isNaN(volume) || volume <= 0) {
      Alert.alert('Invalid Volume', 'Please enter a valid volume.');
      return;
    }

    await addHydration(volume, hydrationType);
    setShowHydrationModal(false);
    setHydrationVolume('');
  };

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

  const getFiberColor = (current: number) => {
    if (current <= 10) return '#FF3B30'; // Red if 10g or under
    if (current <= 24) return '#FF9800'; // Orange from 11-24g
    if (current <= 44) return '#4CAF50'; // Green from 25-44g
    return '#FF3B30'; // Red from 45g and above
  };

  const renderMacroProgress = (label: string, current: number, goal: number, unit: string) => {
    const percentage = getProgressPercentage(current, goal);
    const color = label.toLowerCase() === 'fiber' ? getFiberColor(current) : getProgressColor(percentage, label.toLowerCase() as any);

    // Handle energy units for calories
    const displayLabel = label === 'Calories' && state.preferences.energy === 'kilojoules' ? 'Energy (kJ)' : (label === 'Calories' ? 'Energy (Cal)' : label);
    const displayCurrent = label === 'Calories' ? formatEnergy(current) : `${Math.round(current)}${unit}`;
    const displayGoal = label === 'Calories' ? formatEnergy(goal) : `${Math.round(goal)}${unit}`;

    return (
      <View style={styles.macroProgressItem}>
        <View style={styles.macroProgressHeader}>
          <Text style={styles.macroProgressLabel}>{displayLabel}</Text>
          <View style={styles.macroProgressRight}>
            <Text style={styles.macroProgressValue}>
              {displayCurrent} / {displayGoal}
            </Text>
            <Text style={styles.progressPercentageInline}>({Math.round(percentage)}%)</Text>
          </View>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  const renderCircularProgressBar = (
    label: string,
    progress: number,
    value: string,
    iconName: string,
    onPress: () => void
  ) => {
    const progressPercentage = Math.min(progress * 100, 100);
    const rotation = progress * 360 - 90;
    const progressColor = progress >= 0.8 ? '#4CAF50' : progress >= 0.5 ? '#FF9800' : '#0090A3';

    return (
      <TouchableOpacity style={styles.circularProgressCard} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.circularProgressWrapper}>
          <View style={styles.circularProgressInner}>
            <View style={styles.circularProgressBg} />
            {progress > 0 && (
              <View style={styles.circularProgressFillContainer}>
                {progress <= 0.25 ? (
                  <View style={[styles.circularProgressFill, { transform: [{ rotate: `${rotation}deg` }], borderTopColor: progressColor }]} />
                ) : progress <= 0.5 ? (
                  <View style={[styles.circularProgressFill, { transform: [{ rotate: `${rotation}deg` }], borderTopColor: progressColor, borderRightColor: progressColor }]} />
                ) : progress <= 0.75 ? (
                  <View style={[styles.circularProgressFill, { transform: [{ rotate: `${rotation}deg` }], borderTopColor: progressColor, borderRightColor: progressColor, borderBottomColor: progressColor }]} />
                ) : (
                  <View style={[styles.circularProgressFill, { transform: [{ rotate: `${rotation}deg` }], borderTopColor: progressColor, borderRightColor: progressColor, borderBottomColor: progressColor, borderLeftColor: progressColor }]} />
                )}
              </View>
            )}
            <View style={styles.circularProgressContent}>
              <MaterialCommunityIcons name={iconName as any} size={24} color={progressColor} />
              <Text style={styles.circularProgressValue}>{value}</Text>
            </View>
          </View>
          <View style={styles.circularProgressPlusIcon}>
            <Ionicons name="add-circle" size={20} color="#0090A3" />
          </View>
        </View>
        <Text style={styles.circularProgressLabel}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderFoodItem = (item: FoodItem) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.foodItem}
      onPress={() => editFood(item)}
      activeOpacity={0.7}
    >
      <View style={styles.foodItemContent}>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.foodImage} />
        ) : (
          <View style={styles.foodImagePlaceholder}>
            <Ionicons name="image-outline" size={19} color="#999" />
          </View>
        )}
        <View style={styles.foodDetails}>
          <Text style={styles.foodName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
          <Text style={styles.foodServing}>{item.servingSize}</Text>
          <View style={styles.foodMacros}>
            <Text style={styles.macroText}>P: {Math.round(item.protein)}g</Text>
            <Text style={styles.macroText}>C: {Math.round(item.carbs)}g</Text>
            <Text style={styles.macroText}>F: {Math.round(item.fat)}g</Text>
          </View>
        </View>
        <View style={styles.foodEnergyContainer}>
          <Text style={styles.foodCalories}>{formatEnergy(item.calories)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Date Selector */}
        <View style={styles.dateSelectorContainer}>
          <ScrollView 
            ref={dateSelectorRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateSelectorScrollContent}
            snapToInterval={78}
            decelerationRate="fast"
          >
            {dateList.map((dateStr) => {
              const date = new Date(dateStr);
              const isToday = dateStr === todayDateString;
              const isSelected = dateStr === selectedDate;
              const dayName = isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNumber = date.getDate();
              const monthName = date.toLocaleDateString('en-US', { month: 'short' });
              const hasData = state.dailyLogs.some(log => log.date === dateStr && (
                (log.foods && log.foods.length > 0) ||
                (log.exercises && log.exercises.length > 0) ||
                (log.hydration && log.hydration.length > 0) ||
                (log.bowel && log.bowel.length > 0) ||
                (log.symptoms && log.symptoms.length > 0)
              ));

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.dateSelectorItem,
                    isSelected && styles.dateSelectorItemSelected
                  ]}
                  onPress={() => setSelectedDate(dateStr)}
                >
                  <Text style={[
                    styles.dateSelectorDayName,
                    isSelected && styles.dateSelectorDayNameSelected
                  ]}>
                    {dayName}
                  </Text>
                  <Text style={[
                    styles.dateSelectorDayNumber,
                    isSelected && styles.dateSelectorDayNumberSelected
                  ]}>
                    {dayNumber}
                  </Text>
                  <Text style={[
                    styles.dateSelectorMonth,
                    isSelected && styles.dateSelectorMonthSelected
                  ]}>
                    {monthName}
                  </Text>
                  {hasData && (
                    <View style={[
                      styles.dateSelectorDot,
                      isSelected && styles.dateSelectorDotSelected
                    ]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Daily Progress */}
        <View style={styles.card}>
          {renderMacroProgress('Calories', todaysTotals.calories, effectiveGoals.calories, '')}
          {renderMacroProgress('Protein', todaysTotals.protein, effectiveGoals.protein, 'g')}
          {renderMacroProgress('Carbs', todaysTotals.carbs, effectiveGoals.carbs, 'g')}
          {renderMacroProgress('Fat', todaysTotals.fat, effectiveGoals.fat, 'g')}
          {renderMacroProgress('Fiber', todaysTotals.fiber, effectiveGoals.fiber, 'g')}
        </View>

        {/* Quick Log Progress Bars */}
        <View style={styles.quickLogRow}>
          {renderCircularProgressBar(
            'Hydration',
            Math.min((todaysTotals.hydration || 0) / (state.user?.weight ? state.user.weight * 30 : 2000), 1),
            `${Math.round(todaysTotals.hydration || 0)}`,
            'water',
            () => setShowHydrationModal(true)
          )}
          {renderCircularProgressBar(
            'Exercise',
            currentLog?.exercises ? Math.min(currentLog.exercises.length / 3, 1) : 0,
            currentLog?.exercises ? `${currentLog.exercises.reduce((sum, e) => sum + e.durationMins, 0)}m` : '0m',
            'run-fast',
            () => {
              initializeExerciseTime();
              setShowExerciseModal(true);
            }
          )}
          {renderCircularProgressBar(
            'Bowel',
            currentLog?.bowel ? Math.min(currentLog.bowel.length / 2, 1) : 0,
            currentLog?.bowel ? `${currentLog.bowel.length}` : '0',
            'toilet',
            () => {
              initializeBowelTime();
              setShowBristolModal(true);
            }
          )}
          {renderCircularProgressBar(
            'Symptoms',
            currentLog?.symptoms ? Math.min(currentLog.symptoms.length / 3, 1) : 0,
            currentLog?.symptoms ? `${currentLog.symptoms.length}` : '0',
            'alert-circle',
            () => {
              initializeSymptomTime();
              setShowSymptomModal(true);
            }
          )}
        </View>

        {/* Food Diary */}
        <View style={styles.card}>
          {!currentLog || currentLog.foods.length === 0 ? (
            <View style={[styles.emptyState, { paddingTop: 20 }]}> 
              <MaterialCommunityIcons name="food-apple" size={48} color="#B9A68D" />
              <Text style={styles.emptyText}>No foods logged yet</Text>
              <Text style={styles.emptySubtext}>Use Take Photo, Choose Photo, or Manual Entry</Text>
            </View>
          ) : (
            <View>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(mealType => {
                const mealFoods = currentLog.foods.filter(food => food.mealType === mealType);
                if (mealFoods.length === 0) return null;
                return (
                  <View key={mealType} style={styles.mealSection}>
                    <Text style={styles.mealTitle}>
                      {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                    </Text>
                    {mealFoods.map(renderFoodItem)}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Exercise Logs Card */}
        {currentLog && currentLog.exercises && currentLog.exercises.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Exercise Logged</Text>
            {currentLog.exercises.map((exercise) => (
              <View key={exercise.id} style={styles.logItem}>
                <View style={styles.logItemContent}>
                  <View style={styles.logItemHeader}>
                    <Text style={styles.logItemTitle}>{exercise.type}</Text>
                    <Text style={styles.logItemTime}>
                      {new Date(exercise.time).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </Text>
                  </View>
                  <View style={styles.logItemDetails}>
                    <Text style={styles.logItemDetail}>Duration: {exercise.durationMins} mins</Text>
                    <Text style={styles.logItemDetail}>Effort: {exercise.rpe}/10</Text>
                  </View>
                </View>
                <View style={styles.foodActions}>
                  <TouchableOpacity 
                    style={styles.editButton} 
                    onPress={() => {
                      setExerciseType(exercise.type);
                      setExerciseDuration(exercise.durationMins);
                      setExerciseRpe(exercise.rpe);
                      setExerciseStartTime(new Date(exercise.time));
                      setShowExerciseModal(true);
                      // Remove the old entry when editing
                      removeExerciseEntry(exercise.id, selectedDate);
                    }}
                  >
                    <Ionicons name="pencil" size={20} color="#B9A68D" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.removeButton} 
                    onPress={() => removeExerciseEntry(exercise.id, selectedDate)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Bowel Logs Card */}
        {currentLog && currentLog.bowel && currentLog.bowel.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Bowel Movements Logged</Text>
            {currentLog.bowel.map((bowel) => (
              <View key={bowel.id} style={styles.logItem}>
                <View style={styles.logItemContent}>
                  <View style={styles.logItemHeader}>
                    <Text style={styles.logItemTitle}>Bristol Type {bowel.bristol}</Text>
                    <Text style={styles.logItemTime}>
                      {new Date(bowel.timestamp).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </Text>
                  </View>
                </View>
                <View style={styles.foodActions}>
                  <TouchableOpacity 
                    style={styles.editButton} 
                    onPress={() => {
                      setBowelTime(new Date(bowel.timestamp));
                      setShowBristolModal(true);
                      // Remove the old entry when editing
                      removeBowelEntry(bowel.id, selectedDate);
                    }}
                  >
                    <Ionicons name="pencil" size={20} color="#B9A68D" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.removeButton} 
                    onPress={() => removeBowelEntry(bowel.id, selectedDate)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Symptom Logs Card */}
        {currentLog && currentLog.symptoms && currentLog.symptoms.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Symptoms Logged</Text>
            {currentLog.symptoms.map((symptom) => (
              <View key={symptom.id} style={styles.logItem}>
                <View style={styles.logItemContent}>
                  <View style={styles.logItemHeader}>
                    <Text style={styles.logItemTitle}>{symptom.text}</Text>
                    <Text style={styles.logItemTime}>
                      {new Date(symptom.timestamp).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </Text>
                  </View>
                </View>
                <View style={styles.foodActions}>
                  <TouchableOpacity 
                    style={styles.editButton} 
                    onPress={() => {
                      setSymptomText(symptom.text);
                      setSymptomTime(new Date(symptom.timestamp));
                      setShowSymptomModal(true);
                      // Remove the old entry when editing
                      removeSymptomEntry(symptom.id, selectedDate);
                    }}
                  >
                    <Ionicons name="pencil" size={20} color="#B9A68D" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.removeButton} 
                    onPress={() => removeSymptomEntry(symptom.id, selectedDate)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Bristol Picker Modal */}
      <Modal visible={showBristolModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.manualFoodModal}>
            <Text style={styles.modalTitle}>Log Bowel Movement</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Time occurred</Text>
              <View style={styles.iOSPickerContainer}>
                <View style={styles.iOSPickerHighlight} />
                <View style={[styles.iOSPickerColumn, { flex: 0.8 }]}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 40, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: ((bowelTime.getHours() % 12 || 12) - 1) * 40 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const hour = selectedIndex === 0 ? 12 : selectedIndex + 1;
                      const newTime = new Date(bowelTime);
                      const currentHour = newTime.getHours();
                      const isAM = currentHour < 12;
                      const newHour = isAM ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12);
                      newTime.setHours(newHour);
                      // Set date to selected date
                      const [year, month, day] = selectedDate.split('-').map(Number);
                      newTime.setFullYear(year);
                      newTime.setMonth(month - 1);
                      newTime.setDate(day);
                      // Validate and clamp if in future
                      const clampedTime = clampToCurrentTime(newTime);
                      setBowelTime(clampedTime);
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const hour = i === 0 ? 12 : i;
                      return (
                        <View key={i} style={styles.iOSPickerItem}>
                          <Text style={styles.iOSPickerText}>
                            {hour}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
                <View style={[styles.iOSPickerColumn, { flex: 0.8 }]}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 40, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: bowelTime.getMinutes() * 40 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const clampedIndex = Math.max(0, Math.min(59, selectedIndex));
                      const newTime = new Date(bowelTime);
                      newTime.setMinutes(clampedIndex);
                      // Set date to selected date
                      const [year, month, day] = selectedDate.split('-').map(Number);
                      newTime.setFullYear(year);
                      newTime.setMonth(month - 1);
                      newTime.setDate(day);
                      // Validate and clamp if in future
                      const clampedTime = clampToCurrentTime(newTime);
                      setBowelTime(clampedTime);
                    }}
                  >
                    {Array.from({ length: 60 }, (_, i) => (
                      <View key={i} style={styles.iOSPickerItem}>
                        <Text style={styles.iOSPickerText}>
                          {i.toString().padStart(2, '0')}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
                <View style={[styles.iOSPickerColumn, { flex: 0.8 }]}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 40, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: (bowelTime.getHours() < 12 ? 0 : 1) * 40 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const clampedIndex = Math.max(0, Math.min(1, selectedIndex));
                      const period = clampedIndex === 0 ? 'AM' : 'PM';
                      const newTime = new Date(bowelTime);
                      const currentHour = newTime.getHours();
                      const newHour = period === 'AM' 
                        ? (currentHour >= 12 ? currentHour - 12 : currentHour)
                        : (currentHour < 12 ? currentHour + 12 : currentHour);
                      newTime.setHours(newHour);
                      // Set date to selected date
                      const [year, month, day] = selectedDate.split('-').map(Number);
                      newTime.setFullYear(year);
                      newTime.setMonth(month - 1);
                      newTime.setDate(day);
                      // Validate and clamp if in future
                      const clampedTime = clampToCurrentTime(newTime);
                      setBowelTime(clampedTime);
                    }}
                  >
                    {['AM', 'PM'].map((period, i) => (
                      <View key={i} style={styles.iOSPickerItem}>
                        <Text style={styles.iOSPickerText}>
                          {period}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bristol Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {[1,2,3,4,5,6,7].map(n => (
                  <TouchableOpacity key={n} onPress={() => { 
                    // Combine selected date with the time from picker - use local time components
                    const [year, month, day] = selectedDate.split('-').map(Number);
                    const hour = bowelTime.getHours();
                    const minute = bowelTime.getMinutes();
                    // Create date using local time components to avoid timezone conversion
                    const finalTime = new Date(year, month - 1, day, hour, minute, 0, 0);
                    addBowelEntry(n as any, finalTime, selectedDate); 
                    setShowBristolModal(false); 
                    setBowelTime(new Date()); 
                  }} style={{ width: '30%', backgroundColor: '#F8F9FA', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' }}>
                    <Text style={{ fontSize: 16, color: '#333' }}>Type {n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.cancelButton, styles.fullWidthCancelButton]}
              onPress={() => { setShowBristolModal(false); setBowelTime(new Date()); }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      {/* Symptom Modal */}
      <Modal visible={showSymptomModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => {
                setShowSymptomModal(false);
                setSymptomText('');
                setSymptomTime(new Date());
              }}
            />
            <ScrollView 
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.manualFoodModal} pointerEvents="box-none">
                <Text style={styles.modalTitle}>Log Symptom</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Describe symptom</Text>
                  <TextInput style={styles.textInput} placeholder="e.g., bloating after lunch" value={symptomText} onChangeText={setSymptomText} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Time occurred</Text>
                  <View style={styles.iOSPickerContainer} pointerEvents="auto">
                <View style={styles.iOSPickerHighlight} />
                <View style={[styles.iOSPickerColumn, { flex: 0.8 }]}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 40, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: ((symptomTime.getHours() % 12 || 12) - 1) * 40 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const hour = selectedIndex === 0 ? 12 : selectedIndex + 1;
                      const newTime = new Date(symptomTime);
                      const currentHour = newTime.getHours();
                      const isAM = currentHour < 12;
                      const newHour = isAM ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12);
                      newTime.setHours(newHour);
                      // Set date to selected date
                      const [year, month, day] = selectedDate.split('-').map(Number);
                      newTime.setFullYear(year);
                      newTime.setMonth(month - 1);
                      newTime.setDate(day);
                      // Validate and clamp if in future
                      const clampedTime = clampToCurrentTime(newTime);
                      setSymptomTime(clampedTime);
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const hour = i === 0 ? 12 : i;
                      return (
                        <View key={i} style={styles.iOSPickerItem}>
                          <Text style={styles.iOSPickerText}>
                            {hour}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
                <View style={[styles.iOSPickerColumn, { flex: 0.8 }]}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 40, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: symptomTime.getMinutes() * 40 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const clampedIndex = Math.max(0, Math.min(59, selectedIndex));
                      const newTime = new Date(symptomTime);
                      newTime.setMinutes(clampedIndex);
                      // Set date to selected date
                      const [year, month, day] = selectedDate.split('-').map(Number);
                      newTime.setFullYear(year);
                      newTime.setMonth(month - 1);
                      newTime.setDate(day);
                      // Validate and clamp if in future
                      const clampedTime = clampToCurrentTime(newTime);
                      setSymptomTime(clampedTime);
                    }}
                  >
                    {Array.from({ length: 60 }, (_, i) => (
                      <View key={i} style={styles.iOSPickerItem}>
                        <Text style={styles.iOSPickerText}>
                          {i.toString().padStart(2, '0')}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
                <View style={[styles.iOSPickerColumn, { flex: 0.8 }]}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 40, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: (symptomTime.getHours() < 12 ? 0 : 1) * 40 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const clampedIndex = Math.max(0, Math.min(1, selectedIndex));
                      const period = clampedIndex === 0 ? 'AM' : 'PM';
                      const newTime = new Date(symptomTime);
                      const currentHour = newTime.getHours();
                      const newHour = period === 'AM' 
                        ? (currentHour >= 12 ? currentHour - 12 : currentHour)
                        : (currentHour < 12 ? currentHour + 12 : currentHour);
                      newTime.setHours(newHour);
                      // Set date to selected date
                      const [year, month, day] = selectedDate.split('-').map(Number);
                      newTime.setFullYear(year);
                      newTime.setMonth(month - 1);
                      newTime.setDate(day);
                      // Validate and clamp if in future
                      const clampedTime = clampToCurrentTime(newTime);
                      setSymptomTime(clampedTime);
                    }}
                  >
                    {['AM', 'PM'].map((period, i) => (
                      <View key={i} style={styles.iOSPickerItem}>
                        <Text style={styles.iOSPickerText}>
                          {period}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.cancelButton, styles.inlineCancelButton]} onPress={() => { setShowSymptomModal(false); setSymptomText(''); setSymptomTime(new Date()); }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => { 
                if (symptomText.trim()) { 
                  // Combine selected date with the time from picker - use local time components
                  const [year, month, day] = selectedDate.split('-').map(Number);
                  const hour = symptomTime.getHours();
                  const minute = symptomTime.getMinutes();
                  // Create date using local time components to avoid timezone conversion
                  const finalTime = new Date(year, month - 1, day, hour, minute, 0, 0);
                  addSymptomEntry(symptomText.trim(), finalTime, selectedDate); 
                  setShowSymptomModal(false); 
                  setSymptomText(''); 
                  setSymptomTime(new Date()); 
                } else { 
                  Alert.alert('Missing', 'Please enter a symptom.'); 
                } 
              }}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Exercise Modal */}
      <Modal visible={!!showExerciseModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlay}>
            <ScrollView 
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.manualFoodModal}>
            <Text style={styles.modalTitle}>Log Exercise</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Type</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 8 }}
              >
                {['Walk','Run','Swim','Gym','Sport','Cycling','Other'].map(t => (
                  <TouchableOpacity key={t} onPress={() => setExerciseType(t as any)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: exerciseType===t ? '#B9A68D' : '#E0E0E0', marginRight: 8, backgroundColor: exerciseType===t ? '#F3EEE7' : 'white' }}>
                    <Text style={{ color: '#333' }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Start Time</Text>
              <View style={styles.iOSPickerContainer}>
                <View style={styles.iOSPickerHighlight} />
                <View style={[styles.iOSPickerColumn, { flex: 0.8 }]}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 40, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: ((exerciseStartTime.getHours() % 12 || 12) - 1) * 40 }}
                    snapToInterval={40}
                    decelerationRate="normal"
                    scrollEventThrottle={16}
                    bounces={false}
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const hour = selectedIndex === 0 ? 12 : selectedIndex + 1;
                      const newTime = new Date(exerciseStartTime);
                      const currentHour = newTime.getHours();
                      const isAM = currentHour < 12;
                      const newHour = isAM ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12);
                      newTime.setHours(newHour);
                      // Set date to selected date
                      const [year, month, day] = selectedDate.split('-').map(Number);
                      newTime.setFullYear(year);
                      newTime.setMonth(month - 1);
                      newTime.setDate(day);
                      // Validate and clamp if in future
                      const clampedTime = clampToCurrentTime(newTime);
                      setExerciseStartTime(clampedTime);
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const hour = i === 0 ? 12 : i;
                      return (
                        <View key={i} style={styles.iOSPickerItem}>
                          <Text style={styles.iOSPickerText}>
                            {hour}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
                <View style={[styles.iOSPickerColumn, { flex: 0.8 }]}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 40, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: exerciseStartTime.getMinutes() * 40 }}
                    snapToInterval={40}
                    decelerationRate="normal"
                    scrollEventThrottle={16}
                    bounces={false}
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const clampedIndex = Math.max(0, Math.min(59, selectedIndex));
                      const newTime = new Date(exerciseStartTime);
                      newTime.setMinutes(clampedIndex);
                      // Set date to selected date
                      const [year, month, day] = selectedDate.split('-').map(Number);
                      newTime.setFullYear(year);
                      newTime.setMonth(month - 1);
                      newTime.setDate(day);
                      // Validate and clamp if in future
                      const clampedTime = clampToCurrentTime(newTime);
                      setExerciseStartTime(clampedTime);
                    }}
                  >
                    {Array.from({ length: 60 }, (_, i) => (
                      <View key={i} style={styles.iOSPickerItem}>
                        <Text style={styles.iOSPickerText}>
                          {i.toString().padStart(2, '0')}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
                <View style={[styles.iOSPickerColumn, { flex: 0.8 }]}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 40, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: (exerciseStartTime.getHours() < 12 ? 0 : 1) * 40 }}
                    snapToInterval={40}
                    decelerationRate="normal"
                    scrollEventThrottle={16}
                    bounces={false}
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const clampedIndex = Math.max(0, Math.min(1, selectedIndex));
                      const period = clampedIndex === 0 ? 'AM' : 'PM';
                      const newTime = new Date(exerciseStartTime);
                      const currentHour = newTime.getHours();
                      const newHour = period === 'AM' 
                        ? (currentHour >= 12 ? currentHour - 12 : currentHour)
                        : (currentHour < 12 ? currentHour + 12 : currentHour);
                      newTime.setHours(newHour);
                      // Validate and clamp if in future
                      const [year, month, day] = selectedDate.split('-').map(Number);
                      newTime.setFullYear(year);
                      newTime.setMonth(month - 1);
                      newTime.setDate(day);
                      const clampedTime = clampToCurrentTime(newTime);
                      setExerciseStartTime(clampedTime);
                    }}
                  >
                    {['AM', 'PM'].map((period, i) => (
                      <View key={i} style={styles.iOSPickerItem}>
                        <Text style={styles.iOSPickerText}>
                          {period}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
            <View style={styles.macroRow}>
              <View style={styles.macroInput}>
                <Text style={styles.inputLabel}>Duration (mins)</Text>
                <ScrollView style={[styles.timePickerScroll, { height: 100 }]} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 36 }, (_, i) => (i + 1) * 5).map(duration => (
                    <TouchableOpacity
                      key={duration}
                      style={[
                        styles.timePickerItem,
                        exerciseDuration === duration && styles.timePickerItemSelected
                      ]}
                      onPress={() => setExerciseDuration(duration)}
                    >
                      <Text style={[
                        styles.timePickerText,
                        exerciseDuration === duration && styles.timePickerTextSelected
                      ]}>
                        {duration}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.macroInput}>
                <Text style={styles.inputLabel}>Effort (1-10)</Text>
                <ScrollView style={[styles.timePickerScroll, { height: 100 }]} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 10 }, (_, i) => (i + 1)).map(effort => (
                    <TouchableOpacity
                      key={effort}
                      style={[
                        styles.timePickerItem,
                        exerciseRpe === effort && styles.timePickerItemSelected
                      ]}
                      onPress={() => setExerciseRpe(effort)}
                    >
                      <Text style={[
                        styles.timePickerText,
                        exerciseRpe === effort && styles.timePickerTextSelected
                      ]}>
                        {effort}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.cancelButton, styles.inlineCancelButton]} onPress={() => setShowExerciseModal(false as any)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveExercise}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Meal Type Selection Modal - Hidden for now, may be used elsewhere */}
      {/* <Modal
        visible={showMealModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMealModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Meal Type</Text>
            {['breakfast','snack','lunch','snack','dinner','snack'].map((mealType, index) => (
              <TouchableOpacity
                key={`${mealType}-${index}`}
                style={styles.mealTypeButton}
                onPress={() => handleMealTypeSelect(mealType as any)}
              >
                <Text style={styles.mealTypeButtonText}>
                  {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.cancelButton, styles.fullWidthCancelButton]}
              onPress={() => setShowMealModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal> */}

      {/* Time chooser after selecting meal */}
      {/* {showTimePicker && (
        <DateTimePicker
          value={mealTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onConfirmMealTime}
        />
      )} */}

      {/* Manual Food Entry Modal */}
      <Modal visible={showManualFoodModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.manualFoodModal}>
              <Text style={styles.modalTitle}>
                {editingFood ? 'Edit Food' : 'Add Food Manually'}
              </Text>
              
              <ScrollView 
                style={styles.manualFoodForm}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 20 }}
              >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Food Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={manualFood.name}
                  onChangeText={(text) => setManualFood({...manualFood, name: text})}
                  placeholder="Enter food name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Calories *</Text>
                <TextInput
                  style={styles.textInput}
                  value={manualFood.calories}
                  onChangeText={(text) => setManualFood({...manualFood, calories: text})}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.macroRow}>
                <View style={styles.macroInput}>
                  <Text style={styles.inputLabel}>Protein (g)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={manualFood.protein}
                    onChangeText={(text) => setManualFood({...manualFood, protein: text})}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.macroInput}>
                  <Text style={styles.inputLabel}>Carbs (g)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={manualFood.carbs}
                    onChangeText={(text) => setManualFood({...manualFood, carbs: text})}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.macroRow}>
                <View style={styles.macroInput}>
                  <Text style={styles.inputLabel}>Fat (g)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={manualFood.fat}
                    onChangeText={(text) => setManualFood({...manualFood, fat: text})}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.macroInput}>
                  <Text style={styles.inputLabel}>Fiber (g)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={manualFood.fiber}
                    onChangeText={(text) => setManualFood({...manualFood, fiber: text})}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sugar (g)</Text>
                <TextInput
                  style={styles.textInput}
                  value={manualFood.sugar}
                  onChangeText={(text) => setManualFood({...manualFood, sugar: text})}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              {editingFood ? (
                // Portion size editor for editing existing food
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Portion Size</Text>
                  {editBaseServingSize && (
                    <Text style={styles.confirmFoodHint}>
                      Base serving: {editBaseServingSize}
                      {editBaseServingWeight
                        ? ` (~${Math.round(editBaseServingWeight)} g)`
                        : ''}
                    </Text>
                  )}
                  <TextInput
                    style={styles.textInput}
                    keyboardType="decimal-pad"
                    value={editPortionServings}
                    onChangeText={setEditPortionServings}
                    placeholder="1"
                  />
                  <View style={styles.portionQuickButtons}>
                    {['0.5', '1', '1.5', '2'].map(val => (
                      <TouchableOpacity
                        key={val}
                        style={[
                          styles.portionQuickButton,
                          editPortionServings === val && styles.portionQuickButtonSelected,
                        ]}
                        onPress={() => setEditPortionServings(val)}
                      >
                        <Text
                          style={[
                            styles.portionQuickButtonText,
                            editPortionServings === val && styles.portionQuickButtonTextSelected,
                          ]}
                        >
                          {val}x
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {editBaseServingWeight && editPortionServings && (
                    <Text style={styles.confirmFoodHint}>
                      Approx. total: {Math.round(Number(editPortionServings || '1') * editBaseServingWeight)} g
                    </Text>
                  )}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Base serving description</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editBaseServingSize}
                      onChangeText={setEditBaseServingSize}
                      placeholder="e.g., Serving, 1 cup, 150 g"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Base serving weight (grams)</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      value={editBaseServingWeight !== undefined ? Math.round(editBaseServingWeight).toString() : ''}
                      onChangeText={(text) => {
                        const grams = parseFloat(text);
                        if (!isNaN(grams) && grams >= 0) {
                          // Always keep this as a whole number
                          setEditBaseServingWeight(Math.round(grams));
                        } else if (text === '') {
                          setEditBaseServingWeight(undefined);
                        }
                      }}
                      placeholder="e.g., 100 (optional)"
                    />
                  </View>
                </View>
              ) : (
                // Simple serving description for new manual entries
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Serving description</Text>
                  <TextInput
                    style={styles.textInput}
                    value={manualFood.servingSize}
                    onChangeText={(text) => setManualFood({...manualFood, servingSize: text})}
                    placeholder="e.g., 1 × Serving, 2 slices, 150 g"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Meal</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mealTypeButtonsRow}
                >
                  {(['breakfast', 'snack', 'lunch', 'snack', 'dinner', 'snack'] as const).map((type, index) => (
                    <TouchableOpacity
                      key={`${type}-${index}`}
                      style={[
                        styles.mealTypePill,
                        selectedMealType === type && styles.mealTypePillSelected,
                      ]}
                      onPress={() => setSelectedMealType(type)}
                    >
                      <Text
                        style={[
                          styles.mealTypePillText,
                          selectedMealType === type && styles.mealTypePillTextSelected,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {editingFood && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Time</Text>
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => {
                      // Temporarily close the Edit Food modal so the time picker can show properly
                      setShowManualFoodModal(false);
                      // Small delay to ensure modal closes before opening time picker
                      setTimeout(() => {
                        setShowEditTimePicker(true);
                      }, 200);
                    }}
                  >
                    <Ionicons name="time-outline" size={20} color="#0090A3" />
                    <Text style={styles.timePickerButtonText}>
                      {editFoodTime.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, styles.inlineCancelButton]}
                onPress={() => {
                  setShowManualFoodModal(false);
                  setEditingFood(null); // Reset editing state when canceling
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveManualFood}
              >
                <Text style={styles.saveButtonText}>
                  {editingFood ? 'Update' : 'Add Food'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Time Picker Modal for Editing Food */}
      <Modal visible={showEditTimePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModal}>
            <Text style={styles.modalTitle}>Select Time</Text>
            
            <View style={styles.timePickerContainerEdit}>
              <View style={styles.timePickerColumnEdit}>
                <Text style={styles.timePickerLabelEdit}>Hour</Text>
                <ScrollView style={styles.timePickerScrollEdit} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.timePickerOptionEdit,
                        editFoodTime.getHours() === hour && styles.timePickerOptionSelectedEdit,
                      ]}
                      onPress={() => {
                        const newTime = new Date(editFoodTime);
                        newTime.setHours(hour);
                        setEditFoodTime(newTime);
                      }}
                    >
                      <Text
                        style={[
                          styles.timePickerOptionTextEdit,
                          editFoodTime.getHours() === hour && styles.timePickerOptionTextSelectedEdit,
                        ]}
                      >
                        {hour.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.timePickerColumnEdit}>
                <Text style={styles.timePickerLabelEdit}>Minute</Text>
                <ScrollView style={styles.timePickerScrollEdit} showsVerticalScrollIndicator={false}>
                  {[0, 15, 30, 45].map(minute => (
                    <TouchableOpacity
                      key={minute}
                      style={[
                        styles.timePickerOptionEdit,
                        editFoodTime.getMinutes() === minute && styles.timePickerOptionSelectedEdit,
                      ]}
                      onPress={() => {
                        const newTime = new Date(editFoodTime);
                        newTime.setMinutes(minute);
                        setEditFoodTime(newTime);
                      }}
                    >
                      <Text
                        style={[
                          styles.timePickerOptionTextEdit,
                          editFoodTime.getMinutes() === minute && styles.timePickerOptionTextSelectedEdit,
                        ]}
                      >
                        {minute.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, styles.inlineCancelButton]}
                onPress={() => {
                  setShowEditTimePicker(false);
                  // Reopen the appropriate modal after closing time picker
                  setTimeout(() => {
                    if (showAdjustServingModal) {
                      setShowAdjustServingModal(true);
                    } else if (editingFood) {
                      setShowManualFoodModal(true);
                    }
                  }, 200);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => {
                  setShowEditTimePicker(false);
                  // Reopen the appropriate modal after closing time picker
                  setTimeout(() => {
                    if (showAdjustServingModal) {
                      setShowAdjustServingModal(true);
                    } else if (editingFood) {
                      setShowManualFoodModal(true);
                    }
                  }, 200);
                }}
              >
                <Text style={styles.saveButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal for Editing Food */}
      <Modal visible={showEditDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <Text style={styles.modalTitle}>Select Date</Text>
            
            <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
              {(() => {
                const dates: string[] = [];
                const today = new Date();
                // Show 30 days in the past up to today
                for (let i = 30; i >= 0; i--) {
                  const date = new Date(today);
                  date.setDate(date.getDate() - i);
                  dates.push(getLocalDateString(date));
                }
                return dates.map((dateStr) => {
                  const [year, month, day] = dateStr.split('-').map(Number);
                  // Create date using local timezone components
                  const dateObj = new Date(year, month - 1, day);
                  const isSelected = editFoodDate === dateStr;
                  const isToday = dateStr === getLocalDateString();
                  const isYesterday = dateStr === getLocalDateString(new Date(Date.now() - 86400000));
                  
                  return (
                    <TouchableOpacity
                      key={dateStr}
                      style={[
                        styles.datePickerOption,
                        isSelected && styles.datePickerOptionSelected,
                      ]}
                      onPress={() => {
                        setEditFoodDate(dateStr);
                        // Update editFoodTime to use the selected date with current time components
                        const [y, m, d] = dateStr.split('-').map(Number);
                        const currentTime = editFoodTime;
                        // Create date using local time components to avoid timezone conversion
                        const newDateTime = new Date(y, m - 1, d, currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());
                        setEditFoodTime(newDateTime);
                        setShowEditDatePicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.datePickerOptionText,
                          isSelected && styles.datePickerOptionTextSelected,
                        ]}
                      >
                        {isToday ? 'Today' : 
                         isYesterday ? 'Yesterday' :
                         dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                    </TouchableOpacity>
                  );
                });
              })()}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, styles.inlineCancelButton]}
                onPress={() => {
                  setShowEditDatePicker(false);
                  // Reopen the appropriate modal after closing date picker
                  setTimeout(() => {
                    if (showAdjustServingModal) {
                      setShowAdjustServingModal(true);
                    }
                  }, 200);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Hydration Modal */}
      <Modal visible={showHydrationModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlay}>
            <ScrollView 
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.manualFoodModal}>
                <Text style={styles.modalTitle}>Add Hydration</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Drink Type</Text>
                  <View style={styles.drinkTypeButtons}>
                    {['water', 'tea', 'coffee', 'soda', 'sports drink', 'milk'].map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.drinkTypeButton,
                          hydrationType === type && styles.drinkTypeButtonSelected
                        ]}
                        onPress={() => setHydrationType(type)}
                      >
                        <Text style={[
                          styles.drinkTypeButtonText,
                          hydrationType === type && styles.drinkTypeButtonTextSelected
                        ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Volume (ml)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={hydrationVolume}
                    onChangeText={setHydrationVolume}
                    placeholder="250"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.cancelButton, styles.inlineCancelButton]}
                    onPress={() => setShowHydrationModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={saveHydrationEntry}
                  >
                    <Text style={styles.saveButtonText}>Add Hydration</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confirm analyzed food modal */}
      <Modal visible={showConfirmFoodModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.manualFoodModal}>
            <Text style={styles.modalTitle}>Confirm Food</Text>
            {pendingAnalysis && (
              <>
                <Text style={styles.confirmFoodHint}>
                  {pendingAnalysis.detectedSegments && pendingAnalysis.detectedSegments.length > 0
                    ? 'Multiple items detected. Select the main dish:'
                    : 'Select the correct food item:'}
                </Text>
                <Text style={styles.confirmFoodName}>{pendingAnalysis.name}</Text>
                <Text style={styles.confirmFoodText}>
                  Calories: {pendingAnalysis.calories || 'Calculating...'}
                </Text>
                {pendingAnalysis.protein !== undefined && (
                  <Text style={styles.confirmFoodText}>
                    Protein: {pendingAnalysis.protein}g | Carbs: {pendingAnalysis.carbs}g | Fat: {pendingAnalysis.fat}g
                  </Text>
                )}
              </>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, styles.inlineCancelButton]}
                onPress={handleRetakePhoto}
              >
                <Text style={styles.cancelButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleConfirmFoodYes}
                disabled={isAnalyzing}
              >
                <Text style={styles.saveButtonText}>
                  {isAnalyzing ? 'Loading...' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Portion size modal */}
      <Modal visible={showPortionModal} transparent animationType="slide" onRequestClose={() => {
        // Prevent closing via back button - only allow action buttons
      }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.portionModalWrapper}>
              <ScrollView 
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={true}
                nestedScrollEnabled={true}
              >
                <View style={styles.portionModalContent}>
                  {/* Show ingredients if available */}
                  {(() => {
                    const hasIngredients = pendingAnalysis?.ingredients && pendingAnalysis.ingredients.length > 0;
                    console.log(`🔍 Portion modal - hasIngredients: ${hasIngredients}, count: ${pendingAnalysis?.ingredients?.length || 0}`);
                    if (hasIngredients && pendingAnalysis?.ingredients) {
                      console.log(`📋 Ingredients in modal:`, pendingAnalysis.ingredients.map((ing: any) => ing.name || ing.label || 'Unknown').join(', '));
                    }
                    return hasIngredients;
                  })() && pendingAnalysis?.ingredients ? (
                    <View style={styles.inputGroup}>
                      {pendingAnalysis.ingredients
                        .map((ingredient: any, index: number) => {
                          // Use a unique key combining index and name/id to avoid duplicate key errors
                          const ingId = ingredient.id || ingredient.name || `ingredient-${index}`;
                          const uniqueKey = `${ingId}-${index}`; // Ensure unique key even if names are duplicate
                          const ingName = ingredient.name || ingredient.label || 'Unknown ingredient';
                          const ingredientUnit = ingredient.unit || ingredient.nutrition?.unit || 'g';
                          const baseWeight = ingredient.weight || ingredient.nutrition?.weight || 0;
                          const currentAmount = ingredientServings[uniqueKey] || ingredientServings[ingId] || String(baseWeight);
                          
                          // Get current serving info for display
                          const savedUnit = ingredientServings[`${uniqueKey}_unit`] || ingredientServings[`${ingId}_unit`] || ingredientUnit;
                          const currentServingAmount = ingredientServings[uniqueKey] || ingredientServings[ingId] || String(baseWeight);
                          const currentServingUnit = savedUnit;
                          
                          // Get serving unit from Passio data (if available)
                          // Check both the ingredient object and the original Passio result
                          const passioServingUnit = ingredient.servingUnit || (ingredient as any).passioItem?.servingUnit;
                          const passioServingQuantity = ingredient.servingQuantity || (ingredient as any).passioItem?.servingQuantity || 1;
                          
                          const isSelected = selectedIngredients.has(uniqueKey);
                          
                          return (
                            <TouchableOpacity 
                              key={uniqueKey} 
                              style={[
                                styles.ingredientRow,
                                !isSelected && styles.ingredientRowDeselected
                              ]}
                              onPress={(e) => {
                                e.stopPropagation();
                                console.log('🔍 Ingredient clicked:', ingName, uniqueKey);
                                // Close portion modal first, then open Adjust Serving Size modal
                                // This prevents modal conflicts
                                setShowPortionModal(false);
                                
                                // Small delay to ensure modal closes before opening new one
                                setTimeout(() => {
                                  // Use serving unit quantity if available, otherwise use gram amount
                                  const servingQuantity = passioServingQuantity || 1;
                                  const servingUnitForInput = passioServingUnit || currentServingUnit;
                                  
                                  // If we have a serving unit from Passio, use its quantity for the number input
                                  // Otherwise, use the gram amount
                                  const numberForInput = passioServingUnit ? String(servingQuantity) : currentServingAmount;
                                  
                                  const adjustmentData = {
                                    ...ingredient,
                                    uniqueKey,
                                    ingId,
                                    ingName,
                                    currentServingAmount,
                                    currentServingUnit,
                                    baseWeight,
                                  };
                                  console.log('📋 Setting adjustment data:', adjustmentData);
                                  setSelectedIngredientForAdjustment(adjustmentData);
                                  setAdjustServingNumber(numberForInput);
                                  setAdjustServingUnit(servingUnitForInput);
                                  console.log('✅ Opening Adjust Serving Size modal with:', numberForInput, servingUnitForInput);
                                  setShowAdjustServingModal(true);
                                }, 300);
                              }}
                              activeOpacity={0.7}
                            >
                              {/* Ingredient image */}
                              {ingredient.ingredientImageUrl ? (
                                <Image 
                                  source={{ uri: ingredient.ingredientImageUrl }}
                                  style={styles.ingredientImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.ingredientImagePlaceholder}>
                                  <Ionicons name="image-outline" size={20} color="#999" />
                                </View>
                              )}
                              <View style={styles.ingredientInfoContainer}>
                                <Text style={styles.ingredientName} numberOfLines={1}>{ingName}</Text>
                                {ingredient.nutrition && (
                                  <Text style={styles.ingredientNutrition}>
                                    P: {Math.round(ingredient.nutrition.protein)}g C: {Math.round(ingredient.nutrition.carbs)}g F: {Math.round(ingredient.nutrition.fat)}g
                                  </Text>
                                )}
                                <View style={styles.ingredientServingRow}>
                                  {/* Serving unit from Passio */}
                                  {passioServingUnit && passioServingQuantity ? (
                                    <Text style={styles.ingredientServingUnit}>
                                      {passioServingQuantity} {passioServingUnit}
                                    </Text>
                                  ) : null}
                                  {/* Grams */}
                                  <Text style={styles.ingredientServingGrams}>{currentServingAmount} g</Text>
                                  {/* Calories/KJ */}
                                  {ingredient.nutrition && (
                                    <Text style={styles.ingredientServingEnergy}>
                                      {state.preferences?.energy === 'kilojoules' 
                                        ? `${Math.round(ingredient.nutrition.calories * 4.184)} kJ`
                                        : `${ingredient.nutrition.calories} cal`}
                                    </Text>
                                  )}
                                </View>
                              </View>
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  // Toggle selection
                                  const newSelected = new Set(selectedIngredients);
                                  if (isSelected) {
                                    newSelected.delete(uniqueKey);
                                  } else {
                                    newSelected.add(uniqueKey);
                                  }
                                  setSelectedIngredients(newSelected);
                                }}
                                style={styles.ingredientSelectorButton}
                              >
                                {isSelected ? (
                                  <Ionicons name="checkmark-circle" size={24} color="#0090A3" />
                                ) : (
                                  <Ionicons name="checkmark-circle-outline" size={24} color="#999" />
                                )}
                              </TouchableOpacity>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  ) : (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>How many servings?</Text>
                      <TextInput
                        style={styles.portionTextInput}
                        keyboardType="decimal-pad"
                        value={portionServings}
                        onChangeText={setPortionServings}
                        placeholder="1"
                      />
                      <View style={styles.portionQuickButtons}>
                        {['0.5', '1', '1.5', '2'].map(val => (
                          <TouchableOpacity
                            key={val}
                            style={[
                              styles.portionQuickButton,
                              portionServings === val && styles.portionQuickButtonSelected,
                            ]}
                            onPress={() => setPortionServings(val)}
                          >
                            <Text
                              style={[
                                styles.portionQuickButtonText,
                                portionServings === val && styles.portionQuickButtonTextSelected,
                              ]}
                            >
                              {val}x
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {pendingAnalysis?.servingWeightGrams && portionServings && (
                        <Text style={styles.confirmFoodHint}>
                          Approx. total: {Math.round(Number(portionServings || '1') * pendingAnalysis.servingWeightGrams)} g
                        </Text>
                      )}
                    </View>
                  )}
                  
                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.cancelButton, styles.inlineCancelButton]}
                        onPress={handleRetakePhoto}
                      >
                        <Text style={styles.cancelButtonText}>Retake</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.saveButton} onPress={handlePortionConfirm}>
                        <Text style={styles.saveButtonText}>Log</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Adjust Serving Size Modal */}
      <Modal 
        visible={showAdjustServingModal} 
        transparent 
        animationType="slide" 
        onRequestClose={() => {
          setShowAdjustServingModal(false);
          setShowUnitDropdown(false);
        }}
        presentationStyle="overFullScreen"
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowUnitDropdown(false);
            }}
          >
            <View style={styles.adjustServingModalWrapper}>
              <View style={styles.adjustServingModalContent}>
                <Text style={styles.modalTitle}>Adjust Serving Size</Text>
                
                {selectedIngredientForAdjustment && (
                  <>
                    {/* Ingredient header */}
                    <View style={styles.adjustServingHeader}>
                      {selectedIngredientForAdjustment.ingredientImageUrl ? (
                        <Image 
                          source={{ uri: selectedIngredientForAdjustment.ingredientImageUrl }}
                          style={styles.adjustServingImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.adjustServingImagePlaceholder}>
                          <Ionicons name="image-outline" size={24} color="#999" />
                        </View>
                      )}
                    <View style={styles.adjustServingHeaderText}>
                      <Text style={styles.adjustServingIngredientName}>{selectedIngredientForAdjustment.ingName}</Text>
                      <Text style={styles.adjustServingCurrentInfo}>
                        {adjustServingNumber} {adjustServingUnit === 'gram' ? 'g' : adjustServingUnit}
                        {selectedIngredientForAdjustment.baseWeight ? ` (${selectedIngredientForAdjustment.baseWeight} g)` : ''}
                      </Text>
                    </View>
                    </View>

                  {/* Serving Size Section */}
                  <View style={styles.adjustServingSection}>
                    <Text style={styles.adjustServingLabel}>Serving Size</Text>
                    <View style={styles.adjustServingInputs}>
                      {/* Number input */}
                      <View style={styles.adjustServingNumberContainer}>
                        <TextInput
                          style={styles.adjustServingNumberInput}
                          value={adjustServingNumber}
                          onChangeText={setAdjustServingNumber}
                          keyboardType="decimal-pad"
                          selectTextOnFocus
                        />
                      </View>
                      
                      {/* Unit dropdown */}
                      <View style={styles.adjustServingUnitContainer}>
                        <TouchableOpacity
                          style={styles.adjustServingUnitButton}
                          onPress={() => setShowUnitDropdown(!showUnitDropdown)}
                        >
                          <Text style={styles.adjustServingUnitText}>{adjustServingUnit === 'gram' ? 'g' : adjustServingUnit}</Text>
                          <Ionicons name="chevron-down" size={16} color="#666" />
                        </TouchableOpacity>
                        {showUnitDropdown && (
                          <View style={styles.adjustServingUnitDropdown}>
                            {['package', 'cup', 'serving', 'gram', 'milliliter'].map((unit) => {
                              // Normalize "gram" to "g" for display and storage
                              const displayUnit = unit === 'gram' ? 'g' : unit;
                              const storageUnit = unit === 'gram' ? 'g' : unit;
                              // Check if current unit matches (handle both "g" and "gram")
                              const isSelected = adjustServingUnit === unit || adjustServingUnit === storageUnit || 
                                (unit === 'gram' && adjustServingUnit === 'g') ||
                                (adjustServingUnit === 'gram' && unit === 'gram');
                              
                              return (
                                <TouchableOpacity
                                  key={unit}
                                  style={[
                                    styles.adjustServingUnitOption,
                                    isSelected && styles.adjustServingUnitOptionSelected,
                                  ]}
                                  onPress={() => {
                                    setAdjustServingUnit(storageUnit);
                                    setShowUnitDropdown(false);
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.adjustServingUnitOptionText,
                                      isSelected && styles.adjustServingUnitOptionTextSelected,
                                    ]}
                                  >
                                    {displayUnit}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Scrollable element to change number */}
                    <View style={styles.adjustServingScrollContainer}>
                      {/* Center indicator line */}
                      <View style={styles.adjustServingCenterIndicator} />
                      <ScrollView
                        ref={servingSizeScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.adjustServingScrollContent}
                        scrollEnabled={true}
                        nestedScrollEnabled={true}
                        bounces={false}
                        onScroll={(event) => {
                          const scrollX = event.nativeEvent.contentOffset.x;
                          // Map scroll position to number (0.1-100 range, step 0.1)
                          const minValue = 0.1;
                          const maxValue = 100;
                          const step = 0.1;
                          const markerWidth = 40; // Width of each marker in pixels (wider for easier scrolling)
                          const totalMarkers = Math.floor((maxValue - minValue) / step) + 1;
                          
                          // Calculate which marker we're at
                          const markerIndex = Math.round(scrollX / markerWidth);
                          const normalizedIndex = Math.max(0, Math.min(totalMarkers - 1, markerIndex));
                          
                          // Calculate value based on marker index
                          const value = minValue + (normalizedIndex * step);
                          setAdjustServingNumber(value.toFixed(1));
                        }}
                        onMomentumScrollEnd={(event) => {
                          const scrollX = event.nativeEvent.contentOffset.x;
                          const markerWidth = 40;
                          const minValue = 0.1;
                          const step = 0.1;
                          const totalMarkers = Math.floor((100 - minValue) / step) + 1;
                          
                          // Snap to nearest marker
                          const markerIndex = Math.round(scrollX / markerWidth);
                          const normalizedIndex = Math.max(0, Math.min(totalMarkers - 1, markerIndex));
                          const snapPosition = normalizedIndex * markerWidth;
                          
                          servingSizeScrollRef.current?.scrollTo({
                            x: snapPosition,
                            animated: true,
                          });
                        }}
                        scrollEventThrottle={16}
                        decelerationRate="fast"
                        snapToInterval={40}
                        snapToAlignment="center"
                      >
                        {(() => {
                          const minValue = 0.1;
                          const maxValue = 100;
                          const step = 0.1;
                          const totalMarkers = Math.floor((maxValue - minValue) / step) + 1;
                          
                          return Array.from({ length: totalMarkers }, (_, i) => {
                            const value = minValue + (i * step);
                            const isMajorTick = i % 10 === 0; // Every 1.0
                            const isMinorTick = i % 5 === 0; // Every 0.5
                            
                            return (
                              <View key={i} style={styles.adjustServingScrollMarker}>
                                {isMajorTick ? (
                                  <View style={styles.adjustServingScrollTickMajor}>
                                    <Text style={styles.adjustServingScrollTickLabel}>{value.toFixed(1)}</Text>
                                  </View>
                                ) : isMinorTick ? (
                                  <View style={styles.adjustServingScrollTickMinor} />
                                ) : (
                                  <View style={styles.adjustServingScrollTickSmall} />
                                )}
                              </View>
                            );
                          });
                        })()}
                      </ScrollView>
                    </View>
                  </View>

                  {/* Date/Time Section - only show when editing an existing food item */}
                  {editingFood && (
                    <View style={styles.adjustServingSection}>
                      <Text style={styles.adjustServingLabel}>Date & Time</Text>
                      <View style={styles.adjustServingDateTimeRow}>
                        <TouchableOpacity
                          style={styles.adjustServingDateTimeButton}
                          onPress={() => setShowEditDatePicker(true)}
                        >
                          <Ionicons name="calendar-outline" size={18} color="#0090A3" />
                          <Text style={styles.adjustServingDateTimeText}>
                            {editFoodDate === getLocalDateString() ? 'Today' : 
                             editFoodDate === getLocalDateString(new Date(Date.now() - 86400000)) ? 'Yesterday' :
                             new Date(editFoodDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.adjustServingDateTimeButton}
                          onPress={() => setShowEditTimePicker(true)}
                        >
                          <Ionicons name="time-outline" size={18} color="#0090A3" />
                          <Text style={styles.adjustServingDateTimeText}>
                            {editFoodTime.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={styles.modalButtons}>
                    {/* Delete button - only show when editing an existing food item */}
                    {editingFood && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={async () => {
                          if (editingFood) {
                            // Use the date from the food item's timestamp (local timezone)
                            const foodDate = getLocalDateString(editingFood.timestamp);
                            await removeFoodItem(editingFood.id, foodDate);
                            setShowAdjustServingModal(false);
                            setShowUnitDropdown(false);
                            setSelectedIngredientForAdjustment(null);
                            setEditingFood(null);
                          }
                        }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.cancelButton, styles.inlineCancelButton]}
                      onPress={() => {
                        // Store whether we're editing an existing food before clearing state
                        const isEditingExistingFood = !!editingFood;
                        
                        setShowAdjustServingModal(false);
                        setShowUnitDropdown(false);
                        setSelectedIngredientForAdjustment(null);
                        setEditingFood(null);
                        
                        // Always reopen portion modal if we're in the logging flow (not editing existing food)
                        if (!isEditingExistingFood) {
                          setTimeout(() => {
                            setShowPortionModal(true);
                          }, 300);
                        }
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={async () => {
                        // Store whether we're editing an existing food before clearing state
                        const isEditingExistingFood = !!editingFood;
                        
                        if (selectedIngredientForAdjustment) {
                          // Check if we're editing an existing logged food item
                          if (isEditingExistingFood && editingFood) {
                            // Update the existing food item
                            const newServingAmount = parseFloat(adjustServingNumber) || editingFood.servingWeightGrams || 100;
                            const baseWeight = editingFood.servingWeightGrams || newServingAmount;
                            const multiplier = baseWeight > 0 ? newServingAmount / baseWeight : 1;
                            
                            // Build serving size string
                            let servingSizeStr = `${newServingAmount} ${adjustServingUnit}`;
                            if (adjustServingUnit !== 'g' && adjustServingUnit !== 'gram') {
                              servingSizeStr = `1 ${adjustServingUnit} (${newServingAmount} g)`;
                            }
                            
                            // Create timestamp from edited date and time (using local timezone)
                            const [year, month, day] = editFoodDate.split('-').map(Number);
                            const hour = editFoodTime.getHours();
                            const minute = editFoodTime.getMinutes();
                            const second = editFoodTime.getSeconds();
                            const millisecond = editFoodTime.getMilliseconds();
                            // Create date using local time components to avoid timezone conversion
                            const updatedTimestamp = new Date(year, month - 1, day, hour, minute, second, millisecond);
                            
                            // Calculate new nutrition values based on multiplier
                            const updatedFood: Omit<FoodItem, 'id' | 'timestamp'> = {
                              name: editingFood.name,
                              calories: Math.round(editingFood.calories * multiplier),
                              protein: Math.round(editingFood.protein * multiplier),
                              carbs: Math.round(editingFood.carbs * multiplier),
                              fat: Math.round(editingFood.fat * multiplier),
                              fiber: Math.round(editingFood.fiber * multiplier),
                              sugar: Math.round(editingFood.sugar * multiplier),
                              servingSize: servingSizeStr,
                              confidence: editingFood.confidence,
                              imageUri: editingFood.imageUri,
                              mealType: editingFood.mealType,
                              servingWeightGrams: Math.round(newServingAmount),
                            };
                            
                            // Remove old food item from its original date
                            const originalDate = getLocalDateString(editingFood.timestamp);
                            await removeFoodItem(editingFood.id, originalDate);
                            
                            // Add updated food item with new date/time (pass the custom timestamp)
                            const result = await addFoodItem(updatedFood, editFoodDate, updatedTimestamp);
                            if (!result.success) {
                              console.error('Error updating food item:', result.error);
                              Alert.alert('Error', 'Failed to update food item. Please try again.');
                            }
                            
                            setEditingFood(null);
                          } else {
                            // Adjusting ingredient before logging - update ingredientServings
                            const { uniqueKey, ingId } = selectedIngredientForAdjustment;
                            setIngredientServings({
                              ...ingredientServings,
                              [uniqueKey]: adjustServingNumber,
                              [`${uniqueKey}_unit`]: adjustServingUnit,
                            });
                          }
                        }
                        
                        setShowAdjustServingModal(false);
                        setShowUnitDropdown(false);
                        setSelectedIngredientForAdjustment(null);
                        
                        // Always reopen portion modal if we're in the logging flow (not editing existing food)
                        if (!isEditingExistingFood) {
                          setTimeout(() => {
                            setShowPortionModal(true);
                          }, 300);
                        }
                      }}
                    >
                      <Text style={styles.saveButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Analysis Loading Overlay */}
      {isAnalyzing && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <Animated.View
              style={{
                opacity: gradientAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 0.6, 1],
                }),
              }}
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                    {
                      scale: scaleAnim,
                    },
                  ],
                }}
              >
                <LinearGradient
                  colors={['#0090A3', '#6E006A', '#4F0232', '#3A86FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.loadingIconGradient}
                >
                  <MaterialCommunityIcons name="food-apple" size={48} color="#fff" />
                </LinearGradient>
              </Animated.View>
            </Animated.View>
            <Text style={styles.loadingText}>Analyzing your food...</Text>
            <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
            
            {/* Progress Bar */}
            <View style={styles.loadingProgressBarContainer}>
              <View style={styles.loadingProgressBarBackground}>
                <Animated.View
                  style={[
                    styles.loadingProgressBarFill,
                    {
                      width: smoothProgressAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: [0, 240],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={styles.loadingProgressBarText}>
                {Math.round(analysisProgress)}%
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Success Animation Overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.successOverlay,
          {
            opacity: successScaleAnim,
            transform: [
              {
                scale: successScaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1.2],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#0090A3', '#6E006A', '#4F0232']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.successIconGradient}
        >
          <MaterialCommunityIcons name="check-circle" size={64} color="#fff" />
        </LinearGradient>
        <Text style={styles.successText}>Food Logged!</Text>
      </Animated.View>

      {/* Floating quick action buttons (Take / Choose / Enter) */}
      <View pointerEvents="box-none" style={styles.floatingActionsWrapper}>
        <View style={styles.floatingActions}>
          <TouchableOpacity onPress={showMealTypeSelector} style={styles.floatingActionButton}>
            <LinearGradient colors={['#6E006A', '#4F0232']} style={styles.floatingActionGradient}>
              <Ionicons name="camera" size={22} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} style={styles.floatingActionButton}>
            <LinearGradient colors={['#6E006A', '#4F0232']} style={styles.floatingActionGradient}>
              <Ionicons name="image" size={22} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={openManualFoodModal} style={styles.floatingActionButton}>
            <LinearGradient colors={['#6E006A', '#4F0232']} style={styles.floatingActionGradient}>
              <Ionicons name="add" size={22} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingBottom: 140,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0090A3',
    marginBottom: 20,
    textAlign: 'center',
  },
  // Legacy top quick actions (kept for reference but no longer used)
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#E6E1D8',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
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
  actionButtonText: {
    color: '#0090A3',
    fontWeight: '600',
    marginTop: 8,
  },
  actionCard: {
    flex: 1,
    height: 100,
    marginHorizontal: 2,
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
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 8,
  },
  actionButtonTeal: {
    backgroundColor: '#0090A3',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
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
  actionButtonTextWhite: {
    color: 'white',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
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
  macroProgressItem: {
    marginBottom: 12,
  },
  macroProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  macroProgressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2A2A',
  },
  macroProgressRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroProgressValue: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  progressPercentageInline: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
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
  progressPercentage: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  mealSection: {
    marginBottom: 20,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0090A3',
    marginBottom: 12,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  foodItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 12,
  },
  foodImagePlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodDetails: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  foodServing: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  foodMacros: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  foodEnergyContainer: {
    alignSelf: 'flex-end',
    marginLeft: 8,
  },
  foodCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0090A3',
  },
  macroText: {
    fontSize: 12,
    color: '#666',
    marginRight: 12,
  },
  foodMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealType: {
    fontSize: 12,
    color: '#0090A3',
    fontWeight: '600',
  },
  confidence: {
    fontSize: 12,
    color: '#666',
  },
  foodActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  removeButton: {
    padding: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0090A3',
    marginBottom: 12,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  logItemContent: {
    flex: 1,
  },
  logItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2A2A',
    flex: 1,
  },
  logItemTime: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  logItemDetails: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  logItemDetail: {
    fontSize: 14,
    color: '#666',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: Dimensions.get('window').width,
  },
  manualFoodModal: {
    backgroundColor: '#E6E1D8',
    borderRadius: 16,
    padding: 24,
    width: Dimensions.get('window').width - 40,
    maxWidth: 400,
    alignSelf: 'center',
  },
  manualFoodForm: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  macroInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 20,
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE0E0',
    marginRight: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 6,
  },
  saveButton: {
    backgroundColor: '#0090A3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#E6E1D8',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0090A3',
    textAlign: 'center',
    marginBottom: 20,
  },
  mealTypeButton: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  mealTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2A2A',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  inlineCancelButton: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8,
    marginTop: 0,
    minWidth: 80,
  },
  fullWidthCancelButton: {
    flex: 0,
    marginRight: 0,
    marginTop: 16,
    alignSelf: 'stretch',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: 320,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A2A2A',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  loadingIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadingProgressBarContainer: {
    width: '100%',
    marginTop: 24,
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  loadingProgressBarBackground: {
    width: 240,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  loadingProgressBarFill: {
    height: '100%',
    backgroundColor: '#0090A3',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 0,
  },
  loadingProgressBarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0090A3',
    marginTop: 8,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  successIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  hydrationContainer: {
    alignItems: 'center',
  },
  hydrationProgress: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  progressRing: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 16,
    position: 'relative',
  },
  circularProgressContainer: {
    width: 80,
    height: 80,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recognitionOption: {
    padding: 12,
    marginVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  recognitionOptionSelected: {
    backgroundColor: '#E6F7F9',
    borderColor: '#0090A3',
  },
  recognitionOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  recognitionOptionTextSelected: {
    color: '#0090A3',
    fontWeight: '600',
  },
  recognitionOptionConfidence: {
    fontSize: 12,
    color: '#666',
  },
  confirmFoodName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
  },
  confirmFoodText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 4,
  },
  confirmFoodHint: {
    fontSize: 14,
    color: '#777',
    marginBottom: 12,
  },
  portionQuickButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  portionQuickButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0090A3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portionQuickButtonSelected: {
    backgroundColor: '#0090A3',
  },
  portionQuickButtonText: {
    color: '#0090A3',
    fontWeight: '600',
  },
  portionQuickButtonTextSelected: {
    color: '#fff',
  },
  portionModalWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  portionModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: Dimensions.get('window').width - 40,
    alignSelf: 'center',
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    minHeight: 60,
  },
  ingredientImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#F5F5F5',
  },
  ingredientImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ingredientInfoContainer: {
    flex: 1,
    marginRight: 12,
    paddingRight: 8,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2A2A',
    marginBottom: 4,
    flexShrink: 0,
  },
  ingredientServingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  ingredientServingInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: '#fff',
    textAlign: 'center',
    width: 60,
  },
  ingredientServingLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  deleteIngredientButton: {
    marginLeft: 8,
    padding: 4,
  },
  ingredientSelectorButton: {
    marginLeft: 8,
    padding: 4,
  },
  ingredientRowDeselected: {
    opacity: 0.5,
  },
  ingredientNutrition: {
    fontSize: 12,
    color: '#666',
    marginTop: 0,
    flexWrap: 'wrap',
  },
  ingredientServingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  ingredientServingUnit: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  ingredientServingGrams: {
    fontSize: 14,
    color: '#0090A3',
    fontWeight: '500',
  },
  ingredientServingEnergy: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  adjustServingModalWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  adjustServingModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: Dimensions.get('window').width,
    maxHeight: Dimensions.get('window').height * 0.8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  adjustServingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  adjustServingImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#F5F5F5',
  },
  adjustServingImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustServingHeaderText: {
    flex: 1,
  },
  adjustServingIngredientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  adjustServingCurrentInfo: {
    fontSize: 14,
    color: '#666',
  },
  adjustServingSection: {
    marginBottom: 24,
  },
  adjustServingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2A2A',
    marginBottom: 12,
  },
  adjustServingDateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  adjustServingDateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F9F9F9',
    gap: 8,
  },
  adjustServingDateTimeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2A2A2A',
  },
  datePickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: Dimensions.get('window').width - 40,
    maxHeight: Dimensions.get('window').height * 0.7,
    alignSelf: 'center',
  },
  datePickerScroll: {
    maxHeight: Dimensions.get('window').height * 0.5,
  },
  datePickerOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#F9F9F9',
  },
  datePickerOptionSelected: {
    backgroundColor: '#E6F7F9',
    borderWidth: 1,
    borderColor: '#0090A3',
  },
  datePickerOptionText: {
    fontSize: 16,
    color: '#2A2A2A',
    fontWeight: '500',
  },
  datePickerOptionTextSelected: {
    color: '#0090A3',
    fontWeight: '600',
  },
  adjustServingInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  adjustServingNumberContainer: {
    flex: 1,
  },
  adjustServingNumberInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  adjustServingUnitContainer: {
    flex: 1,
    position: 'relative',
  },
  adjustServingUnitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  adjustServingUnitText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A2A2A',
  },
  adjustServingUnitDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 4,
    zIndex: 1000,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  adjustServingUnitOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  adjustServingUnitOptionSelected: {
    backgroundColor: '#F5F5F5',
  },
  adjustServingUnitOptionText: {
    fontSize: 16,
    color: '#2A2A2A',
  },
  adjustServingUnitOptionTextSelected: {
    color: '#0090A3',
    fontWeight: '600',
  },
  adjustServingScrollContainer: {
    height: 80,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
    position: 'relative',
    overflow: 'visible',
  },
  adjustServingCenterIndicator: {
    position: 'absolute',
    left: '50%',
    top: 12,
    bottom: 12,
    width: 2,
    backgroundColor: '#0090A3',
    zIndex: 10,
    marginLeft: -1,
  },
  adjustServingScrollContent: {
    paddingHorizontal: Dimensions.get('window').width / 2 - 20,
    alignItems: 'center',
    minWidth: 4000, // Enough for 0.1 to 100 with 40px markers
  },
  adjustServingScrollMarker: {
    width: 40,
    height: 56,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 4,
  },
  adjustServingScrollTickMajor: {
    width: 2,
    height: 30,
    backgroundColor: '#0090A3',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  adjustServingScrollTickMinor: {
    width: 1.5,
    height: 20,
    backgroundColor: '#666',
  },
  adjustServingScrollTickSmall: {
    width: 1,
    height: 12,
    backgroundColor: '#CCC',
  },
  adjustServingScrollTickLabel: {
    fontSize: 10,
    color: '#0090A3',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  portionTextInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    backgroundColor: '#fff',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  mealTypeButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  mealTypePill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0090A3',
    alignItems: 'center',
  },
  mealTypePillSelected: {
    backgroundColor: '#0090A3',
  },
  mealTypePillText: {
    color: '#0090A3',
    fontWeight: '600',
    fontSize: 14,
  },
  mealTypePillTextSelected: {
    color: '#fff',
  },
  floatingActionsWrapper: {
    position: 'absolute',
    right: 16,
    bottom: 90, // sits above bottom tab bar
    zIndex: 20,
  },
  floatingActions: {
    alignItems: 'center',
  },
  floatingActionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginVertical: 6,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  floatingActionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingContent: {
    position: 'absolute',
    top: -16,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  progressRingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
    lineHeight: 22,
  },
  progressRingLabel: {
    fontSize: 9,
    color: '#666',
    marginTop: 1,
    lineHeight: 10,
  },
  hydrationStats: {
    marginTop: 8,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  hydrationVolume: {
    fontSize: 14,
    color: '#0090A3',
    textAlign: 'center',
    width: '100%',
    minWidth: 200,
  },
  hydrationCurrentBold: {
    fontWeight: 'bold',
  },
  quickAddButtons: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  quickAddButton: {
    backgroundColor: '#0090A3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  quickAddText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  addHydrationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B9A68D',
  },
  addHydrationText: {
    color: '#0090A3',
    fontWeight: '600',
    marginLeft: 8,
  },
  addHydrationButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flex: 1,
  },
  addHydrationButtonTeal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0090A3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    justifyContent: 'center',
  },
  addHydrationButtonCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  addHydrationTextWhite: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  drinkTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  drinkTypeButton: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  drinkTypeButtonSelected: {
    backgroundColor: '#0090A3',
    borderColor: '#B9A68D',
  },
  drinkTypeButtonText: {
    fontSize: 14,
    color: '#2A2A2A',
  },
  drinkTypeButtonTextSelected: {
    color: 'white',
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timePickerRow: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  timePickerRowDate: {
    flex: 2,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  timePickerRowTime: {
    flex: 0.8,
    alignItems: 'center',
    marginHorizontal: 1,
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  timePickerScroll: {
    height: 120,
    width: 60,
  },
  timePickerScrollDate: {
    height: 120,
    width: 120,
  },
  timePickerItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  timePickerItemSelected: {
    backgroundColor: '#0090A3',
    borderRadius: 12,
    marginHorizontal: 0,
  },
  timePickerText: {
    fontSize: 16,
    color: '#2A2A2A',
  },
  timePickerTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  iOSPickerContainer: {
    height: 120,
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  iOSPickerHighlight: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(0, 144, 163, 0.1)',
    borderRadius: 8,
    zIndex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 144, 163, 0.2)',
    pointerEvents: 'none',
  },
  iOSPickerColumn: {
    flex: 1,
    position: 'relative',
  },
  iOSPickerScroll: {
    height: 120,
  },
  iOSPickerItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  iOSPickerText: {
    fontSize: 16,
    color: '#2A2A2A',
    fontWeight: '400',
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 8,
  },
  timePickerButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  timePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  timePickerContainerEdit: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
    height: 200,
  },
  timePickerColumnEdit: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  timePickerLabelEdit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  timePickerScrollEdit: {
    flex: 1,
    width: '100%',
  },
  timePickerOptionEdit: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  timePickerOptionSelectedEdit: {
    backgroundColor: '#0090A3',
  },
  timePickerOptionTextEdit: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  timePickerOptionTextSelectedEdit: {
    color: '#fff',
    fontWeight: '600',
  },
  dateSelectorContainer: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  dateSelectorScrollContent: {
    paddingHorizontal: 8,
  },
  dateSelectorItem: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#E6E1D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateSelectorItemSelected: {
    backgroundColor: '#0090A3',
    borderColor: '#0090A3',
  },
  dateSelectorDayName: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dateSelectorDayNameSelected: {
    color: '#fff',
  },
  dateSelectorDayNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2A2A2A',
    marginBottom: 2,
  },
  dateSelectorDayNumberSelected: {
    color: '#fff',
  },
  dateSelectorMonth: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
  },
  dateSelectorMonthSelected: {
    color: '#fff',
  },
  dateSelectorDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  dateSelectorDotSelected: {
    backgroundColor: '#fff',
  },
  quickLogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  circularProgressCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  circularProgressWrapper: {
    position: 'relative',
    width: 70,
    height: 70,
    marginBottom: 8,
  },
  circularProgressInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circularProgressBg: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 6,
    borderColor: '#E0E0E0',
  },
  circularProgressFillContainer: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  circularProgressFill: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 6,
    borderColor: 'transparent',
  },
  circularProgressContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  circularProgressValue: {
    fontSize: 9,
    fontWeight: '600',
    color: '#2A2A2A',
    marginTop: 1,
  },
  circularProgressPlusIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  circularProgressLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
});
