import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../contexts/AppContext';
import { FoodItem } from '../contexts/AppContext';

interface NutritionScreenProps {
  navigation: any;
}

export default function NutritionScreen({ navigation }: NutritionScreenProps) {
  const { state, getCurrentDayLog, getTodaysTotals, addFoodItem, removeFoodItem, addHydrationEntry, addBowelEntry, removeBowelEntry, addSymptomEntry, removeSymptomEntry, addExerciseEntry, removeExerciseEntry } = useApp();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [mealTime, setMealTime] = useState<Date>(new Date());
  const [showHydrationModal, setShowHydrationModal] = useState(false);
  const [hydrationType, setHydrationType] = useState('water');
  const [hydrationVolume, setHydrationVolume] = useState('');
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseType, setExerciseType] = useState<'Walk'|'Run'|'Swim'|'Gym'|'Sport'|'Other'>('Walk');
  const [exerciseStartTime, setExerciseStartTime] = useState(new Date());
  const [exerciseDuration, setExerciseDuration] = useState(30);
  const [exerciseRpe, setExerciseRpe] = useState(6);
  const [showBristolModal, setShowBristolModal] = useState(false);
  const [bowelTime, setBowelTime] = useState(new Date());
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [symptomText, setSymptomText] = useState('');
  const [symptomTime, setSymptomTime] = useState(new Date());
  const [showFoodDiaryModal, setShowFoodDiaryModal] = useState(false);

  const currentLog = getCurrentDayLog();
  const todaysTotals = getTodaysTotals();
  const goals = state.nutritionGoals;

  useEffect(() => {
    (async () => {
      try {
        console.log('Requesting camera permissions...');
        // Try Camera module first, fallback to ImagePicker
        let status;
        try {
          const result = await Camera.requestCameraPermissionsAsync();
          status = result.status;
        } catch (cameraError) {
          console.log('Camera module failed, trying ImagePicker...');
          const result = await ImagePicker.requestCameraPermissionsAsync();
          status = result.status;
        }
        console.log('Camera permission status:', status);
        setCameraPermission(status === 'granted');
      } catch (error) {
        console.error('Error requesting camera permissions:', error);
        setCameraPermission(false);
      }
    })();
  }, []);

  const takePicture = async () => {
    // If permission is still loading, wait a bit and try again
    if (cameraPermission === null) {
      console.log('Camera permission still loading, waiting...');
      setTimeout(() => {
        if (cameraPermission === null) {
          Alert.alert('Error', 'Camera permission check timed out. Please try again.');
          setCameraPermission(false);
        }
      }, 3000);
      return;
    }

    if (cameraPermission === false) {
      Alert.alert(
        'Permission Required', 
        'Camera permission is required to take food photos.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Grant Permission', 
            onPress: async () => {
              try {
                const { status } = await Camera.requestCameraPermissionsAsync();
                setCameraPermission(status === 'granted');
                if (status === 'granted') {
                  takePicture(); // Retry after permission granted
                }
              } catch (error) {
                console.error('Error requesting camera permission:', error);
                Alert.alert('Error', 'Failed to request camera permission.');
              }
            }
          }
        ]
      );
      return;
    }

    try {
      console.log('Launching camera...');
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: false,
      });

      console.log('Camera result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('Processing image:', result.assets[0].uri);
        await analyzeAndLogFood(result.assets[0].uri);
      } else {
        console.log('Camera was canceled or no assets returned');
      }
    } catch (error) {
      console.error('Camera error details:', error);
      Alert.alert('Error', `Failed to take picture: ${error.message || 'Unknown error'}`);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await analyzeAndLogFood(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const analyzeAndLogFood = async (imageUri: string) => {
    setIsAnalyzing(true);
    try {
      // Simulate AI analysis with realistic food data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock analysis results - in a real app, this would call an AI service
      const mockAnalyses = [
        {
          name: "Grilled Chicken Salad",
          calories: 320,
          protein: 28,
          carbs: 15,
          fat: 18,
          fiber: 4,
          sugar: 8,
          servingSize: "1 bowl",
          confidence: 0.87,
        },
        {
          name: "Pasta with Marinara",
          calories: 450,
          protein: 12,
          carbs: 65,
          fat: 12,
          fiber: 6,
          sugar: 12,
          servingSize: "1 plate",
          confidence: 0.92,
        },
        {
          name: "Greek Yogurt with Berries",
          calories: 180,
          protein: 15,
          carbs: 25,
          fat: 4,
          fiber: 3,
          sugar: 20,
          servingSize: "1 cup",
          confidence: 0.95,
        },
        {
          name: "Avocado Toast",
          calories: 280,
          protein: 8,
          carbs: 30,
          fat: 16,
          fiber: 8,
          sugar: 4,
          servingSize: "2 slices",
          confidence: 0.89,
        },
      ];

      const randomAnalysis = mockAnalyses[Math.floor(Math.random() * mockAnalyses.length)];
      
      const newFood: Omit<FoodItem, 'id' | 'timestamp'> = {
        name: randomAnalysis.name,
        calories: randomAnalysis.calories,
        protein: randomAnalysis.protein,
        carbs: randomAnalysis.carbs,
        fat: randomAnalysis.fat,
        fiber: randomAnalysis.fiber,
        sugar: randomAnalysis.sugar,
        servingSize: randomAnalysis.servingSize,
        confidence: randomAnalysis.confidence,
        imageUri,
        mealType: selectedMealType,
      };

      addFoodItem(newFood);
      
      Alert.alert(
        'Food Logged!',
        `Analyzed: ${randomAnalysis.name}\nCalories: ${randomAnalysis.calories}\nConfidence: ${Math.round(randomAnalysis.confidence * 100)}%`,
        [{ text: 'OK', onPress: () => setShowMealModal(false) }]
      );
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Error', 'Failed to analyze food. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const showMealTypeSelector = () => {
    setShowMealModal(true);
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
    });
    setShowManualFoodModal(true);
  };

  const editFood = (food: FoodItem) => {
    setEditingFood(food);
    setManualFood({
      name: food.name,
      calories: food.calories.toString(),
      protein: food.protein.toString(),
      carbs: food.carbs.toString(),
      fat: food.fat.toString(),
      fiber: food.fiber.toString(),
      sugar: food.sugar.toString(),
    });
    setShowManualFoodModal(true);
  };

  const saveManualFood = () => {
    if (!manualFood.name || !manualFood.calories) {
      Alert.alert('Missing Information', 'Please enter at least food name and calories.');
      return;
    }

    const foodItem: FoodItem = {
      id: editingFood?.id || Date.now().toString(),
      name: manualFood.name,
      calories: parseFloat(manualFood.calories) || 0,
      protein: parseFloat(manualFood.protein) || 0,
      carbs: parseFloat(manualFood.carbs) || 0,
      fat: parseFloat(manualFood.fat) || 0,
      fiber: parseFloat(manualFood.fiber) || 0,
      sugar: parseFloat(manualFood.sugar) || 0,
      mealType: editingFood?.mealType || selectedMealType,
      timestamp: editingFood?.timestamp || new Date(),
    };

    if (editingFood) {
      // Update existing food
      removeFoodItem(editingFood.id);
      addFoodItem(foodItem);
      Alert.alert('Success', 'Food updated successfully!');
    } else {
      // Add new food
      addFoodItem(foodItem);
      Alert.alert('Success', 'Food added successfully!');
    }

    setShowManualFoodModal(false);
    setEditingFood(null);
  };

  const addHydration = async (volume: number, type: string = 'water') => {
    try {
      // Calculate macros based on drink type and volume
      const macros = calculateDrinkMacros(type, volume);
      
      const hydrationEntry = {
        type: type as 'water' | 'tea' | 'coffee' | 'soda' | 'sports_drink' | 'milk',
        volume: volume,
        ...macros,
      };
      
      await addHydrationEntry(hydrationEntry);
      Alert.alert('Success', `Added ${volume}ml of ${type}!`);
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

  const saveExercise = () => {
    if (exerciseDuration <= 0 || exerciseRpe < 1 || exerciseRpe > 10) {
      Alert.alert('Invalid', 'Please select valid duration and perceived effort (1-10).');
      return;
    }
    // Add to context
    // @ts-ignore addExerciseEntry exists in context
    addExerciseEntry({ type: exerciseType, durationMins: exerciseDuration, rpe: exerciseRpe, time: exerciseStartTime });
    setShowExerciseModal(false);
    setExerciseDuration(30);
    setExerciseRpe(6);
    setExerciseStartTime(new Date());
    Alert.alert('Success', 'Exercise logged.');
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

  const renderFoodItem = (item: FoodItem) => (
    <View key={item.id} style={styles.foodItem}>
      <View style={styles.foodItemContent}>
        {item.imageUri && (
          <Image source={{ uri: item.imageUri }} style={styles.foodImage} />
        )}
        <View style={styles.foodDetails}>
          <Text style={styles.foodName}>{item.name}</Text>
          <Text style={styles.foodServing}>{item.servingSize}</Text>
          <Text style={styles.foodCalories}>{item.calories} cal</Text>
          <View style={styles.foodMacros}>
            <Text style={styles.macroText}>P: {item.protein}g</Text>
            <Text style={styles.macroText}>C: {item.carbs}g</Text>
            <Text style={styles.macroText}>F: {item.fat}g</Text>
          </View>
          <View style={styles.foodMeta}>
            <Text style={styles.mealType}>{item.mealType}</Text>
            <Text style={styles.confidence}>
              {Math.round(item.confidence * 100)}% confidence
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.foodActions}>
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => editFood(item)}
        >
          <Ionicons name="pencil" size={20} color="#B9A68D" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.removeButton} 
          onPress={() => removeFoodItem(item.id)}
        >
          <Ionicons name="close-circle" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ backgroundColor: '#E6E1D8', borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
          <Image source={require('../assets/Chick1.png')} style={{ width: 32, height: 32, borderRadius: 16, resizeMode: 'cover' }} />
          <Text style={{ marginLeft: 8, color: '#333', flex: 1 }}>Tracking is important to reach your goals.</Text>
        </View>
        
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} onPress={showMealTypeSelector}>
            <LinearGradient colors={['#0090A3', '#28657A']} style={styles.actionGradient}>
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.actionText}>Take</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={pickImage}>
            <LinearGradient colors={['#0090A3', '#28657A']} style={styles.actionGradient}>
              <Ionicons name="image" size={24} color="white" />
              <Text style={styles.actionText}>Choose</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={openManualFoodModal}>
            <LinearGradient colors={['#0090A3', '#28657A']} style={styles.actionGradient}>
              <Ionicons name="add-circle" size={24} color="white" />
              <Text style={styles.actionText}>Enter</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Daily Progress */}
        {goals && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Progress</Text>
            {renderMacroProgress('Calories', todaysTotals.calories, goals.calories, '')}
            {renderMacroProgress('Protein', todaysTotals.protein, goals.protein, 'g')}
            {renderMacroProgress('Carbs', todaysTotals.carbs, goals.carbs, 'g')}
            {renderMacroProgress('Fat', todaysTotals.fat, goals.fat, 'g')}
            {renderMacroProgress('Fiber', todaysTotals.fiber, goals.fiber, 'g')}
          </View>
        )}

        {/* Food Diary Access */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Food Diary</Text>
          <TouchableOpacity style={[styles.addHydrationButtonCard, { width: '100%', marginBottom: 12 }]} onPress={() => setShowFoodDiaryModal(true)}>
            <LinearGradient colors={['#0090A3', '#28657A']} style={styles.addHydrationButtonGradient}>
              <MaterialCommunityIcons name="clipboard-text" size={20} color="white" />
              <Text style={styles.addHydrationTextWhite}>Open Today's Food Diary</Text>
            </LinearGradient>
          </TouchableOpacity>
          {!currentLog || currentLog.foods.length === 0 ? (
            <View style={[styles.emptyState, { paddingTop: 20 }]}> 
              <MaterialCommunityIcons name="food-apple" size={48} color="#B9A68D" />
              <Text style={styles.emptyText}>No foods logged yet</Text>
              <Text style={styles.emptySubtext}>Use Take Photo, Choose Photo, or Manual Entry</Text>
            </View>
          ) : null}
        </View>

        {/* Hydration Tracker */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hydration</Text>
          <TouchableOpacity style={[styles.addHydrationButtonCard, { width: '100%', marginBottom: 12 }]} onPress={() => setShowHydrationModal(true)}>
            <LinearGradient colors={['#0090A3', '#28657A']} style={styles.addHydrationButtonGradient}>
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.addHydrationTextWhite}>Add Hydration</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.hydrationContainer}>
            <View style={styles.hydrationProgress}>
              <View style={styles.progressRing}>
                <View style={styles.circularProgressContainer}>
                  <View style={styles.circularProgressBackground} />
                  {(() => {
                    const progress = Math.min((todaysTotals.hydration || 0) / (state.userProfile?.weight ? state.userProfile.weight * 30 : 2000), 1);
                    const rotation = progress * 360 - 90;
                    
                    if (progress <= 0.25) {
                      // 0-90 degrees: only top border
                      return (
                        <View style={[
                          styles.circularProgressFill,
                          {
                            transform: [{ rotate: `${rotation}deg` }],
                            borderTopColor: '#0090A3',
                          }
                        ]} />
                      );
                    } else if (progress <= 0.5) {
                      // 90-180 degrees: top and right borders
                      return (
                        <View style={[
                          styles.circularProgressFill,
                          {
                            transform: [{ rotate: `${rotation}deg` }],
                            borderTopColor: '#0090A3',
                            borderRightColor: '#0090A3',
                          }
                        ]} />
                      );
                    } else if (progress <= 0.75) {
                      // 180-270 degrees: top, right, and bottom borders
                      return (
                        <View style={[
                          styles.circularProgressFill,
                          {
                            transform: [{ rotate: `${rotation}deg` }],
                            borderTopColor: '#0090A3',
                            borderRightColor: '#0090A3',
                            borderBottomColor: '#0090A3',
                          }
                        ]} />
                      );
                    } else {
                      // 270-360 degrees: all borders
                      return (
                        <View style={[
                          styles.circularProgressFill,
                          {
                            transform: [{ rotate: `${rotation}deg` }],
                            borderTopColor: '#0090A3',
                            borderRightColor: '#0090A3',
                            borderBottomColor: '#0090A3',
                            borderLeftColor: '#0090A3',
                          }
                        ]} />
                      );
                    }
                  })()}
                </View>
                <View style={styles.progressRingContent}>
                  <Text style={styles.progressRingText}>
                    {Math.round((todaysTotals.hydration || 0) / (state.userProfile?.weight ? state.userProfile.weight * 30 : 2000) * 100)}%
                  </Text>
                  <Text style={styles.progressRingLabel}>Hydrated</Text>
                </View>
                <View style={styles.hydrationStats}>
                  <Text style={styles.hydrationVolume} numberOfLines={1}>
                    <Text style={styles.hydrationCurrentBold}>{Math.round(todaysTotals.hydration || 0)} ml</Text>
                    <Text> / {state.userProfile?.weight ? Math.round(state.userProfile.weight * 30) : 2000} ml</Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Bowel & Symptoms */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bowel & Symptoms</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <TouchableOpacity style={styles.actionCard} onPress={() => setShowBristolModal(true)}>
              <LinearGradient colors={['#0090A3', '#28657A']} style={styles.actionGradient}>
                <MaterialCommunityIcons name="toilet" size={24} color="white" />
                <Text style={styles.actionText}>Log Bowel</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => setShowSymptomModal(true)}>
              <LinearGradient colors={['#0090A3', '#28657A']} style={styles.actionGradient}>
                <MaterialCommunityIcons name="account-search" size={24} color="white" />
                <Text style={styles.actionText}>Log Symptom</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Today entries list */}
          {currentLog && ((currentLog.bowel && currentLog.bowel.length > 0) || (currentLog.symptoms && currentLog.symptoms.length > 0)) ? (
            <View>
              {(currentLog.bowel || []).map(entry => (
                <View key={entry.id} style={styles.foodItem}>
                  <View style={styles.foodItemContent}>
                    <MaterialCommunityIcons name="toilet" size={22} color="#B9A68D" />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.foodName}>Bristol type {entry.bristol}</Text>
                      <Text style={styles.foodServing}>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.removeButton} onPress={() => removeBowelEntry(entry.id)}>
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
              {(currentLog.symptoms || []).map(entry => (
                <View key={entry.id} style={styles.foodItem}>
                  <View style={styles.foodItemContent}>
                    <MaterialCommunityIcons name="alert" size={22} color="#B9A68D" />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.foodName}>{entry.text}</Text>
                      <Text style={styles.foodServing}>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.removeButton} onPress={() => removeSymptomEntry(entry.id)}>
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#B9A68D" />
              <Text style={styles.emptyText}>No entries yet</Text>
              <Text style={styles.emptySubtext}>Log a bowel movement or symptom</Text>
            </View>
          )}
        </View>

        {/* Exercise */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Exercise</Text>
          <TouchableOpacity style={[styles.addHydrationButtonCard, { width: '100%', marginBottom: 12 }]} onPress={() => setShowExerciseModal(true as any)}>
            <LinearGradient colors={['#0090A3', '#28657A']} style={styles.addHydrationButtonGradient}>
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.addHydrationTextWhite}>Add Exercise</Text>
            </LinearGradient>
          </TouchableOpacity>

          {currentLog && currentLog.exercises && currentLog.exercises.length > 0 ? (
            <View>
              {currentLog.exercises.map(entry => {
                const getExerciseIcon = (type: string) => {
                  switch (type.toLowerCase()) {
                    case 'walk': return 'walk';
                    case 'run': return 'run';
                    case 'swim': return 'swim';
                    case 'gym': return 'weight-lifter';
                    case 'sport': return 'soccer';
                    case 'other': return 'dumbbell';
                    default: return 'run';
                  }
                };
                
                return (
                  <View key={entry.id} style={styles.foodItem}>
                    <View style={styles.foodItemContent}>
                      <MaterialCommunityIcons name={getExerciseIcon(entry.type)} size={22} color="#B9A68D" />
                      <View style={{ marginLeft: 10 }}>
                        <Text style={styles.foodName}>{entry.type} • {entry.durationMins} mins • Perceived Effort {entry.rpe}</Text>
                        <Text style={styles.foodServing}>{new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.removeButton} onPress={() => removeExerciseEntry(entry.id)}>
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="run-fast" size={48} color="#B9A68D" />
              <Text style={styles.emptyText}>No exercise logged</Text>
              <Text style={styles.emptySubtext}>Tap Add Exercise to log activity</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bristol Picker Modal */}
      <Modal visible={showBristolModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.manualFoodModal}>
            <Text style={styles.modalTitle}>Log Bowel Movement</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date & Time occurred</Text>
              <View style={styles.iOSPickerContainer}>
                <View style={styles.iOSPickerHighlight} />
                <View style={styles.iOSPickerColumn}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: 120 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const date = new Date();
                      date.setDate(date.getDate() + (selectedIndex - 3));
                      const newDate = new Date(bowelTime);
                      newDate.setDate(date.getDate());
                      newDate.setMonth(date.getMonth());
                      newDate.setFullYear(date.getFullYear());
                      setBowelTime(newDate);
                      Vibration.vibrate(10);
                    }}
                  >
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() + (i - 3));
                      const isToday = i === 3;
                      return (
                        <View key={i} style={styles.iOSPickerItem}>
                          <Text style={styles.iOSPickerText}>
                            {isToday ? 'Today' : `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })}`}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
                <View style={styles.iOSPickerColumn}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: ((new Date().getHours() % 12 || 12) - 1) * 40 }}
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
                      setBowelTime(newTime);
                      Vibration.vibrate(10);
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
                <View style={styles.iOSPickerColumn}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: new Date().getMinutes() * 40 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const newTime = new Date(bowelTime);
                      newTime.setMinutes(selectedIndex);
                      setBowelTime(newTime);
                      Vibration.vibrate(10);
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
                <View style={styles.iOSPickerColumn}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: (new Date().getHours() < 12 ? 0 : 1) * 40 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const period = selectedIndex === 0 ? 'AM' : 'PM';
                      const newTime = new Date(bowelTime);
                      const currentHour = newTime.getHours();
                      const newHour = period === 'AM' 
                        ? (currentHour >= 12 ? currentHour - 12 : currentHour)
                        : (currentHour < 12 ? currentHour + 12 : currentHour);
                      newTime.setHours(newHour);
                      setBowelTime(newTime);
                      Vibration.vibrate(10);
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
                  <TouchableOpacity key={n} onPress={() => { addBowelEntry(n as any, bowelTime); setShowBristolModal(false); setBowelTime(new Date()); }} style={{ width: '30%', backgroundColor: '#F8F9FA', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' }}>
                    <Text style={{ fontSize: 16, color: '#333' }}>Type {n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowBristolModal(false); setBowelTime(new Date()); }}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Food Diary Modal */}
      <Modal visible={showFoodDiaryModal} transparent animationType="slide" onRequestClose={() => setShowFoodDiaryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.manualFoodModal, { maxHeight: '85%' }]}> 
            <Text style={styles.modalTitle}>Today’s Food Diary</Text>
            <ScrollView>
              {!currentLog || currentLog.foods.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="food-apple" size={48} color="#B9A68D" />
                  <Text style={styles.emptyText}>No foods logged yet</Text>
                  <Text style={styles.emptySubtext}>Add an entry to see it here</Text>
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
            </ScrollView>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowFoodDiaryModal(false)}>
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Symptom Modal */}
      <Modal visible={showSymptomModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.manualFoodModal}>
            <Text style={styles.modalTitle}>Log Symptom</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Describe symptom</Text>
              <TextInput style={styles.textInput} placeholder="e.g., bloating after lunch" value={symptomText} onChangeText={setSymptomText} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date & Time occurred</Text>
              <View style={styles.iOSPickerContainer}>
                <View style={styles.iOSPickerHighlight} />
                <View style={styles.iOSPickerColumn}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: 120 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const date = new Date();
                      date.setDate(date.getDate() + (selectedIndex - 3));
                      const newDate = new Date(symptomTime);
                      newDate.setDate(date.getDate());
                      newDate.setMonth(date.getMonth());
                      newDate.setFullYear(date.getFullYear());
                      setSymptomTime(newDate);
                      Vibration.vibrate(10);
                    }}
                  >
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() + (i - 3));
                      const isToday = i === 3;
                      return (
                        <View key={i} style={styles.iOSPickerItem}>
                          <Text style={styles.iOSPickerText}>
                            {isToday ? 'Today' : `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })}`}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
                <View style={styles.iOSPickerColumn}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: ((new Date().getHours() % 12 || 12) - 1) * 40 }}
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
                      setSymptomTime(newTime);
                      Vibration.vibrate(10);
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
                <View style={styles.iOSPickerColumn}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: new Date().getMinutes() * 40 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const newTime = new Date(symptomTime);
                      newTime.setMinutes(selectedIndex);
                      setSymptomTime(newTime);
                      Vibration.vibrate(10);
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
                <View style={styles.iOSPickerColumn}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: (new Date().getHours() < 12 ? 0 : 1) * 40 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const period = selectedIndex === 0 ? 'AM' : 'PM';
                      const newTime = new Date(symptomTime);
                      const currentHour = newTime.getHours();
                      const newHour = period === 'AM' 
                        ? (currentHour >= 12 ? currentHour - 12 : currentHour)
                        : (currentHour < 12 ? currentHour + 12 : currentHour);
                      newTime.setHours(newHour);
                      setSymptomTime(newTime);
                      Vibration.vibrate(10);
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
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowSymptomModal(false); setSymptomText(''); setSymptomTime(new Date()); }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => { if (symptomText.trim()) { addSymptomEntry(symptomText.trim(), symptomTime); setShowSymptomModal(false); setSymptomText(''); setSymptomTime(new Date()); } else { Alert.alert('Missing', 'Please enter a symptom.'); } }}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exercise Modal */}
      <Modal visible={!!showExerciseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.manualFoodModal}>
            <Text style={styles.modalTitle}>Log Exercise</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {['Walk','Run','Swim','Gym','Sport','Other'].map(t => (
                  <TouchableOpacity key={t} onPress={() => setExerciseType(t as any)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: exerciseType===t ? '#B9A68D' : '#E0E0E0', marginRight: 8, marginBottom: 8, backgroundColor: exerciseType===t ? '#F3EEE7' : 'white' }}>
                    <Text style={{ color: '#333' }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date & Start Time</Text>
              <View style={styles.iOSPickerContainer}>
                <View style={styles.iOSPickerHighlight} />
                <View style={styles.iOSPickerColumn}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: 120 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const date = new Date();
                      date.setDate(date.getDate() + (selectedIndex - 3));
                      const newDate = new Date(exerciseStartTime);
                      newDate.setDate(date.getDate());
                      newDate.setMonth(date.getMonth());
                      newDate.setFullYear(date.getFullYear());
                      setExerciseStartTime(newDate);
                      Vibration.vibrate(10);
                    }}
                  >
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() + (i - 3));
                      const isToday = i === 3;
                      return (
                        <View key={i} style={styles.iOSPickerItem}>
                          <Text style={styles.iOSPickerText}>
                            {isToday ? 'Today' : `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })}`}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
                <View style={styles.iOSPickerColumn}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: ((new Date().getHours() % 12 || 12) - 1) * 40 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const hour = selectedIndex === 0 ? 12 : selectedIndex + 1;
                      const newTime = new Date(exerciseStartTime);
                      const currentHour = newTime.getHours();
                      const isAM = currentHour < 12;
                      const newHour = isAM ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12);
                      newTime.setHours(newHour);
                      setExerciseStartTime(newTime);
                      Vibration.vibrate(10);
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
                <View style={styles.iOSPickerColumn}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: new Date().getMinutes() * 40 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const newTime = new Date(exerciseStartTime);
                      newTime.setMinutes(selectedIndex);
                      setExerciseStartTime(newTime);
                      Vibration.vibrate(10);
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
                <View style={styles.iOSPickerColumn}>
                  <ScrollView 
                    style={styles.iOSPickerScroll} 
                    showsVerticalScrollIndicator={false}
                    contentOffset={{ x: 0, y: (new Date().getHours() < 12 ? 0 : 1) * 40 }}
                    snapToInterval={40}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const selectedIndex = Math.round(offsetY / 40);
                      const period = selectedIndex === 0 ? 'AM' : 'PM';
                      const newTime = new Date(exerciseStartTime);
                      const currentHour = newTime.getHours();
                      const newHour = period === 'AM' 
                        ? (currentHour >= 12 ? currentHour - 12 : currentHour)
                        : (currentHour < 12 ? currentHour + 12 : currentHour);
                      newTime.setHours(newHour);
                      setExerciseStartTime(newTime);
                      Vibration.vibrate(10);
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
                  {Array.from({ length: 180 }, (_, i) => (i + 1)).map(duration => (
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
                <Text style={styles.inputLabel}>Perceived Effort (1-10)</Text>
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
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowExerciseModal(false as any)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveExercise}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Meal Type Selection Modal */}
      <Modal
        visible={showMealModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMealModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Meal Type</Text>
            {['snack','breakfast','snack','lunch','snack','dinner','snack'].map(mealType => (
              <TouchableOpacity
                key={mealType}
                style={styles.mealTypeButton}
                onPress={() => handleMealTypeSelect(mealType as any)}
              >
                <Text style={styles.mealTypeButtonText}>
                  {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowMealModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
        <View style={styles.modalOverlay}>
          <View style={styles.manualFoodModal}>
            <Text style={styles.modalTitle}>
              {editingFood ? 'Edit Food' : 'Add Food Manually'}
            </Text>
            
            <ScrollView style={styles.manualFoodForm}>
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
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowManualFoodModal(false)}
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
      </Modal>

      {/* Hydration Modal */}
      <Modal visible={showHydrationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
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
                style={styles.cancelButton}
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
        </View>
      </Modal>

      {/* Analysis Loading Overlay */}
      {isAnalyzing && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <MaterialCommunityIcons name="food-apple" size={48} color="#B9A68D" />
            <Text style={styles.loadingText}>Analyzing your food...</Text>
            <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
          </View>
        </View>
      )}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0090A3',
    marginBottom: 20,
    textAlign: 'center',
  },
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
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
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
  foodCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0090A3',
    marginBottom: 4,
  },
  foodMacros: {
    flexDirection: 'row',
    marginBottom: 4,
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
  manualFoodModal: {
    backgroundColor: '#E6E1D8',
    borderRadius: 16,
    padding: 20,
    margin: 10,
    maxHeight: '80%',
    width: '95%',
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
    justifyContent: 'space-between',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#0090A3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 12,
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
  },
  loadingContent: {
    backgroundColor: '#E6E1D8',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
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
  circularProgressBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: '#E0E0E0',
    position: 'absolute',
  },
  circularProgressFill: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: 'transparent',
    borderTopColor: '#4A90E2',
    position: 'absolute',
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
    borderRadius: 0,
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
    backgroundColor: '#1C1C1E',
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
    backgroundColor: 'rgba(58, 58, 60, 0.2)',
    borderRadius: 8,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
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
  },
  iOSPickerText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '400',
  },
});
