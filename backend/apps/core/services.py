import hashlib
import json
import os
import base64
from urllib.request import Request, urlopen
from urllib.error import URLError

from groq import Groq
import google.generativeai as genai


def get_groq_client():
    """Get Groq client with API key from settings."""
    api_key = os.getenv('GROQ_API_KEY', '')
    if api_key:
        return Groq(api_key=api_key)
    return None


def pseudo_embedding(text: str):
    """Generate pseudo-embedding for RAG memory."""
    digest = hashlib.sha256(text.encode('utf-8')).digest()
    return [round(byte / 255, 4) for byte in digest[:16]]


def groq_chat_completion(messages: list, model: str = "llama-3.3-70b-versatile"):
    """
    Send messages to Groq API and get a completion.
    Falls back to rule-based response if API fails.
    """
    client = get_groq_client()
    if not client:
        return None

    try:
        chat_completion = client.chat.completions.create(
            messages=messages,
            model=model,
            temperature=0.7,
            max_tokens=1024,
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        print(f"Groq API error: {e}")
        return None


def get_gemini_client():
    """Get Gemini client and configure API key."""
    api_key = os.getenv('GEMINI_API_KEY', '')
    if api_key:
        genai.configure(api_key=api_key)
        return genai
    return None


def recognize_food_from_image(image_data: str):
    """
    Use Gemini Vision API to recognize food from image and extract nutrition info.

    Args:
        image_data: Base64 encoded image string (data URI or plain base64)

    Returns:
        dict with food_name, calories, protein, carbs, fats
    """
    genai_client = get_gemini_client()
    if not genai_client:
        return None

    try:
        # Handle data URI format (e.g., "data:image/jpeg;base64,...")
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        # Decode base64 to bytes
        image_bytes = base64.b64decode(image_data)

        # Create Gemini model for vision
        model = genai_client.GenerativeModel('gemini-1.5-flash')

        # Create prompt for food recognition
        prompt = """Analyze this food image and provide:
1. Food name
2. Estimated serving size
3. Estimated calories per 100g
4. Estimated protein (g per 100g)
5. Estimated carbs (g per 100g)
6. Estimated fats (g per 100g)

Respond in exactly this format (numbers only):
Food: [food name]
Calories: [number]
Protein: [number]
Carbs: [number]
Fats: [number]"""

        # Send image and prompt to Gemini
        response = model.generate_content([
            prompt,
            {
                'mime_type': 'image/jpeg',
                'data': image_bytes
            }
        ])

        if response and response.text:
            return parse_gemini_nutrition_response(response.text)

        return None

    except Exception as e:
        print(f"Gemini API error: {e}")
        return None


def parse_gemini_nutrition_response(response_text: str):
    """Parse Gemini response to extract nutrition data."""
    try:
        import re
        lines = response_text.strip().split('\n')
        nutrition = {
            'food_name': 'Food Item',
            'calories': 100,
            'protein': 5,
            'carbs': 10,
            'fats': 5
        }

        for line in lines:
            line_lower = line.lower()
            numbers = re.findall(r'[\d.]+', line)

            if numbers:
                value = float(numbers[0])

                if 'food' in line_lower and ':' in line:
                    nutrition['food_name'] = line.split(':')[-1].strip()
                elif 'calorie' in line_lower:
                    nutrition['calories'] = int(value)
                elif 'protein' in line_lower:
                    nutrition['protein'] = round(value, 1)
                elif 'carb' in line_lower:
                    nutrition['carbs'] = round(value, 1)
                elif 'fat' in line_lower:
                    nutrition['fats'] = round(value, 1)

        return {
            'food': nutrition['food_name'],
            'calories': nutrition['calories'],
            'protein': nutrition['protein'],
            'carbs': nutrition['carbs'],
            'fats': nutrition['fats'],
            'source': 'gemini_vision'
        }
    except Exception as e:
        print(f"Error parsing Gemini response: {e}")
        return None


def build_fitness_context(user_profile: dict, recent_data: dict) -> str:
    """Build context string from user profile and recent activity."""
    context_parts = []

    if user_profile:
        context_parts.append(f"User Goal: {user_profile.get('goal', 'maintenance')}")
        context_parts.append(f"Diet Type: {user_profile.get('diet_type', 'not specified')}")
        context_parts.append(f"Current Streak: {user_profile.get('streak_days', 0)} days")
        if user_profile.get('weight'):
            context_parts.append(f"Weight: {user_profile['weight']} kg")

    if recent_data:
        if recent_data.get('recent_workouts'):
            context_parts.append(f"Recent Workouts: {recent_data['recent_workouts']}")
        if recent_data.get('avg_calories'):
            context_parts.append(f"Avg Daily Calories Burned: {recent_data['avg_calories']}")
        if recent_data.get('avg_sleep'):
            context_parts.append(f"Avg Sleep: {recent_data['avg_sleep']} hours")

    return "\n".join(context_parts)


def build_rag_response(message: str, context: dict):
    """
    Build AI response using Groq API with user context.
    Falls back to rule-based response if API unavailable.
    """
    # Build system prompt with fitness coach persona
    system_prompt = """You are BeastTrack AI, an expert fitness and nutrition coach.
You provide personalized, actionable advice based on the user's goals, diet preferences, and recent activity.
Keep responses concise (2-3 sentences max), friendly, and motivating.
Focus on practical advice they can act on today."""

    # Build context from user data
    user_context = build_fitness_context(context.get('profile', {}), context.get('recent', {}))

    messages = [
        {"role": "system", "content": system_prompt},
    ]

    if user_context:
        messages.append({
            "role": "system",
            "content": f"User Context:\n{user_context}"
        })

    messages.append({"role": "user", "content": message})

    # Try Groq API first
    response = groq_chat_completion(messages)

    if response:
        return {
            'answer': response,
            'embedding_preview': pseudo_embedding(message),
            'source': 'groq_ai',
        }

    # Fallback to rule-based responses
    message_lower = message.lower()
    if 'not improving' in message_lower:
        return {
            'answer': 'Your recent pattern shows low protein intake and inconsistent workout frequency. Increase daily protein and keep a 4-day minimum workout rhythm.',
            'embedding_preview': pseudo_embedding(message),
            'source': 'fallback',
        }

    if 'what should i do today' in message_lower:
        return {
            'answer': 'Based on your fatigue and sleep trend, do a light recovery workout: 25 minutes mobility + 20 minutes zone-2 cardio.',
            'embedding_preview': pseudo_embedding(message),
            'source': 'fallback',
        }

    return {
        'answer': f"Personalized recommendation: focus on {context.get('goal', 'maintenance')} with balanced macros and progressive overload.",
        'embedding_preview': pseudo_embedding(message),
        'source': 'fallback',
    }


def ai_workout_analysis(exercise_name: str, reps: int, duration: int, form_notes: str = ""):
    """
    Use AI to analyze workout performance and provide feedback.
    """
    prompt = f"""Analyze this workout set and provide brief feedback:
Exercise: {exercise_name}
Reps completed: {reps}
Duration: {duration} seconds
{f'Form notes: {form_notes}' if form_notes else ''}

Provide:
1. Estimated calories burned (number only)
2. Form score out of 100
3. One tip for improvement"""

    messages = [
        {"role": "system", "content": "You are a fitness form analyzer. Be concise and specific."},
        {"role": "user", "content": prompt}
    ]

    response = groq_chat_completion(messages, model="llama-3.1-8b-instant")

    if response:
        # Parse AI response
        try:
            lines = response.strip().split('\n')
            calories = 0
            form_score = 75
            tip = "Focus on controlled movements."

            for line in lines:
                line_lower = line.lower()
                if 'calorie' in line_lower:
                    # Extract number from line
                    import re
                    numbers = re.findall(r'\d+', line)
                    if numbers:
                        calories = int(numbers[0])
                elif 'score' in line_lower or 'form' in line_lower:
                    import re
                    numbers = re.findall(r'\d+', line)
                    if numbers:
                        form_score = min(int(numbers[0]), 100)
                elif 'tip' in line_lower or len(line) > 20:
                    tip = line.replace('Tip:', '').replace('3.', '').strip()

            return {
                'calories_burned': max(calories, reps * 2),  # Minimum estimate
                'form_score': form_score,
                'feedback': tip,
                'source': 'ai_analysis'
            }
        except Exception:
            pass

    # Fallback calculation
    return {
        'calories_burned': max(int(reps * 3.5 + duration * 0.15), 10),
        'form_score': 75,
        'feedback': 'Focus on controlled movements and proper breathing.',
        'source': 'estimate'
    }


# Food nutrition database (common foods)
FOOD_DATABASE = {
    'chicken breast': {'calories': 165, 'protein': 31, 'carbs': 0, 'fats': 3.6},
    'chicken': {'calories': 239, 'protein': 27, 'carbs': 0, 'fats': 14},
    'rice': {'calories': 130, 'protein': 2.7, 'carbs': 28, 'fats': 0.3},
    'brown rice': {'calories': 112, 'protein': 2.6, 'carbs': 24, 'fats': 0.9},
    'egg': {'calories': 78, 'protein': 6, 'carbs': 0.6, 'fats': 5},
    'eggs': {'calories': 156, 'protein': 12, 'carbs': 1.2, 'fats': 10},
    'banana': {'calories': 89, 'protein': 1.1, 'carbs': 23, 'fats': 0.3},
    'apple': {'calories': 52, 'protein': 0.3, 'carbs': 14, 'fats': 0.2},
    'oatmeal': {'calories': 68, 'protein': 2.4, 'carbs': 12, 'fats': 1.4},
    'oats': {'calories': 389, 'protein': 17, 'carbs': 66, 'fats': 7},
    'milk': {'calories': 42, 'protein': 3.4, 'carbs': 5, 'fats': 1},
    'yogurt': {'calories': 59, 'protein': 10, 'carbs': 3.6, 'fats': 0.7},
    'greek yogurt': {'calories': 97, 'protein': 9, 'carbs': 3.6, 'fats': 5},
    'salmon': {'calories': 208, 'protein': 20, 'carbs': 0, 'fats': 13},
    'tuna': {'calories': 132, 'protein': 28, 'carbs': 0, 'fats': 1},
    'beef': {'calories': 250, 'protein': 26, 'carbs': 0, 'fats': 15},
    'paneer': {'calories': 265, 'protein': 18, 'carbs': 1.2, 'fats': 21},
    'tofu': {'calories': 76, 'protein': 8, 'carbs': 1.9, 'fats': 4.8},
    'lentils': {'calories': 116, 'protein': 9, 'carbs': 20, 'fats': 0.4},
    'dal': {'calories': 116, 'protein': 9, 'carbs': 20, 'fats': 0.4},
    'chickpeas': {'calories': 164, 'protein': 9, 'carbs': 27, 'fats': 2.6},
    'broccoli': {'calories': 34, 'protein': 2.8, 'carbs': 7, 'fats': 0.4},
    'spinach': {'calories': 23, 'protein': 2.9, 'carbs': 3.6, 'fats': 0.4},
    'sweet potato': {'calories': 86, 'protein': 1.6, 'carbs': 20, 'fats': 0.1},
    'potato': {'calories': 77, 'protein': 2, 'carbs': 17, 'fats': 0.1},
    'almonds': {'calories': 579, 'protein': 21, 'carbs': 22, 'fats': 50},
    'peanuts': {'calories': 567, 'protein': 26, 'carbs': 16, 'fats': 49},
    'peanut butter': {'calories': 588, 'protein': 25, 'carbs': 20, 'fats': 50},
    'bread': {'calories': 265, 'protein': 9, 'carbs': 49, 'fats': 3.2},
    'pasta': {'calories': 131, 'protein': 5, 'carbs': 25, 'fats': 1.1},
    'whey protein': {'calories': 120, 'protein': 24, 'carbs': 3, 'fats': 1.5},
    'protein shake': {'calories': 150, 'protein': 25, 'carbs': 5, 'fats': 2},
    'avocado': {'calories': 160, 'protein': 2, 'carbs': 9, 'fats': 15},
    'olive oil': {'calories': 884, 'protein': 0, 'carbs': 0, 'fats': 100},
    'coffee': {'calories': 2, 'protein': 0.3, 'carbs': 0, 'fats': 0},
    'green tea': {'calories': 2, 'protein': 0, 'carbs': 0, 'fats': 0},
}


def nutrition_lookup(query: str):
    """
    Look up nutrition info from database or use AI for estimation.
    """
    query_lower = query.lower().strip()

    # Check database first
    for food, nutrition in FOOD_DATABASE.items():
        if food in query_lower or query_lower in food:
            return {
                'food': query.title(),
                'calories': nutrition['calories'],
                'protein': nutrition['protein'],
                'carbs': nutrition['carbs'],
                'fats': nutrition['fats'],
                'source': 'database'
            }

    # Use AI for unknown foods
    prompt = f"""Estimate nutrition for 100g of: {query}
Respond in this exact format (numbers only):
Calories: [number]
Protein: [number]g
Carbs: [number]g
Fats: [number]g"""

    messages = [
        {"role": "system", "content": "You are a nutrition database. Provide accurate estimates."},
        {"role": "user", "content": prompt}
    ]

    response = groq_chat_completion(messages, model="llama-3.1-8b-instant")

    if response:
        try:
            import re
            lines = response.strip().split('\n')
            nutrition = {'calories': 100, 'protein': 5, 'carbs': 10, 'fats': 5}

            for line in lines:
                numbers = re.findall(r'[\d.]+', line)
                if numbers:
                    value = float(numbers[0])
                    line_lower = line.lower()
                    if 'calorie' in line_lower:
                        nutrition['calories'] = int(value)
                    elif 'protein' in line_lower:
                        nutrition['protein'] = round(value, 1)
                    elif 'carb' in line_lower:
                        nutrition['carbs'] = round(value, 1)
                    elif 'fat' in line_lower:
                        nutrition['fats'] = round(value, 1)

            return {
                'food': query.title(),
                'calories': nutrition['calories'],
                'protein': nutrition['protein'],
                'carbs': nutrition['carbs'],
                'fats': nutrition['fats'],
                'source': 'ai_estimate'
            }
        except Exception:
            pass

    # Fallback estimation
    seed = max(len(query), 5)
    return {
        'food': query.title(),
        'calories': 60 * seed,
        'protein': round(seed * 1.8, 1),
        'carbs': round(seed * 2.2, 1),
        'fats': round(seed * 0.9, 1),
        'source': 'estimate'
    }


def workout_recommendation(fatigue: float, streak: int, sleep_hours: float, performance: float):
    """Generate workout recommendation based on user metrics."""
    readiness_score = round((100 - fatigue + performance + min(sleep_hours * 10, 80)) / 3, 2)

    if sleep_hours < 5 or fatigue > 80:
        intensity = 'rest'
        note = 'High fatigue and low sleep detected. Prioritize recovery, mobility, and hydration.'
        exercises = ['Light stretching', 'Foam rolling', 'Walking']
    elif sleep_hours < 7 or performance < 55:
        intensity = 'light'
        note = 'Moderate readiness. Do light cardio and controlled technique work today.'
        exercises = ['Zone 2 cardio (20-30 min)', 'Core work', 'Mobility drills']
    elif streak >= 5 and performance >= 70:
        intensity = 'intense'
        note = 'High readiness and stable streak. Proceed with an intense progressive overload session.'
        exercises = ['Compound lifts', 'Progressive overload', 'HIIT finisher']
    else:
        intensity = 'moderate'
        note = 'Balanced state detected. Perform medium-volume training with attention to form.'
        exercises = ['Strength training', 'Accessory work', 'Steady-state cardio']

    return {
        'intensity': intensity,
        'note': note,
        'readiness_score': readiness_score,
        'suggested_exercises': exercises,
    }


def ai_workout_recommendation(user_profile: dict, recent_metrics: dict):
    """
    Use AI to generate personalized workout plan.
    """
    prompt = f"""Create a personalized workout recommendation for today:

User Profile:
- Goal: {user_profile.get('goal', 'general fitness')}
- Current streak: {recent_metrics.get('streak', 0)} days
- Recent sleep: {recent_metrics.get('sleep_hours', 7)} hours
- Fatigue level: {recent_metrics.get('fatigue', 50)}/100
- Last workout: {recent_metrics.get('last_workout', 'Unknown')}

Provide:
1. Intensity level (rest/light/moderate/intense)
2. Brief workout plan (3-4 exercises)
3. Duration estimate
4. One motivational tip"""

    messages = [
        {"role": "system", "content": "You are an expert fitness coach. Be specific and practical."},
        {"role": "user", "content": prompt}
    ]

    response = groq_chat_completion(messages)

    if response:
        return {
            'ai_recommendation': response,
            'source': 'groq_ai'
        }

    # Fallback to rule-based
    return workout_recommendation(
        recent_metrics.get('fatigue', 50),
        recent_metrics.get('streak', 0),
        recent_metrics.get('sleep_hours', 7),
        recent_metrics.get('performance', 70)
    )


def consistency_feedback(missed_workouts: int, previous_score: int, current_score: int):
    """Generate consistency feedback."""
    improvement = current_score - previous_score
    if improvement >= 0:
        trend_text = f'Your consistency improved by {improvement}%'
    else:
        trend_text = f'Your consistency dropped by {abs(improvement)}%'

    return [
        f'You missed {missed_workouts} workouts this week',
        trend_text,
    ]


def mood_playlist(mood: str):
    """Get workout playlist based on mood/workout type."""
    map_data = {
        'cardio': {
            'provider': 'spotify',
            'playlist_name': 'Cardio Fire Boost',
            'playlist_url': 'https://open.spotify.com/',
        },
        'strength': {
            'provider': 'spotify',
            'playlist_name': 'Heavy Lift Focus',
            'playlist_url': 'https://open.spotify.com/',
        },
        'relax': {
            'provider': 'youtube',
            'playlist_name': 'Recovery Flow',
            'playlist_url': 'https://youtube.com/',
        },
        'hiit': {
            'provider': 'spotify',
            'playlist_name': 'HIIT Beats',
            'playlist_url': 'https://open.spotify.com/',
        },
        'yoga': {
            'provider': 'spotify',
            'playlist_name': 'Yoga & Meditation',
            'playlist_url': 'https://open.spotify.com/',
        },
    }
    return map_data.get(mood.lower(), map_data['cardio'])


def shopping_suggestions(preference: str, goal: str = 'muscle_gain'):
    """Generate shopping suggestions based on diet preference and goal."""
    suggestions_map = {
        'vegetarian': [
            {'title': 'Paneer High-Protein Pack', 'category': 'protein-food', 'external_url': 'https://example.com/paneer'},
            {'title': 'Greek Yogurt Bundle', 'category': 'dairy', 'external_url': 'https://example.com/yogurt'},
            {'title': 'Mixed Nuts Premium', 'category': 'snacks', 'external_url': 'https://example.com/nuts'},
        ],
        'vegan': [
            {'title': 'Plant Protein Powder', 'category': 'supplement', 'external_url': 'https://example.com/plant-protein'},
            {'title': 'Tofu & Tempeh Pack', 'category': 'protein-food', 'external_url': 'https://example.com/tofu'},
            {'title': 'Quinoa & Lentils Bundle', 'category': 'grains', 'external_url': 'https://example.com/quinoa'},
        ],
        'non_veg': [
            {'title': 'Chicken Breast Pack', 'category': 'protein-food', 'external_url': 'https://example.com/chicken'},
            {'title': 'Whey Protein Isolate', 'category': 'supplement', 'external_url': 'https://example.com/whey'},
            {'title': 'Salmon Fillets', 'category': 'protein-food', 'external_url': 'https://example.com/salmon'},
        ],
    }

    base_suggestions = suggestions_map.get(preference.lower(), suggestions_map['non_veg'])

    if goal == 'fat_loss':
        base_suggestions.append({
            'title': 'Fat Burner Stack',
            'category': 'supplement',
            'external_url': 'https://example.com/fat-burner'
        })
    elif goal == 'muscle_gain':
        base_suggestions.append({
            'title': 'Mass Gainer Pro',
            'category': 'supplement',
            'external_url': 'https://example.com/mass-gainer'
        })

    return base_suggestions


def calculate_streak(workout_dates: list) -> int:
    """Calculate current workout streak from dates."""
    from datetime import datetime, timedelta

    if not workout_dates:
        return 0

    sorted_dates = sorted(workout_dates, reverse=True)
    today = datetime.now().date()
    streak = 0

    for i, date in enumerate(sorted_dates):
        if isinstance(date, str):
            date = datetime.fromisoformat(date).date()
        elif hasattr(date, 'date'):
            date = date.date()

        expected_date = today - timedelta(days=i)
        if date == expected_date:
            streak += 1
        elif date == expected_date - timedelta(days=1) and i == 0:
            # Yesterday counts as continuing streak
            streak += 1
        else:
            break

    return streak


def calculate_weekly_stats(workouts: list, nutrition_logs: list, sleep_logs: list) -> dict:
    """Calculate weekly statistics from logs."""
    from datetime import datetime, timedelta

    week_ago = datetime.now() - timedelta(days=7)

    total_calories_burned = sum(w.calories_burned for w in workouts if w.created_at >= week_ago)
    total_workouts = len([w for w in workouts if w.created_at >= week_ago])

    total_protein = sum(n.protein for n in nutrition_logs if n.created_at >= week_ago)
    total_food_calories = sum(n.calories for n in nutrition_logs if n.created_at >= week_ago)

    sleep_data = [s.hours for s in sleep_logs if s.created_at >= week_ago]
    avg_sleep = round(sum(sleep_data) / len(sleep_data), 1) if sleep_data else 0

    return {
        'total_workouts': total_workouts,
        'total_calories_burned': total_calories_burned,
        'total_protein': round(total_protein, 1),
        'total_food_calories': total_food_calories,
        'avg_sleep': avg_sleep,
        'workout_days': total_workouts,
    }


def fastapi_post(path: str, payload: dict):
    """Make POST request to FastAPI service."""
    base_url = os.getenv('FASTAPI_SERVICE_URL', 'http://localhost:9000')
    url = f'{base_url}{path}'
    body = json.dumps(payload).encode('utf-8')
    request = Request(url=url, data=body, headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urlopen(request, timeout=4) as response:
            return json.loads(response.read().decode('utf-8'))
    except (URLError, TimeoutError, json.JSONDecodeError):
        return None
