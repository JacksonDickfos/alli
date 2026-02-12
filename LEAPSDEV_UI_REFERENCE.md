# Where the latest UI lives (leapsdev branch)

## What your screenshot shows (OLD UI)

The screenshot from your outsource developers shows the **old** UI:

- **Greeting:** "Good to see you, Alli"
- **Three cards:** "Alli" (Chat with your 24/7 dietitian), "Nutrition" (Add to your food diary), "Goals" (Track and monitor your progress)
- **Bottom nav:** 4 items (home, apple, big A, other)

That design is **not** the current production UI on **leapsdev**. It comes from an older version of the app (or a different branch, e.g. `main`).

---

## Where the latest UI actually is (leapsdev)

On the **leapsdev** branch, the **latest** UI is implemented here:

### 1. **Branch**
- **leapsdev** is production. The latest UI is in this branch.

### 2. **Main app structure**
- **`App.tsx`**  
  - Root navigation (Auth vs MainApp).  
  - Tab navigator with 5 tabs: **Today**, **Diary**, **Alli**, **Plan**, **More**.  
  - Alli tab uses **AlliScreen** (voice) and the center tab button (purple circle with avatar).  
  - Floating “+” button and **LoggingMenuModal**.

### 3. **Screens that define the current UI**
- **`screens/HomeScreen.tsx`**  
  - **Today** tab.  
  - Greeting: “Good morning/afternoon/evening, {firstName}!”  
  - Motivation card (“This is your healthiest chapter”).  
  - **Upcoming Meal** card (image + “Generate Meal Plan” button).  
  - **Today’s Progress** (Energy, Protein, Carbs, Fat, Fibre, Hydration).  
  - Quick actions, compliance tiles, etc.

- **`screens/NutritionScreen.tsx`**  
  - **Diary** tab (food log, camera/gallery/manual logging, bowel, symptoms, weight).

- **`screens/AlliScreen.tsx`**  
  - **Alli** tab (voice + chat UI, no “Voice” bar, no pulsing avatar).

- **`screens/MealPlanScreen.tsx`**  
  - **Plan** tab (Mon–Sun meal plan, “Chat with me” for personalised plan).

- **`screens/MenuScreen.tsx`** + **MenuStackNavigator**  
  - **More** tab (Profile, Account, etc.).

### 4. **Other important UI**
- **`components/LoggingMenuModal.tsx`** – Log food (camera / existing pic / manual).  
- **`components/AlliChatScreen.tsx`** – Used by AlliScreen for chat.  
- **`contexts/AppContext.tsx`** – App state, meal plan, diary, etc.

---

## What your developers need to do

1. **Use the leapsdev branch**
   - `git fetch origin`
   - `git checkout leapsdev` or `git switch leapsdev`
   - `git pull origin leapsdev`

2. **Confirm they’re on the latest UI**
   - After running the app, **Today** should show:
     - “Good morning/afternoon/evening, {name}!”
     - “Upcoming Meal” and “Today’s Progress”
   - **Not** “Good to see you, Alli” and the three cards (Alli / Nutrition / Goals).

3. **To make a new branch the “new production”**
   - Create a branch from **leapsdev** (e.g. `git checkout -b new-production leapsdev`).
   - The latest UI is already on **leapsdev**; that new branch will have the same UI.  
   - Any further changes should be made on that new branch (or on leapsdev, then merged), and the new production build should be from that branch.

---

## Quick comparison

| Element            | Old UI (screenshot)           | Latest UI (leapsdev)                          |
|--------------------|-------------------------------|-----------------------------------------------|
| Greeting           | “Good to see you, Alli”      | “Good morning/afternoon/evening, {firstName}!” |
| Home content       | 3 cards (Alli, Nutrition, Goals) | Upcoming Meal + Today’s Progress           |
| Tabs               | 4 items                      | 5: Today, Diary, Alli, Plan, More             |
| Alli tab           | Likely chat-only             | AlliScreen (voice + chat)                     |

If they see the **left column**, they are on an old branch or old build. They need to be on **leapsdev** and run a fresh build so they see the **right column**.
