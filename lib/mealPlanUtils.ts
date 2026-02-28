import { MealPlanDay, MealPlanMeal, MealPlanIngredient } from '../contexts/AppContext';

const DAY_NAME_TO_INDEX: Record<string, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
  friday: 4, saturday: 5, sunday: 6,
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
  'day 1': 0, 'day 2': 1, 'day 3': 2, 'day 4': 3,
  'day 5': 4, 'day 6': 5, 'day 7': 6,
};

const MEAL_TYPE_KEYWORDS: Record<string, string> = {
  breakfast: 'breakfast', 'morning meal': 'breakfast', brunch: 'breakfast',
  lunch: 'lunch', 'midday meal': 'lunch', 'mid-day': 'lunch',
  dinner: 'dinner', supper: 'dinner', 'evening meal': 'dinner',
  snack: 'snack', 'afternoon snack': 'snack', 'morning snack': 'snack',
};

// ─── JSON parser ─────────────────────────────────────────────────────────────
export const parseMealPlanFromMessage = (message: string): MealPlanDay[] | null => {
  if (!message) return null;

  // 1. Try JSON block first
  const fromJson = tryParseJson(message);
  if (fromJson && fromJson.length > 0) return fromJson;

  // 2. Fallback: parse plain text meal plan
  const fromText = tryParsePlainText(message);
  if (fromText && fromText.length > 0) return fromText;

  return null;
};

// ─── JSON extraction ──────────────────────────────────────────────────────────
function tryParseJson(message: string): MealPlanDay[] | null {
  try {
    let jsonStr = '';
    const jsonBlockMatch = message.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[1];
    } else {
      const match = message.match(/\{[\s\S]*?("type"|"days")/);
      if (match) {
        const startIdx = match.index!;
        const lastBrace = message.lastIndexOf('}');
        if (lastBrace > startIdx) jsonStr = message.substring(startIdx, lastBrace + 1);
      }
    }

    if (!jsonStr) return null;

    jsonStr = jsonStr.trim();
    jsonStr = jsonStr.replace(/^\s*\/\/.*$/gm, '');
    jsonStr = jsonStr.replace(/\s+\/\/.*$/gm, '');
    jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');
    jsonStr = jsonStr.replace(/\.\.\./g, '');
    jsonStr = jsonStr.replace(/,\s*([\}\]])/g, '$1');

    const openBraces = (jsonStr.match(/\{/g) || []).length;
    const closeBraces = (jsonStr.match(/\}/g) || []).length;
    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) jsonStr += ']'.repeat(openBrackets - closeBrackets);
    if (openBraces > closeBraces) jsonStr += '}'.repeat(openBraces - closeBraces);

    jsonStr = jsonStr.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');

    let data: any;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      try {
        const f = jsonStr.indexOf('{');
        const l = jsonStr.lastIndexOf('}');
        if (f !== -1 && l !== -1) data = JSON.parse(jsonStr.substring(f, l + 1));
        else return null;
      } catch { return null; }
    }

    let days = data.days || (Array.isArray(data) ? data : null);
    if (!days && data.type === 'meal_plan') days = data;
    if (!days && !data.type && !data.days && !Array.isArray(data)) {
      const dayKeys = Object.keys(data).filter(k => DAY_NAME_TO_INDEX[k.toLowerCase()] !== undefined);
      if (dayKeys.length > 0) days = dayKeys.map(key => ({ ...data[key], day: key }));
    }

    if (!Array.isArray(days)) return null;

    return days.map((day: any, dayIdx: number) => {
      let dayOfWeek = dayIdx;
      if (typeof day.dayOfWeek === 'number') dayOfWeek = day.dayOfWeek;
      else if (typeof day.dayOfWeek === 'string' && !isNaN(parseInt(day.dayOfWeek, 10))) dayOfWeek = parseInt(day.dayOfWeek, 10);
      else if (typeof day.day === 'string') dayOfWeek = DAY_NAME_TO_INDEX[day.day.toLowerCase().trim()] ?? dayIdx;

      return {
        id: day.id || `day-${dayIdx}-${Date.now()}`,
        dayOfWeek,
        meals: (day.meals || []).map((meal: any, mealIdx: number) => {
          const rawType = meal.mealType || meal.meal_type || meal.type || meal.category || meal.kind || meal.meal || 'lunch';
          const mealType = rawType.toLowerCase().trim();
          const validTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
          return {
            id: meal.id || `meal-${dayIdx}-${mealIdx}-${Date.now()}`,
            mealType: validTypes.includes(mealType) ? mealType : 'lunch',
            mealOrder: typeof meal.mealOrder === 'number' ? meal.mealOrder : mealIdx,
            title: meal.title || meal.name || meal.menu || meal.meal || meal.food || meal.dish || 'Meal',
            description: meal.description || meal.desc || meal.details || meal.menu || '',
            calories: meal.calories ?? meal.cal ?? meal.kcal,
            protein: meal.protein ?? meal.proteins ?? meal.pro,
            carbs: meal.carbs ?? meal.carbohydrates ?? meal.carb,
            fat: meal.fat ?? meal.fats,
            ingredients: (meal.ingredients || []).map((ing: any, ingIdx: number) => ({
              id: ing.id || `ing-${dayIdx}-${mealIdx}-${ingIdx}-${Date.now()}`,
              name: ing.name || '', quantity: ing.quantity || '', unit: ing.unit || '', notes: ing.notes || '',
            })),
          };
        }),
      };
    });
  } catch {
    return null;
  }
}

// ─── Plain text parser ────────────────────────────────────────────────────────
// Handles RAG responses like:
//   "Day 1:\n- Breakfast: Oatmeal\n- Lunch: Chicken salad\n..."
//   "**Monday**\nBreakfast: Oatmeal with berries\nLunch: ..."
function tryParsePlainText(message: string): MealPlanDay[] | null {
  // Only attempt if message looks like a meal plan
  const lower = message.toLowerCase();
  const hasMealKeywords =
    (lower.includes('breakfast') || lower.includes('lunch') || lower.includes('dinner')) &&
    (lower.includes('day') || lower.includes('monday') || lower.includes('tuesday') ||
      lower.includes('wednesday') || lower.includes('plan'));

  if (!hasMealKeywords) return null;

  const lines = message.split('\n').map(l => l.trim()).filter(Boolean);
  const days: MealPlanDay[] = [];
  let currentDay: MealPlanDay | null = null;
  let dayIndex = 0;
  let mealOrder = 0;

  // Regex to detect day header lines like "Day 1", "Monday", "**Day 2**"
  const dayHeaderRegex = /^[\*#\-\s]*(day\s*\d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday)[\*#\s:]*$/i;

  // Regex to detect meal lines like "- Breakfast: Oatmeal" or "Lunch: Chicken salad"
  const mealLineRegex = /^[\*\-\•\s]*(breakfast|lunch|dinner|snack|morning snack|afternoon snack)\s*[:\-]\s*(.+)$/i;

  for (const line of lines) {
    // Check if it's a day header
    const dayMatch = line.match(dayHeaderRegex);
    if (dayMatch) {
      if (currentDay && currentDay.meals.length > 0) days.push(currentDay);
      const dayKey = dayMatch[1].toLowerCase().trim();
      const resolvedIndex = DAY_NAME_TO_INDEX[dayKey];
      currentDay = {
        id: `day-text-${dayIndex}-${Date.now()}`,
        dayOfWeek: resolvedIndex !== undefined ? resolvedIndex : dayIndex,
        meals: [],
      };
      dayIndex++;
      mealOrder = 0;
      continue;
    }

    // Check if it's a meal line
    const mealMatch = line.match(mealLineRegex);
    if (mealMatch) {
      // If no day header was seen yet, create a default day
      if (!currentDay) {
        currentDay = {
          id: `day-text-0-${Date.now()}`,
          dayOfWeek: 0,
          meals: [],
        };
        dayIndex = 1;
      }

      const rawType = mealMatch[1].toLowerCase().trim();
      const mealType = (MEAL_TYPE_KEYWORDS[rawType] || 'lunch') as 'breakfast' | 'lunch' | 'dinner' | 'snack';
      const titleAndDesc = mealMatch[2].trim();

      // Split "Oatmeal with berries (320 cal)" — title is before parenthesis
      const titleMatch = titleAndDesc.match(/^([^\(]+?)(?:\s*[\(\-].*)?$/);
      const title = titleMatch ? titleMatch[1].trim() : titleAndDesc;

      currentDay.meals.push({
        id: `meal-text-${dayIndex}-${mealOrder}-${Date.now()}`,
        mealType,
        mealOrder: mealOrder++,
        title,
        description: titleAndDesc !== title ? titleAndDesc : '',
        ingredients: [],
      } as MealPlanMeal);
    }
  }

  // Push last day
  if (currentDay && currentDay.meals.length > 0) days.push(currentDay);

  // Need at least 1 day with at least 2 meals to be confident it's a plan
  if (days.length === 0 || days.every(d => d.meals.length < 2)) return null;

  return days;
}

// ─── System prompt ────────────────────────────────────────────────────────────
export const MEAL_PLAN_SYSTEM_PROMPT = `
When the user asks for a meal plan or food plan:
1. Write a short friendly message explaining the plan.
2. ALWAYS add a JSON block at the END of your message using this exact format:

\`\`\`json
{
  "type": "meal_plan",
  "days": [
    {
      "dayOfWeek": 0,
      "meals": [
        {
          "mealType": "breakfast",
          "mealOrder": 0,
          "title": "Oatmeal with Berries",
          "description": "Rolled oats with fresh berries and honey",
          "calories": 320,
          "protein": 12,
          "carbs": 54,
          "fat": 6,
          "ingredients": [
            { "name": "Rolled oats", "quantity": "1", "unit": "cup", "notes": "" }
          ]
        }
      ]
    }
  ]
}
\`\`\`

STRICT RULES:
- dayOfWeek: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday
- mealType must be exactly one of: breakfast, snack, lunch, dinner
- NO comments inside JSON (no // or /* */)
- NO truncation with "..."
- Standard double quotes only
- Default to 7 days unless user specifies a different duration
`;