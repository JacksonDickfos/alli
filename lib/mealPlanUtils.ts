
import { MealPlanDay, MealPlanMeal, MealPlanIngredient } from '../contexts/AppContext';

/**
 * Parses a meal plan from an assistant's message.
 * Looks for a JSON block with "type": "meal_plan".
 */
export const parseMealPlanFromMessage = (message: string): MealPlanDay[] | null => {
  if (!message) return null;

  try {
    // 1. Look for JSON in markdown code blocks
    let jsonStr = '';
    const jsonBlockMatch = message.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[1];
    } else {
      // 2. Fallback: search for a pattern that looks like the start of our JSON
      const match = message.match(/\{[\s\S]*?("type"|"days")/);

      if (match) {
        const startIdx = match.index!;
        const lastBrace = message.lastIndexOf('}');
        if (lastBrace > startIdx) {
          jsonStr = message.substring(startIdx, lastBrace + 1);
        }
      }
    }

    if (!jsonStr) return null;

    // Clean up
    jsonStr = jsonStr.trim();

    // 1. Strip comments (extremely common in AI responses)
    jsonStr = jsonStr.replace(/^\s*\/\/.*$/gm, ''); // Standalone lines
    jsonStr = jsonStr.replace(/\s+\/\/.*$/gm, '');  // Trailing comments with space before
    jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, ''); // Block comments

    // 2. Remove common AI truncation markers
    jsonStr = jsonStr.replace(/\.\.\./g, '');

    // 3. Remove trailing commas that break JSON.parse
    jsonStr = jsonStr.replace(/,\s*([\}\]])/g, '$1');

    // 4. Fix truncated JSON (closing open brackets/braces)
    const openBraces = (jsonStr.match(/\{/g) || []).length;
    const closeBraces = (jsonStr.match(/\}/g) || []).length;
    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/\]/g) || []).length;

    if (openBrackets > closeBrackets) jsonStr += ']'.repeat(openBrackets - closeBrackets);
    if (openBraces > closeBraces) jsonStr += '}'.repeat(openBraces - closeBraces);

    // 5. Handle fancy quotes
    jsonStr = jsonStr.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');

    let data: any;
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      console.warn('[Parse] JSON parse attempt 1 failed:', e);
      console.log('[Parse] Attempt 1 snippet (cleaned):', jsonStr.slice(0, 100) + '...' + jsonStr.slice(-100));
      // Last ditch: try to find valid sub-JSON if the AI added extra text inside or around
      try {
        const firstActive = jsonStr.indexOf('{');
        const lastActive = jsonStr.lastIndexOf('}');
        if (firstActive !== -1 && lastActive !== -1) {
          const subJson = jsonStr.substring(firstActive, lastActive + 1);
          data = JSON.parse(subJson);
        } else {
          return null;
        }
      } catch (failedAgain) {
        console.warn('[Parse] JSON parse failed completely');
        return null;
      }
    }

    // Support both { type: 'meal_plan', days: [] } and just { days: [] } or just []
    let days = data.days || (Array.isArray(data) ? data : null);

    // If it's still null, maybe it's the root object being the meal plan itself?
    if (!days && data.type === 'meal_plan') days = data;
    if (!days && !data.type && !data.days && !Array.isArray(data)) {
      // AI might have sent { "Monday": { ... }, "Tuesday": { ... } }
      // We don't support this yet, but we can check if there are 
      // keys that look like days. For now, just return null.
      console.log('[Parse] Unrecognized JSON structure:', Object.keys(data));
    }

    if (Array.isArray(days)) {
      return days.map((day: any, dayIdx: number) => ({
        id: day.id || `day-${dayIdx}-${Date.now()}`,
        dayOfWeek: typeof day.dayOfWeek === 'number' ? day.dayOfWeek : dayIdx,
        meals: (day.meals || []).map((meal: any, mealIdx: number) => ({
          id: meal.id || `meal-${dayIdx}-${mealIdx}-${Date.now()}`,
          mealType: meal.mealType || meal.type || 'lunch',
          mealOrder: typeof meal.mealOrder === 'number' ? meal.mealOrder : mealIdx,
          title: meal.title || 'Untitled Meal',
          description: meal.description || '',
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          ingredients: (meal.ingredients || []).map((ing: any, ingIdx: number) => ({
            id: ing.id || `ing-${dayIdx}-${mealIdx}-${ingIdx}-${Date.now()}`,
            name: ing.name || '',
            quantity: ing.quantity || '',
            unit: ing.unit || '',
            notes: ing.notes || ''
          }))
        }))
      }));
    }
  } catch (error) {
    console.warn('Silent fail parsing meal plan (expected if message has no JSON):', error);
  }

  return null;
};

export const MEAL_PLAN_SYSTEM_PROMPT = `
When the user asks for a meal plan or when you propose one:
1. Provide a friendly explanation of the plan.
2. ALWAYS include a structured JSON version of the plan at the end of your message in a \`\`\`json block.
3. CRITICAL: The JSON must be VALID. NO comments (// or /* */) inside the JSON. Standard double quotes ONLY.
4. DO NOT truncate the JSON with "...". Provide the FULL data.

The JSON must follow this exact structure:
{
  "type": "meal_plan",
  "days": [
    {
      "dayOfWeek": 0, (0 for Monday, 6 for Sunday)
      "meals": [
        {
          "mealType": "breakfast", (breakfast, snack, lunch, dinner)
          "mealOrder": 0, (0 to 4)
          "title": "Meal title",
          "description": "Short description",
          "calories": 400,
          "protein": 20,
          "carbs": 45,
          "fat": 12,
          "ingredients": [
            { "name": "Ingredient name", "quantity": "1", "unit": "cup", "notes": "" }
          ]
        }
      ]
    }
  ]
}
IMPORTANT: If the user asks for a meal plan for a specific duration (e.g., "for today", "for the next 3 days"), only include those days. If they ask for a "plan", default to 7 days (Monday-Sunday).
Always provide sensible estimates for calories, protein, carbs, and fat for each meal.
`;
