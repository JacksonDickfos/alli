/**
 * Passio Nutrition AI Service
 * 
 * Integrates with Passio.ai's Nutrition Hub API for food recognition and nutrition analysis.
 * All API calls go through our backend proxy to keep API keys secure.
 */

import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import type { FoodAnalysisResult } from './FoodAnalysisService';

// Backend endpoint URL (adjust based on your deployment)
// For local dev: http://localhost:3001
// For production: set EXPO_PUBLIC_BACKEND_URL environment variable or add to app.json extra.backendUrl
const BACKEND_URL = 
  process.env.EXPO_PUBLIC_BACKEND_URL || 
  Constants.expoConfig?.extra?.backendUrl || 
  'http://localhost:3001';

/**
 * Convert image URI to base64 string
 * Note: Image compression is handled by expo-image-picker (quality: 0.8)
 * and backend now accepts up to 50MB, so no additional compression needed
 */
async function imageUriToBase64(uri: string): Promise<string> {
  try {
    // Check if it's already a base64 data URI
    if (uri.startsWith('data:image')) {
      const base64 = uri.split(',')[1];
      const sizeKB = Math.round(base64.length / 1024);
      console.log('📊 Base64 size:', sizeKB, 'KB');
      if (sizeKB > 10000) { // Warn if over 10MB
        console.warn('⚠️ Large image detected:', sizeKB, 'KB - backend limit is 50MB');
      }
      return base64;
    }

    // Use expo-file-system for local file URIs
    if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://')) {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const sizeKB = Math.round(base64.length / 1024);
      console.log('📊 Base64 size:', sizeKB, 'KB');
      if (sizeKB > 10000) { // Warn if over 10MB
        console.warn('⚠️ Large image detected:', sizeKB, 'KB - backend limit is 50MB');
      }
      return base64;
    }

    // For http/https URIs, download first
    const downloadPath =
      FileSystem.cacheDirectory + 'passio-temp-' + Date.now().toString() + '.jpg';
    const downloadRes = await FileSystem.downloadAsync(uri, downloadPath);
    if (downloadRes.status !== 200) {
      throw new Error('Failed to download image for Passio analysis.');
    }
    const base64 = await FileSystem.readAsStringAsync(downloadPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const sizeKB = Math.round(base64.length / 1024);
    console.log('📊 Base64 size:', sizeKB, 'KB');
    if (sizeKB > 10000) { // Warn if over 10MB
      console.warn('⚠️ Large image detected:', sizeKB, 'KB - backend limit is 50MB');
    }
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error('Failed to process image. Please ensure the image is accessible.');
  }
}

/**
 * Passio API response structure
 */
interface PassioFoodItem {
  ingredientName?: string;
  mealName?: string;
  displayName?: string;
  shortName?: string;
  longName?: string;
  portionSize?: string;
  portionQuantity?: number;
  weightGrams?: number;
  nutritionPreview?: {
    calories?: number;
    carbs?: number;
    fat?: number;
    protein?: number;
    fiber?: number;
    portion?: {
      quantity?: number;
      weight?: {
        unit?: string;
        value?: number;
      };
      name?: string;
    };
  };
  score?: number;
  isRecipe?: boolean;
  isSingleIngredient?: boolean;
  isSeveralFoodsCombined?: boolean;
  type?: string;
  itemType?: string;
  resultId?: string;
  referenceId?: string;
  productCode?: string;
  // Image fields that Passio might return
  imageUrl?: string;
  image?: string;
  photoUrl?: string;
  thumbnailUrl?: string;
  imageUri?: string;
}

/**
 * Analyze a food image using Passio Nutrition AI
 * 
 * @param imageUri Local file URI of the image to analyze
 * @returns Array of detected food items with nutrition data
 */
export async function analyzeImage(imageUri: string): Promise<FoodAnalysisResult[]> {
  try {
    console.log('🍽️ Starting food analysis with Passio Nutrition AI...');
    console.log('📸 Image URI for Passio:', imageUri);

    // Convert image to base64
    const imageBase64 = await imageUriToBase64(imageUri);
    console.log('✅ Image converted to base64, length:', imageBase64.length);

    // Call our backend proxy endpoint
    const backendUrl = `${BACKEND_URL}/passio/recognize-image`;
    console.log('🌐 Calling backend proxy:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64,
        message: {},
      }),
    });

    const text = await response.text();
    console.log('📋 Backend response status:', response.status);

    if (!response.ok) {
      console.error('❌ Backend proxy error:', response.status, text);
      let errorMessage = `Passio analysis failed: ${response.status}`;
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage += ` ${text.substring(0, 200)}`;
      }
      throw new Error(errorMessage);
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('❌ Failed to parse backend JSON:', text);
      throw new Error('Backend returned invalid JSON.');
    }

    if (!data.success || !Array.isArray(data.foods) || data.foods.length === 0) {
      throw new Error('Passio did not return any recognizable food items.');
    }

    console.log(`✅ Passio detected ${data.foods.length} food item(s)`);
    console.log('🔍 Full Passio response sample (first item):', JSON.stringify(data.foods[0], null, 2));

    // Convert Passio response to our FoodAnalysisResult format
    const items: FoodAnalysisResult[] = data.foods.map((food: PassioFoodItem, index: number) => {
      // Determine the best name to use
      const name =
        food.displayName ||
        food.shortName ||
        food.longName ||
        food.mealName ||
        food.ingredientName ||
        'Unknown food';

      // Extract nutrition data
      const nutrition = food.nutritionPreview || {};
      const calories = nutrition.calories || 0;
      const protein = nutrition.protein || 0;
      const carbs = nutrition.carbs || 0;
      const fat = nutrition.fat || 0;
      const fiber = nutrition.fiber || 0;

      // Determine serving size
      const portion = nutrition.portion || {};
      const weightGrams = food.weightGrams || portion.weight?.value || 0;
      const weightUnit = portion.weight?.unit || 'g';
      const portionName = portion.name || food.portionSize || '1 serving';
      const portionQuantity = food.portionQuantity || portion.quantity || 1;

      const servingSize = weightGrams > 0 
        ? `${portionQuantity} × ${portionName} (${weightGrams}${weightUnit})`
        : `${portionQuantity} × ${portionName}`;

      // Confidence score (Passio uses score, normalize to 0-1)
      const confidence = food.score ? Math.min(food.score / 100, 1) : 0.8;

      // Extract image URL from various possible fields
      // Passio might return images in different structures
      const ingredientImageUrl = 
        food.imageUrl || 
        food.image || 
        food.photoUrl || 
        food.thumbnailUrl || 
        food.imageUri ||
        (food as any).croppedImage ||
        (food as any).foodDataInfo?.imageUrl ||
        (food as any).foodDataInfo?.image ||
        (food as any).foodDataInfo?.photoUrl ||
        (food as any).foodDataInfo?.thumbnailUrl ||
        (food as any).segments?.[0]?.imageUrl ||
        (food as any).segments?.[0]?.image ||
        undefined;
      
      if (ingredientImageUrl) {
        console.log(`🖼️ Found image for ${name}: ${ingredientImageUrl.substring(0, 50)}...`);
      } else {
        console.log(`⚠️ No image found for ${name}, checking fields:`, {
          imageUrl: food.imageUrl,
          image: food.image,
          photoUrl: food.photoUrl,
          thumbnailUrl: food.thumbnailUrl,
          imageUri: food.imageUri,
          hasFoodDataInfo: !!(food as any).foodDataInfo,
          hasSegments: !!(food as any).segments,
        });
      }

      return {
        name,
        calories: Math.round(calories),
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        fiber: Math.round(fiber * 10) / 10,
        sugar: 0, // Passio doesn't always provide sugar in preview
        servingSize,
        servingWeightGrams: weightGrams > 0 ? Math.round(weightGrams) : undefined,
        servingUnit: portionName, // e.g., "slice", "cup", "tablespoon"
        servingQuantity: portionQuantity, // e.g., 1, 2, etc.
        confidence,
        imageUri,
        // Store ingredient image URL if available
        ingredientImageUrl,
        // Store Passio-specific IDs for potential future use
        passioResultId: food.resultId,
        passioReferenceId: food.referenceId,
        passioProductCode: food.productCode,
        passioType: food.type || food.itemType,
        isRecipe: food.isRecipe || false,
        isSingleIngredient: food.isSingleIngredient || false,
        isSeveralFoodsCombined: food.isSeveralFoodsCombined || false,
      };
    });

    console.log('📊 Parsed Passio items:', items.map(item => `${item.name} (${item.calories} cal)`).join(', '));
    console.log('🖼️ Passio image URLs:', items.map(item => `${item.name}: ${item.ingredientImageUrl || item.imageUri || 'NO IMAGE'}`).join(', '));
    return items;
  } catch (error) {
    console.error('❌ Passio analysis error:', error);
    throw error;
  }
}

