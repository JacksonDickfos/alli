/**
 * Food Analysis Service - Edamam Vision API Integration
 * Analyzes food images and returns nutritional information
 */

import * as FileSystem from 'expo-file-system';

// Edamam Vision API response structure
interface EdamamVisionResponse {
  parsed: {
    food: {
      foodId?: string;
      uri?: string;
      label: string;
      knownAs?: string;
      foodContentsLabel?: string;
      brand?: string;
      category?: string;
      categoryLabel?: string;
      image?: string;
    };
    quantity?: number;
    measure?: {
      uri: string;
      label: string;
      weight: number;
    };
  };
  recipe?: {
    calories?: number;
    totalWeight?: number;
    totalNutrients?: {
      ENERC_KCAL?: { quantity: number; unit: string; label: string };
      PROCNT?: { quantity: number; unit: string; label: string };
      FAT?: { quantity: number; unit: string; label: string };
      CHOCDF?: { quantity: number; unit: string; label: string };
      FIBTG?: { quantity: number; unit: string; label: string };
      SUGAR?: { quantity: number; unit: string; label: string };
      [key: string]: { quantity: number; unit: string; label: string } | undefined;
    };
  };
}

export interface FoodAnalysisResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  servingSize?: string;
  // Approximate grams for a single base serving, when available
  servingWeightGrams?: number;
  // Serving unit information from Passio (e.g., "slice", "cup", "tablespoon")
  servingUnit?: string;
  servingQuantity?: number;
  confidence?: number;
  imageUri?: string;
  // Ingredient image URL (from Passio or other sources)
  ingredientImageUrl?: string;
  // Passio.ai specific fields
  passioResultId?: string;
  passioReferenceId?: string;
  passioProductCode?: string;
  passioType?: string;
  isRecipe?: boolean;
  isSingleIngredient?: boolean;
  isSeveralFoodsCombined?: boolean;
  // For multi-item dishes, store detected ingredients/items
  detectedSegments?: Array<{ id: number | string; name: string; foodId?: number; position?: number; ingredientImageUrl?: string }>; // Other detected items/ingredients
}

export class FoodAnalysisService {
  private static readonly EDAMAM_APP_ID = '1b411796';
  private static readonly EDAMAM_APP_KEY = '8cd505859f2bcba26faffa4a8a3c7acd';
  // Edamam Vision API endpoint - uses nutrients-from-image endpoint
  private static readonly EDAMAM_VISION_API_URL = 'https://api.edamam.com/api/food-database/nutrients-from-image';

  /**
   * Convert image URI to base64 string (React Native compatible)
   */
  private static async imageUriToBase64(uri: string): Promise<string> {
    try {
      // Check if it's already a base64 data URI
      if (uri.startsWith('data:image')) {
        const base64 = uri.split(',')[1];
        return base64;
      }

      // Use expo-file-system for local file URIs (file://, content://)
      if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://')) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
      }

      // For http/https URIs, use fetch
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Remove data URL prefix
          const base64 = base64String.includes(',') 
            ? base64String.split(',')[1] 
            : base64String;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw new Error('Failed to process image. Please ensure the image is accessible.');
    }
  }

  /**
   * Analyze food image using Edamam Vision API
   */
  static async analyzeFood(imageUri: string): Promise<FoodAnalysisResult> {
    try {
      console.log('🍽️ Starting food analysis with Edamam...');
      
      // Convert image to base64
      const base64Image = await this.imageUriToBase64(imageUri);
      
      // Edamam Vision API - accepts base64 image in JSON body
      // Format: data:image/jpeg;base64,<base64_string>
      const base64DataUri = `data:image/jpeg;base64,${base64Image}`;
      
      const requestBody = {
        image: base64DataUri,
      };

      const url = `${this.EDAMAM_VISION_API_URL}?app_id=${this.EDAMAM_APP_ID}&app_key=${this.EDAMAM_APP_KEY}&beta=true`;
      
      console.log('📤 Sending request to Edamam Vision API...', url);
      console.log('📤 Image URI:', imageUri);
      console.log('📤 Base64 length:', base64Image.length);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edamam API error:', response.status, errorText);
        
        // Parse error message for better user feedback
        let errorMessage = 'Failed to analyze food image.';
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error === 'low_quality') {
            errorMessage = 'The image quality is too low or doesn\'t contain recognizable food. Please try a clearer photo of food.';
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // If error text isn't JSON, use the raw text
          errorMessage = `Food analysis failed: ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }

      const data: EdamamVisionResponse = await response.json();
      console.log('✅ Edamam API response:', JSON.stringify(data, null, 2));

      // Parse the response - Vision API returns { parsed: { food, measure }, recipe }
      if (!data.parsed || !data.parsed.food) {
        throw new Error('No food items detected in the image');
      }

      const parsed = data.parsed;
      const food = parsed.food;
      const servingSize = parsed.measure?.label || '1 serving';
      const servingWeightGrams = parsed.measure?.weight;

      // Nutrients are in recipe.totalNutrients, not parsed.food.nutrients
      const nutrients = data.recipe?.totalNutrients || {};
      
      // Extract nutrient values (they're objects with quantity, unit, label)
      const getNutrientValue = (nutrient: { quantity: number; unit: string; label: string } | undefined): number => {
        return nutrient ? Math.round(nutrient.quantity) : 0;
      };

      // Calculate confidence (simplified - could be improved)
      const confidence = data.recipe ? 0.85 : 0.5;

      // Clean up the food label (remove quotes if present)
      const foodName = (food.label || food.knownAs || 'Unknown Food').replace(/^"|"$/g, '');

      const result: FoodAnalysisResult = {
        name: foodName,
        calories: getNutrientValue(nutrients.ENERC_KCAL) || Math.round(data.recipe?.calories || 0),
        protein: getNutrientValue(nutrients.PROCNT),
        carbs: getNutrientValue(nutrients.CHOCDF),
        fat: getNutrientValue(nutrients.FAT),
        fiber: getNutrientValue(nutrients.FIBTG),
        sugar: getNutrientValue(nutrients.SUGAR),
        servingSize,
        servingWeightGrams,
        confidence,
        imageUri,
      };

      console.log('📊 Analysis result:', result);
      return result;
    } catch (error) {
      console.error('❌ Food analysis error:', error);
      throw error;
    }
  }

  /**
   * Alternative method: Analyze food from text description
   * (Useful as fallback if image recognition fails)
   */
  static async analyzeFoodFromText(foodText: string): Promise<FoodAnalysisResult> {
    try {
      const response = await fetch(
        `https://api.edamam.com/api/food-database/v2/parser?app_id=${this.EDAMAM_APP_ID}&app_key=${this.EDAMAM_APP_KEY}&ingr=${encodeURIComponent(foodText)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Food search failed: ${response.status}`);
      }

      const data: EdamamVisionResponse = await response.json();

      if (!data.hints || data.hints.length === 0) {
        throw new Error('Food not found in database');
      }

      const firstHint = data.hints[0];
      const food = firstHint.food;
      const nutrients = food.nutrients;

      return {
        name: food.label || food.knownAs || foodText,
        calories: Math.round(nutrients.ENERC_KCAL || 0),
        protein: Math.round(nutrients.PROCNT || 0),
        carbs: Math.round(nutrients.CHOCDF || 0),
        fat: Math.round(nutrients.FAT || 0),
        fiber: Math.round(nutrients.FIBTG || 0),
        sugar: Math.round(nutrients.SUGAR || 0),
        servingSize: firstHint.measures?.[0]?.label || '1 serving',
        confidence: 0.8,
      };
    } catch (error) {
      console.error('Text-based food analysis error:', error);
      throw error;
    }
  }
}

