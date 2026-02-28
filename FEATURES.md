# Alli App: Product Feature Documentation

This document provides a comprehensive overview of the features and capabilities of the **Alli Nutrition & Wellness Assistant**.

---

## 1. Core AI Ecosystem (Alli Assistant)
The "Alli" character is a pervasive, context-aware nutrition assistant integrated via multiple modalities.

*   **Hybrid Multi-Modal Interface**
    *   **Contextual Chat**: A high-performance chat interface supporting full Markdown rendering for complex nutritional data and tables.
    *   **Real-Time Voice (RTVI)**: Low-latency voice interaction powered by LiveKit WebRTC, enabling hands-free kitchen or workout consultations.
*   **Reliability & Performance**
    *   **AI Fallback Engine**: A proprietary 10-second timeout logic that automatically switches from primary LLM endpoints (Novita) to secondary RAG (Retrieval-Augmented) endpoints to ensure zero-downtime availability.
    *   **Cloud Memory**: Secure, server-side storage of conversation history via Supabase, allowing seamless switching between mobile and web platforms.

## 2. Advanced Nutrition & Vision Intelligence
Transforming raw data into actionable insights through automated tracking.

*   **Computer Vision Food Analysis**
    *   **Snapshot Logging**: Uses AI vision to identify food items, estimate portion sizes, and calculate nutritional values directly from photos.
    *   **Confidence Scoring**: Provides real-time feedback on the accuracy of the AI’s food identification for user verification.
*   **Comprehensive Diary Management**
    *   **Macro/Micro Matrix**: Granular tracking of Calories, Protein, Fats (Total/Saturated), Carbohydrates, Fiber, and Sugar.
    *   **Temporal Logging**: Categorization of entries into Breakfast, Lunch, Dinner, and Snacks.
*   **Smart Hydration**
    *   **Liquid Extraction**: Automatically identifies beverage types (Water, Soda, Coffee, Milk) and extracts volume measurements (ml/oz) from text or image data.

## 3. Holistic Health & Lifestyle Suite
Alli monitors a wide spectrum of health markers to provide a 360-degree wellness view.

*   **Biometric Tracking**
    *   **Weight Management**: Historical logging of body weight to visualize progress against goals.
    *   **Exercise Integration**: Logging of physical activity duration and intensity levels.
*   **Digestion & Gut Health**
    *   **Bowel Movement Analytics**: A specialized tracker for bowel consistency and frequency, used by the AI to correlate fiber intake with digestive efficiency.
*   **Wellness Indicators**
    *   **Sleep & Stress Monitoring**: Self-reported scales to help the AI identify patterns between dietary choices and mental/physical well-being.
    *   **Symptom Logging**: Tracking of physical discomfort or symptoms to identify potential food sensitivities.

## 4. Personalization & Intelligence Engine
Tailoring the application experience to individual metabolic needs.

*   **Goal Calibration**
    *   **Metabolic Profiles**: Dynamic calculation of daily caloric and macro targets based on Age, Weight, Height, Gender, and the "Mifflin-St Jeor" equation.
    *   **Strategy Modes**: Configurable targets for "Weight Loss", "Muscle Gain", or "Maintenance".
*   **Predictive Meal Planning**
    *   **Weekly Generation**: Instant creation of 7-day meal plans based on nutritional templates.
    *   **Detailed Preparation**: Access to ingredients and cooking instructions for every generated meal.

## 5. Premium Experience & Infrastructure
A state-of-the-art technical foundation providing a luxury user experience.

*   **Design System**
    *   **Aesthetic UI**: A premium "Tan & Teal" palette featuring glassmorphism, animated card transitions, and custom SVG iconography.
    *   **Adaptive Navigation**: A specialized floating action button system that shifts depending on the user's current context (Home vs. Chat).
*   **Enterprise-Grade Security**
    *   **Native Biometrics**: Integrated FaceID and TouchID for secure, instant access.
    *   **JWT Session Management**: Robust authentication handled via Supabase Auth and AsyncStorage persistence.
*   **Platform Versatility**
    *   **Universal Build**: A single codebase powering iOS, Android, and a Progressive Web App (PWA) with automatic update detection.

---

### Technical Specification Summary
| Component | Technology |
| :--- | :--- |
| **Framework** | React Native / Expo (v53+) |
| **Language** | TypeScript (v5.8) |
| **Backend/DB** | Supabase (PostgreSQL / RLS) |
| **AI LLM** | Novita AI & OpenAI GPT-4o |
| **Real-time Voice**| LiveKit WebRTC |
| **Vision** | GPT-4o-Vision / Passio SDK |
| **Deployment** | Vercel (API) / EAS (Mobile) |
