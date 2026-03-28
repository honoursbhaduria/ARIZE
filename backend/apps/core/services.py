import hashlib
import json
import os
import base64
import re
import ssl
from urllib.request import Request, urlopen
from urllib.error import URLError

import certifi

from groq import Groq


try:
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_groq import ChatGroq
    LANGCHAIN_AVAILABLE = True
except Exception:
    ChatPromptTemplate = None
    ChatGroq = None
    LANGCHAIN_AVAILABLE = False

try:
    from langgraph.graph import StateGraph, END
    LANGGRAPH_AVAILABLE = True
except Exception:
    StateGraph = None
    END = None
    LANGGRAPH_AVAILABLE = False

try:
    import gymnasium as gym
    from gymnasium import spaces
    GYMNASIUM_AVAILABLE = True
except Exception:
    gym = None
    spaces = None
    GYMNASIUM_AVAILABLE = False


def get_groq_client():
    """Get Groq client, dynamically checking .env to avoid requiring a server restart."""
    from django.conf import settings
    from dotenv import dotenv_values
    import os
    
    api_key = getattr(settings, 'GROQ_API_KEY', '')
    
    # If empty or stale, check .env directly
    if not api_key:
        try:
            env_vars = dotenv_values(settings.BASE_DIR / '.env')
            api_key = env_vars.get('GROQ_API_KEY', '')
        except Exception:
            pass
            
    if not api_key:
        api_key = os.getenv('GROQ_API_KEY', '')

    if api_key:
        return Groq(api_key=api_key)
    return None



def pseudo_embedding(text: str):
    """Generate pseudo-embedding for RAG memory."""
    digest = hashlib.sha256(text.encode('utf-8')).digest()
    return [round(byte / 255, 4) for byte in digest[:16]]


def cosine_similarity(vec_a: list, vec_b: list) -> float:
    """Compute cosine similarity between two vectors."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot = sum(float(a) * float(b) for a, b in zip(vec_a, vec_b))
    mag_a = sum(float(a) * float(a) for a in vec_a) ** 0.5
    mag_b = sum(float(b) * float(b) for b in vec_b) ** 0.5
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def retrieve_chat_memory_context(user, message: str, top_k: int = 4) -> str:
    """Retrieve relevant past chat snippets from vectorized RAG memory."""
    if not user or not getattr(user, 'is_authenticated', False) or not message:
        return ''

    try:
        from .models import RAGMemoryEntry

        query_vec = pseudo_embedding(message)
        candidates = list(
            RAGMemoryEntry.objects.filter(user=user, source_type='chat').order_by('-created_at')[:60]
        )

        scored = []
        for entry in candidates:
            score = cosine_similarity(query_vec, entry.embedding_preview or [])
            if score > 0.15:
                scored.append((score, entry.content.strip()))

        if not scored:
            return ''

        scored.sort(key=lambda item: item[0], reverse=True)
        lines = []
        for _, content in scored[:top_k]:
            if content:
                lines.append(f"- {content[:220]}")
        return '\n'.join(lines)
    except Exception as error:
        print(f"Chat memory retrieval error: {error}")
        return ''


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
    Use Groq Vision API to recognize food from image and extract nutrition info.

    Args:
        image_data: Base64 encoded image string (data URI or plain base64)

    Returns:
        dict with food, calories, protein, carbs, fats
    """
    client = get_groq_client()
    if not client:
        return None

    try:
        # Ensure we have a proper data URI for the Groq multimodal API
        if image_data.startswith('data:') and ',' in image_data:
            data_uri = image_data  # already a full data URI
        else:
            data_uri = f'data:image/jpeg;base64,{image_data}'

        prompt_text = (
            'Identify the main food item in this image and estimate nutrition per 100g. '
            'Return ONLY valid JSON with this exact shape: '
            '{"food":"string","calories":number,"protein":number,"carbs":number,"fats":number}. '
            'No markdown. No additional text.'
        )

        # Try vision-capable Groq models in order of preference
        vision_models = [
            'llama-3.2-90b-vision-preview',
            'llama-3.2-11b-vision-preview',
        ]

        for model_name in vision_models:
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {
                            'role': 'user',
                            'content': [
                                {'type': 'text', 'text': prompt_text},
                                {'type': 'image_url', 'image_url': {'url': data_uri}},
                            ],
                        }
                    ],
                    temperature=0.2,
                    max_tokens=256,
                )
                raw = response.choices[0].message.content or ''
                parsed = _parse_groq_nutrition_response(raw)
                if parsed:
                    return parsed
            except Exception as model_error:
                print(f'Groq vision model {model_name} failed: {model_error}')
                continue

        # If all vision models fail, fall back to text-based lookup
        print('All Groq vision models failed, using text nutrition lookup')
        return None

    except Exception as e:
        print(f'Groq food recognition error: {e}')
        return None


def _parse_groq_nutrition_response(response_text: str):
    """Parse Groq AI response to extract nutrition data."""
    try:
        # 1) Try direct JSON parse first (most common with strict prompt)
        clean = re.sub(r'```(?:json)?', '', response_text).strip().strip('`')
        parsed = _parse_shopping_json(clean)
        if parsed and isinstance(parsed, dict) and parsed.get('calories'):
            food = str(parsed.get('food', 'Food Item')).strip() or 'Food Item'
            calories = int(float(parsed.get('calories', 100)))
            protein = round(float(parsed.get('protein', 5)), 1)
            carbs = round(float(parsed.get('carbs', 10)), 1)
            fats = round(float(parsed.get('fats', 5)), 1)
            if calories > 0:
                return {
                    'food': food,
                    'calories': calories,
                    'protein': max(protein, 0),
                    'carbs': max(carbs, 0),
                    'fats': max(fats, 0),
                    'source': 'groq_vision'
                }

        # 2) Line-by-line fallback parsing
        lines = response_text.strip().split('\n')
        nutrition = {'food': 'Food Item', 'calories': 100, 'protein': 5, 'carbs': 10, 'fats': 5}
        for line in lines:
            line_lower = line.lower()
            numbers = re.findall(r'[\d.]+', line)
            if numbers:
                value = float(numbers[0])
                if 'food' in line_lower and ':' in line:
                    nutrition['food'] = line.split(':')[-1].strip()
                elif 'calorie' in line_lower:
                    nutrition['calories'] = int(value)
                elif 'protein' in line_lower:
                    nutrition['protein'] = round(value, 1)
                elif 'carb' in line_lower:
                    nutrition['carbs'] = round(value, 1)
                elif 'fat' in line_lower:
                    nutrition['fats'] = round(value, 1)

        return {**nutrition, 'source': 'groq_vision'}
    except Exception as e:
        print(f'Groq nutrition parse error: {e}')
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
        if user_profile.get('age'):
            context_parts.append(f"Age: {user_profile['age']} years")
        if user_profile.get('bmi'):
            bmi = user_profile['bmi']
            if bmi < 18.5:
                cat = 'Underweight'
            elif bmi < 25:
                cat = 'Normal'
            elif bmi < 30:
                cat = 'Overweight'
            else:
                cat = 'Obese'
            context_parts.append(f"BMI: {bmi} ({cat})")

    if recent_data:
        if recent_data.get('recent_workouts'):
            context_parts.append(f"Recent Workouts: {recent_data['recent_workouts']}")
        if recent_data.get('avg_calories'):
            context_parts.append(f"Avg Daily Calories Burned: {recent_data['avg_calories']}")
        if recent_data.get('avg_sleep'):
            context_parts.append(f"Avg Sleep: {recent_data['avg_sleep']} hours")
        if recent_data.get('memory_context'):
            context_parts.append(f"Relevant Past Conversation:\n{recent_data['memory_context']}")

    return "\n".join(context_parts)



def _is_langgraph_enabled() -> bool:
    value = str(os.getenv('LANGGRAPH_ENABLED', '1')).strip().lower()
    return LANGGRAPH_AVAILABLE and value in {'1', 'true', 'yes', 'on'}


def _chat_fallback_answer(message: str, context: dict):
    """Rule-based fallback for chat when model generation fails."""
    message_lower = (message or '').lower()
    if 'not improving' in message_lower:
        return 'Your recent pattern shows low protein intake and inconsistent workout frequency. Increase daily protein and keep a 4-day minimum workout rhythm.'

    if 'what should i do today' in message_lower:
        return 'Based on your fatigue and sleep trend, do a light recovery workout: 25 minutes mobility + 20 minutes zone-2 cardio.'

    return f"Personalized recommendation: focus on {context.get('goal', 'maintenance')} with balanced macros and progressive overload."


def _langgraph_chat_answer(message: str, context: dict, messages: list):
    """
    LangGraph flow for chat generation with retry and deterministic fallback.
    Returns generated string or None when graph is disabled/unavailable.
    """
    if not _is_langgraph_enabled():
        return None

    state_graph = StateGraph(dict)

    def node_primary(state):
        text = groq_chat_completion(state['messages'], model=os.getenv('LANGGRAPH_CHAT_PRIMARY_MODEL', 'llama-3.3-70b-versatile'))
        state['response'] = text or ''
        return state

    def node_secondary(state):
        text = groq_chat_completion(state['messages'], model=os.getenv('LANGGRAPH_CHAT_RETRY_MODEL', 'llama-3.1-8b-instant'))
        state['response'] = text or ''
        return state

    def node_fallback(state):
        state['response'] = _chat_fallback_answer(state['message'], state['context'])
        return state

    def route_primary(state):
        return 'done' if state.get('response') else 'retry'

    def route_secondary(state):
        return 'done' if state.get('response') else 'fallback'

    state_graph.add_node('primary', node_primary)
    state_graph.add_node('secondary', node_secondary)
    state_graph.add_node('fallback', node_fallback)
    state_graph.set_entry_point('primary')
    state_graph.add_conditional_edges('primary', route_primary, {'done': END, 'retry': 'secondary'})
    state_graph.add_conditional_edges('secondary', route_secondary, {'done': END, 'fallback': 'fallback'})
    state_graph.add_edge('fallback', END)

    app = state_graph.compile()
    result = app.invoke({'message': message, 'context': context, 'messages': messages, 'response': ''})
    response = (result or {}).get('response')
    return response or None


def _langgraph_recommendation_text(user_profile: dict, recent_metrics: dict, messages: list):
    """
    LangGraph flow for recommendation text generation with retry.
    Returns AI text or None.
    """
    if not _is_langgraph_enabled():
        return None

    state_graph = StateGraph(dict)

    def node_primary(state):
        text = groq_chat_completion(state['messages'], model=os.getenv('LANGGRAPH_RECO_PRIMARY_MODEL', 'llama-3.3-70b-versatile'))
        state['ai_text'] = text or ''
        return state

    def node_secondary(state):
        text = groq_chat_completion(state['messages'], model=os.getenv('LANGGRAPH_RECO_RETRY_MODEL', 'llama-3.1-8b-instant'))
        state['ai_text'] = text or ''
        return state

    def route_primary(state):
        return 'done' if state.get('ai_text') else 'retry'

    def route_secondary(state):
        return 'done' if state.get('ai_text') else 'end'

    state_graph.add_node('primary', node_primary)
    state_graph.add_node('secondary', node_secondary)
    state_graph.set_entry_point('primary')
    state_graph.add_conditional_edges('primary', route_primary, {'done': END, 'retry': 'secondary'})
    state_graph.add_conditional_edges('secondary', route_secondary, {'done': END, 'end': END})

    app = state_graph.compile()
    result = app.invoke(
        {
            'messages': messages,
            'user_profile': user_profile,
            'recent_metrics': recent_metrics,
            'ai_text': '',
        }
    )
    text = (result or {}).get('ai_text')
    return text or None


def build_rag_response(message: str, context: dict):
    """
    Build AI response using Groq API with user context.
    Acts as a personal doctor + fitness coach.
    Falls back to rule-based response if API unavailable.
    """
    system_prompt = """You are ARIZE AI — an expert personal fitness coach AND certified medical doctor.
You provide personalized, actionable advice based on the user's health data, goals, diet preferences, medical history, and recent activity.
When the user has medical data, prioritize it in your response and give doctor-level insight.
Keep responses concise (2-4 sentences), friendly, and motivating.
Focus on practical advice they can act on today.
If asked about medications, symptoms, or diagnoses, respond helpfully but always recommend consulting a physician for serious concerns."""

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

    response = _langgraph_chat_answer(message, context, messages) or groq_chat_completion(messages)

    if response:
        return {
            'answer': response,
            'embedding_preview': pseudo_embedding(message),
            'source': 'groq_ai',
        }

    return {
        'answer': _chat_fallback_answer(message, context),
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

    # Ask Groq for calories-first result if available.
    calorie_only = groq_calorie_lookup(query)
    if calorie_only:
        return calorie_only

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


def groq_calorie_lookup(query: str):
    """
    Ask Groq for calories and macros (per 100g).
    Returns a full nutrition shape with estimated amounts.
    """
    if not query or not query.strip():
        return None

    messages = [
        {
            "role": "system",
            "content": (
                "You are a nutrition API. Return ONLY a valid JSON object with this shape: "
                '{"calories": number, "protein": number, "carbs": number, "fats": number}. '
                "Use values per 100g. Do not add any conversational text."
            ),
        },
        {
            "role": "user",
            "content": f"Food item: {query}",
        },
    ]

    response = groq_chat_completion(messages, model="llama-3.1-8b-instant")
    if not response:
        return None

    calories, protein, carbs, fats = 0, 0, 0, 0
    payload = None

    try:
        payload = json.loads(response)
    except Exception:
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            try:
                payload = json.loads(json_match.group(0))
            except Exception:
                pass

    if isinstance(payload, dict):
        calories = int(float(payload.get('calories', 0)))
        protein = round(float(payload.get('protein', 0)), 1)
        carbs = round(float(payload.get('carbs', 0)), 1)
        fats = round(float(payload.get('fats', 0)), 1)
    else:
        # Absolute fallback: just extract the first number as calories
        number_match = re.search(r'(\d+(?:\.\d+)?)', response)
        if not number_match:
            return None
        calories = int(float(number_match.group(1)))

    if calories <= 0:
        return None

    return {
        'food': query.title(),
        'calories': calories,
        'protein': protein,
        'carbs': carbs,
        'fats': fats,
        'source': 'groq_macros'
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


def gymnasium_workout_analysis(recent_metrics: dict):
    """
    Use Gymnasium environment scoring to analyze best training intensity.
    Returns None when Gymnasium is unavailable or disabled.
    """
    enabled = str(os.getenv('GYMNASIUM_ANALYSIS_ENABLED', '1')).strip().lower() in {'1', 'true', 'yes', 'on'}
    if not enabled or not GYMNASIUM_AVAILABLE:
        return None

    class WorkoutReadinessEnv(gym.Env):
        metadata = {'render_modes': []}

        def __init__(self, metrics):
            super().__init__()
            self.metrics = metrics
            self.action_space = spaces.Discrete(4)  # 0 rest, 1 light, 2 moderate, 3 intense
            self.observation_space = spaces.Box(low=0.0, high=1.0, shape=(4,), dtype=float)

        def _obs(self):
            fatigue = max(0.0, min(float(self.metrics.get('fatigue', 50)) / 100.0, 1.0))
            sleep_hours = max(0.0, min(float(self.metrics.get('sleep_hours', 7)) / 10.0, 1.0))
            performance = max(0.0, min(float(self.metrics.get('performance', 70)) / 100.0, 1.0))
            streak = max(0.0, min(float(self.metrics.get('streak', 0)) / 14.0, 1.0))
            return [fatigue, sleep_hours, performance, streak]

        def reset(self, seed=None, options=None):
            super().reset(seed=seed)
            return self._obs(), {}

        def step(self, action):
            fatigue, sleep, performance, streak = self._obs()
            readiness = (1.0 - fatigue) * 0.4 + sleep * 0.25 + performance * 0.25 + streak * 0.1

            # Target intensity by readiness band.
            if readiness < 0.35:
                target = 0
            elif readiness < 0.55:
                target = 1
            elif readiness < 0.78:
                target = 2
            else:
                target = 3

            reward = 1.0 - (abs(action - target) * 0.35)

            # Penalize pushing too hard when sleep is low or fatigue is high.
            if action >= 2 and (sleep < 0.55 or fatigue > 0.65):
                reward -= 0.25

            reward = round(max(-1.0, min(1.0, reward)), 4)
            terminated = True
            truncated = False
            info = {'readiness': round(readiness * 100, 2), 'target_action': target}
            return self._obs(), reward, terminated, truncated, info

    try:
        metrics = {
            'fatigue': recent_metrics.get('fatigue', 50),
            'sleep_hours': recent_metrics.get('sleep_hours', 7),
            'performance': recent_metrics.get('performance', 70),
            'streak': recent_metrics.get('streak', 0),
        }

        env = WorkoutReadinessEnv(metrics)
        action_to_mode = {0: 'rest', 1: 'light', 2: 'moderate', 3: 'intense'}
        action_rewards = {}
        readiness_score = 70.0

        for action in range(4):
            env.reset()
            _, reward, _, _, info = env.step(action)
            action_rewards[action_to_mode[action]] = reward
            readiness_score = info.get('readiness', readiness_score)

        best_mode = max(action_rewards, key=action_rewards.get)
        confidence = round((max(action_rewards.values()) + 1.0) * 50.0, 2)

        return {
            'best_mode': best_mode,
            'confidence': confidence,
            'readiness_score': readiness_score,
            'action_rewards': action_rewards,
            'source': 'gymnasium_simulation',
        }
    except Exception as error:
        print(f'Gymnasium workout analysis error: {error}')
        return None


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

    # LangGraph primary path for stable recommendation generation; direct Groq as fallback.
    response = _langgraph_recommendation_text(user_profile, recent_metrics, messages) or groq_chat_completion(messages)

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
    def get_youtube_api_keys():
        keys = [
            os.getenv('YOUTUBE_API_KEY', '').strip(),
            os.getenv('YOUTUBE_DATA_API_KEY', '').strip(),
            os.getenv('YOUTUBE_API_KEY_BACKUP', '').strip(),
            # User-provided backup key, used only if primary keys fail/exhaust.
            'AIzaSyClasOt0JOTrL-K656j2nARcOXWa1f4jO4',
        ]

        unique = []
        for key in keys:
            if key and key not in unique:
                unique.append(key)
        return unique

    def youtube_playlist_for_mood(target_mood: str):
        api_keys = get_youtube_api_keys()
        if not api_keys:
            return None

        mood_queries = {
            'cardio': 'cardio workout mix high energy gym music',
            'strength': 'strength training gym playlist heavy lifting',
            'hiit': 'hiit workout music interval training playlist',
            'relax': 'post workout recovery chill ambient playlist',
            'yoga': 'yoga flow meditation music playlist',
        }
        energy_by_mood = {
            'cardio': 'high',
            'strength': 'high',
            'hiit': 'very-high',
            'relax': 'low',
            'yoga': 'calm',
        }

        mood_key = (target_mood or 'cardio').lower()

        import urllib.parse

        for api_key in api_keys:
            try:
                params = {
                    'part': 'snippet',
                    'type': 'playlist',
                    'maxResults': 5,
                    'q': mood_queries.get(mood_key, mood_queries['cardio']),
                    'key': api_key,
                }

                query = urllib.parse.urlencode(params)
                url = f'https://www.googleapis.com/youtube/v3/search?{query}'
                req = Request(url=url, headers={'User-Agent': 'BeastTrack/1.0'})

                with _open_url_with_ssl(req, timeout=6) as response:
                    payload = json.loads(response.read().decode('utf-8'))

                items = payload.get('items') or []
                for item in items:
                    playlist_id = ((item.get('id') or {}).get('playlistId') or '').strip()
                    snippet = item.get('snippet') or {}
                    title = (snippet.get('title') or '').strip()
                    description = (snippet.get('description') or '').strip()

                    if playlist_id and title:
                        return {
                            'provider': 'youtube',
                            'playlist_name': title,
                            'playlist_url': f'https://music.youtube.com/playlist?list={playlist_id}',
                            'embed_url': f'https://www.youtube.com/embed/videoseries?list={playlist_id}',
                            'description': description[:180] if description else f'{mood_key.title()} playlist tuned for training sessions.',
                            'energy_level': energy_by_mood.get(mood_key, 'high'),
                        }
            except Exception as exc:
                print(f'YouTube music lookup error (key retry): {exc}')

        return None

    map_data = {
        'cardio': {
            'provider': 'youtube',
            'playlist_name': 'Cardio Pulse Mix',
            'playlist_url': 'https://www.youtube.com/playlist?list=PLu0ocO48LFms5WsI1ipaeanxqRjn2fC_5',
            'embed_url': 'https://www.youtube.com/embed/videoseries?list=PLu0ocO48LFms5WsI1ipaeanxqRjn2fC_5',
            'description': 'High-tempo tracks for endurance and steady-state cardio sessions.',
            'energy_level': 'high',
        },
        'strength': {
            'provider': 'youtube',
            'playlist_name': 'Heavy Lift Drive',
            'playlist_url': 'https://www.youtube.com/playlist?list=PLqrHHabBzX0nY0NU5xFJ6NDYR1R-jopi0',
            'embed_url': 'https://www.youtube.com/embed/videoseries?list=PLqrHHabBzX0nY0NU5xFJ6NDYR1R-jopi0',
            'description': 'Hard-hitting beats to support compound lifts and max-effort sets.',
            'energy_level': 'high',
        },
        'relax': {
            'provider': 'youtube',
            'playlist_name': 'Recovery Flow',
            'playlist_url': 'https://www.youtube.com/playlist?list=PL3H_P0TG49KmeDNFPPQ04byHCJwxCBpAS',
            'embed_url': 'https://www.youtube.com/embed/videoseries?list=PL3H_P0TG49KmeDNFPPQ04byHCJwxCBpAS',
            'description': 'Low-intensity chill playlist for cooldown and active recovery.',
            'energy_level': 'low',
        },
        'hiit': {
            'provider': 'youtube',
            'playlist_name': 'HIIT Beats',
            'playlist_url': 'https://www.youtube.com/playlist?list=PLvUrtI1UFRjHHdov8w04I3jiZEm4ZEUDd',
            'embed_url': 'https://www.youtube.com/embed/videoseries?list=PLvUrtI1UFRjHHdov8w04I3jiZEm4ZEUDd',
            'description': 'Explosive rhythm and fast transitions for interval blocks.',
            'energy_level': 'very-high',
        },
        'yoga': {
            'provider': 'youtube',
            'playlist_name': 'Yoga & Meditation',
            'playlist_url': 'https://www.youtube.com/playlist?list=PLebmlkujEtcw-K354Ye5QxpQRbp08UntX',
            'embed_url': 'https://www.youtube.com/embed/videoseries?list=PLebmlkujEtcw-K354Ye5QxpQRbp08UntX',
            'description': 'Breath-focused ambient and acoustic sound for mindful sessions.',
            'energy_level': 'calm',
        },
    }
    youtube_result = youtube_playlist_for_mood(mood)
    if youtube_result:
        return youtube_result

    return map_data.get(mood.lower(), map_data['cardio'])


def search_wikipedia_products(product_name: str, limit: int = 5):
    """
    Search Wikipedia for health/nutrition products with images and info.

    Args:
        product_name: Name of the product to search (e.g., 'chicken', 'protein', 'vitamin')
        limit: Number of results to return

    Returns:
        List of products with name, image, description, and Wikipedia URL
    """
    try:
        import urllib.request
        import json

        # Wikipedia API endpoint
        api_url = "https://en.wikipedia.org/w/api.php"

        params = {
            'action': 'query',
            'list': 'search',
            'srsearch': product_name,
            'srprop': 'snippet|titlesnippet',
            'srlimit': limit,
            'format': 'json'
        }

        # Build query string safely with URL encoding
        import urllib.parse
        query_str = urllib.parse.urlencode(params)
        url = f"{api_url}?{query_str}"

        # Make request
        req = urllib.request.Request(url, headers={'User-Agent': 'BeastTrack/1.0'})
        with _open_url_with_ssl(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))

        products = []
        for result in data.get('query', {}).get('search', [])[:limit]:
            product_title = result['title']
            product_snippet = result['snippet'].replace('<span class="searchmatch">', '').replace('</span>', '')[:200]

            # Get page details including image
            page_data = get_wikipedia_page_details(product_title)
            if page_data:
                products.append({
                    'title': product_title,
                    'description': product_snippet,
                    'image_url': page_data.get('image'),
                    'wiki_url': page_data.get('url'),
                    'extract': page_data.get('extract', '')[:300]
                })

        return products

    except Exception as e:
        print(f"Wikipedia search error: {e}")
        return []


def get_wikipedia_page_details(page_title: str):
    """
    Get detailed information about a Wikipedia page including image and extract.

    Args:
        page_title: Title of Wikipedia page

    Returns:
        Dictionary with page details (image, URL, extract)
    """
    try:
        import urllib.request
        import json
        import re

        api_url = "https://en.wikipedia.org/w/api.php"

        params = {
            'action': 'query',
            'titles': page_title,
            'prop': 'pageimages|extracts|info',
            'pithumbsize': '300',
            'explaintext': True,
            'redirects': 1,
            'format': 'json'
        }

        import urllib.parse
        query_str = urllib.parse.urlencode(params)
        url = f"{api_url}?{query_str}"

        req = urllib.request.Request(url, headers={'User-Agent': 'BeastTrack/1.0'})
        with _open_url_with_ssl(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))

        pages = data.get('query', {}).get('pages', {})
        if not pages:
            return None

        page_id = list(pages.keys())[0]
        page = pages[page_id]

        if page_id == '-1':  # Page not found
            return None

        return {
            'url': f"https://en.wikipedia.org/wiki/{page.get('title', '').replace(' ', '_')}",
            'image': page.get('thumbnail', {}).get('source'),
            'extract': page.get('extract', ''),
            'title': page.get('title')
        }

    except Exception as e:
        print(f"Wikipedia page details error: {e}")
        return None


def generate_shopping_links(product_name: str):
    """
    Generate shopping links for a product from various e-commerce sites.

    Args:
        product_name: Name of the product

    Returns:
        Dictionary with shopping links
    """
    # URL encode product name
    import urllib.parse
    encoded = urllib.parse.quote(product_name)

    shopping_links = {
        'amazon': f"https://www.amazon.in/s?k={encoded}",
        'flipkart': f"https://www.flipkart.com/search?q={encoded}",
        'healthkart': f"https://www.healthkart.com/search?query={encoded}",
        '1mg': f"https://www.1mg.com/search?query={encoded}"
    }

    return shopping_links


def shopping_suggestions(preference: str, goal: str = 'muscle_gain'):
    """Generate shopping suggestions based on diet preference and goal using Wikipedia."""
    # Define product searches based on preference
    search_queries = {
        'vegetarian': ['paneer', 'tofu', 'lentils', 'yogurt', 'chickpeas'],
        'vegan': ['tofu', 'tempeh', 'lentils', 'quinoa', 'protein powder'],
        'non_veg': ['chicken', 'salmon', 'eggs', 'beef', 'milk']
    }

    goal_supplements = {
        'muscle_gain': ['whey protein', 'creatine', 'bcaa'],
        'fat_loss': ['green tea', 'caffeine', 'metabolism'],
        'maintenance': ['multivitamin', 'vitamin d', 'calcium']
    }

    queries = search_queries.get(preference.lower(), search_queries['non_veg'])

    suggestions = []

    # Search for main diet products
    for query in queries[:3]:  # Limit to top 3
        products = search_wikipedia_products(query, limit=1)
        if products:
            product = products[0]
            shopping_links = generate_shopping_links(product['title'])
            suggestions.append({
                'title': product['title'],
                'category': 'food',
                'description': product['description'],
                'image_url': product['image_url'],
                'wiki_url': product['wiki_url'],
                'shopping_links': shopping_links,
                'source': 'wikipedia'
            })

    # Add goal-based supplements
    goal_queries = goal_supplements.get(goal, goal_supplements['maintenance'])
    for query in goal_queries[:1]:  # Add one supplement
        products = search_wikipedia_products(query, limit=1)
        if products:
            product = products[0]
            shopping_links = generate_shopping_links(product['title'])
            suggestions.append({
                'title': product['title'],
                'category': 'supplement',
                'description': product['description'],
                'image_url': product['image_url'],
                'wiki_url': product['wiki_url'],
                'shopping_links': shopping_links,
                'source': 'wikipedia'
            })

    # Fallback to hardcoded suggestions if Wikipedia fails
    if not suggestions:
        fallback_map = {
            'vegetarian': [
                {'title': 'Paneer', 'category': 'protein-food', 'image_url': None, 'shopping_links': generate_shopping_links('paneer')},
                {'title': 'Yogurt', 'category': 'dairy', 'image_url': None, 'shopping_links': generate_shopping_links('yogurt')},
            ],
            'vegan': [
                {'title': 'Tofu', 'category': 'protein-food', 'image_url': None, 'shopping_links': generate_shopping_links('tofu')},
                {'title': 'Lentils', 'category': 'grains', 'image_url': None, 'shopping_links': generate_shopping_links('lentils')},
            ],
            'non_veg': [
                {'title': 'Chicken Breast', 'category': 'protein-food', 'image_url': None, 'shopping_links': generate_shopping_links('chicken breast')},
                {'title': 'Salmon', 'category': 'protein-food', 'image_url': None, 'shopping_links': generate_shopping_links('salmon')},
            ]
        }
        suggestions = fallback_map.get(preference.lower(), fallback_map['non_veg'])

    return suggestions


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


def langchain_shopping_intent(user_message: str, profile_context: str = ''):
    """
    Use LangChain + ChatGroq to extract shopping intent and search queries.
    Returns dict in strict JSON shape or None.
    """
    if not LANGCHAIN_AVAILABLE:
        return None

    api_key = os.getenv('GROQ_API_KEY', '')
    if not api_key:
        return None

    try:
        model_name = os.getenv('LANGCHAIN_SHOPPING_MODEL', 'llama-3.3-70b-versatile')
        llm = ChatGroq(
            groq_api_key=api_key,
            model_name=model_name,
            temperature=0.2,
        )

        prompt = ChatPromptTemplate.from_messages([
            (
                'system',
                """You are a shopping assistant for fitness and nutrition products.
Analyze the user message and return ONLY valid JSON with this exact shape:
{
  "understanding": "brief description",
  "search_queries": ["query1", "query2", "query3"],
  "response": "short helpful response"
}
Keep search_queries concise and practical for Wikipedia product search.""",
            ),
            (
                'human',
                "User profile context: {profile_context}\nUser message: {user_message}",
            ),
        ])

        chain = prompt | llm
        llm_result = chain.invoke(
            {
                'profile_context': profile_context or 'No profile context available',
                'user_message': user_message,
            }
        )

        raw_text = getattr(llm_result, 'content', str(llm_result))
        parsed = _parse_shopping_json(raw_text)
        if not parsed:
            return None

        queries = parsed.get('search_queries', [])
        if not isinstance(queries, list):
            parsed['search_queries'] = []

        return parsed
    except Exception as error:
        print(f"LangChain shopping intent error: {error}")
        return None


def ai_shopping_chat(user_message: str, user_profile: dict = None) -> dict:
    """
    AI Shopping Chat that understands user needs and searches Wikipedia for products.
    Uses Groq to interpret user request and find relevant products.
    """
    if not user_profile:
        user_profile = {}

    # Build context from user profile
    profile_context = ""
    fitness_goal = user_profile.get('fitness_goal') or user_profile.get('goal')
    dietary_preference = user_profile.get('dietary_preference') or user_profile.get('diet_type')
    if fitness_goal:
        profile_context += f"User's fitness goal: {fitness_goal}. "
    if dietary_preference:
        profile_context += f"User's dietary preference: {dietary_preference}. "

    # Use Groq to understand the user's request and suggest search queries
    system_prompt = """You are a helpful shopping assistant AI. Your job is to:
1. Understand what the user is looking for
2. Suggest 2-3 Wikipedia search queries to find relevant health/nutrition products
3. Extract key product categories from their request

Respond in this exact JSON format:
{
  "understanding": "brief description of what user wants",
  "search_queries": ["query1", "query2"],
  "response": "friendly response to user"
}"""

    messages = [
        {
            "role": "system",
            "content": system_prompt + "\n" + profile_context
        },
        {
            "role": "user",
            "content": user_message
        }
    ]

    try:
        # Primary path: LangChain orchestration for scalable prompt/runtime composition.
        response_data = langchain_shopping_intent(user_message, profile_context)

        # Fallback path: existing direct Groq call if LangChain is unavailable or fails.
        if not response_data:
            groq_response = groq_chat_completion(messages)
            response_data = _parse_shopping_json(groq_response or "") if groq_response else None

        search_queries = []
        ai_message = "Found some products for your request."
        understanding = ""

        if response_data:
            ai_message = response_data.get('response', ai_message)
            understanding = response_data.get('understanding', '')
            search_queries = [q for q in response_data.get('search_queries', []) if q and q.strip()]

        # If Groq response is non-JSON or empty, still infer useful queries.
        if not search_queries:
            keyword_queries = _fallback_shopping_queries(user_message)
            search_queries = [q for q in keyword_queries if q and q.strip()]

        # Last-resort fallback to user message as a direct query.
        if not search_queries:
            search_queries = [user_message.strip()]

        all_products = []
        seen_titles = set()

        for query in search_queries[:3]:
            products = search_wikipedia_products(query, limit=3)
            for product in products:
                title_key = (product.get('title') or '').strip().lower()
                if title_key and title_key in seen_titles:
                    continue
                if title_key:
                    seen_titles.add(title_key)
                product['shopping_links'] = generate_shopping_links(product.get('title', ''))
                all_products.append(product)

        if not all_products:
            # Gemini fallback: expand/repair queries, then retry Wikipedia.
            gemini_queries = gemini_shopping_fallback_queries(user_message, user_profile)
            if gemini_queries:
                for query in gemini_queries[:3]:
                    products = search_wikipedia_products(query, limit=3)
                    for product in products:
                        title_key = (product.get('title') or '').strip().lower()
                        if title_key and title_key in seen_titles:
                            continue
                        if title_key:
                            seen_titles.add(title_key)
                        product['shopping_links'] = generate_shopping_links(product.get('title', ''))
                        all_products.append(product)

        if not all_products:
            return {
                "ai_message": "I could not find matching products right now. Try a simpler request like 'protein snacks' or 'vegan supplements'.",
                "products": [],
                "understanding": understanding,
            }

        return {
            "ai_message": ai_message,
            "products": all_products[:8],
            "understanding": understanding,
        }
    except Exception as e:
        print(f"Shopping AI error: {e}")
        return {"error": "Failed to process your request"}


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


def _open_url_with_ssl(request_obj, timeout: int = 5):
    """Open URL with certifi CA bundle, then fallback to default context if needed."""
    try:
        secure_context = ssl.create_default_context(cafile=certifi.where())
        return urlopen(request_obj, timeout=timeout, context=secure_context)
    except Exception as primary_error:
        try:
            # Fallback for environments with unusual Python SSL setup.
            return urlopen(request_obj, timeout=timeout)
        except Exception:
            raise primary_error


def groq_shopping_fallback_queries(user_message: str, user_profile: dict = None):
    """
    Use Groq to produce alternative shopping search queries when initial search fails.
    Returns a list of concise queries suitable for Wikipedia search.
    """
    goal = ''
    diet = ''
    if user_profile:
        goal = user_profile.get('goal') or user_profile.get('fitness_goal') or ''
        diet = user_profile.get('diet_type') or user_profile.get('dietary_preference') or ''

    messages = [
        {
            'role': 'system',
            'content': (
                'You are a shopping query assistant. Convert the user request into 3 short product search queries for Wikipedia. '
                'Return ONLY a JSON object: {"queries": ["query1", "query2", "query3"]}. No extra text.'
            ),
        },
        {
            'role': 'user',
            'content': (
                f'User request: {user_message}\n'
                f'Goal: {goal or "not provided"}\n'
                f'Diet: {diet or "not provided"}\n'
                'Example: {"queries": ["diet soda", "cola", "low-calorie beverage"]}'
            ),
        },
    ]

    raw = groq_chat_completion(messages, model='llama-3.1-8b-instant') or ''
    parsed = _parse_shopping_json(re.sub(r'```(?:json)?', '', raw).strip())
    if not parsed:
        return []

    try:
        queries = parsed.get('queries', [])
        if not isinstance(queries, list):
            return []

        cleaned = []
        seen = set()
        for query in queries:
            if not isinstance(query, str):
                continue
            value = query.strip()
            key = value.lower()
            if not value or key in seen:
                continue
            seen.add(key)
            cleaned.append(value)
        return cleaned[:4]
    except Exception as error:
        print(f'Groq shopping fallback error: {error}')
        return []


def _parse_shopping_json(raw_text: str):
    """Parse JSON safely from Groq response text."""
    if not raw_text:
        return None

    try:
        return json.loads(raw_text)
    except Exception:
        pass

    block_match = re.search(r'\{[\s\S]*\}', raw_text)
    if block_match:
        try:
            return json.loads(block_match.group(0))
        except Exception:
            return None

    return None


def _fallback_shopping_queries(user_message: str):
    """Fallback query extraction when Groq does not return strict JSON."""
    text = (user_message or '').lower()

    # Keep the user's core phrase as highest-priority query.
    cleaned_phrase = re.sub(r'^(give\s+me|show\s+me|i\s+need|find|suggest|recommend)\s+', '', text).strip()
    queries = [cleaned_phrase] if cleaned_phrase else []

    # Domain-first mapping to keep card results relevant.
    intent_map = {
        'protein': ['protein powder', 'whey protein', 'high-protein food'],
        'vegan': ['vegan protein', 'tofu', 'lentils'],
        'vegetarian': ['paneer', 'yogurt', 'chickpeas'],
        'non-veg': ['chicken breast', 'eggs', 'salmon'],
        'non veg': ['chicken breast', 'eggs', 'salmon'],
        'diet coke': ['diet soda', 'cola', 'sugar substitute'],
        'coke': ['cola', 'diet soda', 'carbonated drink'],
        'diet': ['diet food', 'low-calorie food', 'sugar substitute'],
        'weight loss': ['low-calorie food', 'green tea', 'high-fiber food'],
        'muscle': ['whey protein', 'creatine', 'high-protein food'],
        'recovery': ['electrolyte', 'protein shake', 'omega-3 fatty acid'],
        'vitamin': ['multivitamin', 'vitamin d', 'vitamin c'],
        'calcium': ['calcium', 'milk', 'yogurt'],
        'snack': ['healthy snack', 'protein bar', 'nuts'],
    }

    for key, values in intent_map.items():
        if key in text:
            queries.extend(values)

    # If no known intent is matched, do a minimal token-based extraction.
    if not queries:
        tokens = [token.strip() for token in re.split(r'[^a-z0-9]+', text) if token.strip()]
        tokens = [token for token in tokens if len(token) > 2 and token not in {'need', 'want', 'give', 'show', 'with', 'for', 'the', 'and'}]
        if tokens:
            queries = [' '.join(tokens[:3]), tokens[0]]

    # Deduplicate while preserving order.
    seen = set()
    deduped = []
    for query in queries:
        key = query.lower().strip()
        if key and key not in seen:
            seen.add(key)
            deduped.append(query)

    return deduped[:4]


def gemini_shopping_fallback_queries(user_message: str, user_profile: dict = None):
    """Alias for groq_shopping_fallback_queries kept for backwards compatibility."""
    return groq_shopping_fallback_queries(user_message, user_profile)




def generate_ai_workout_plan(user_prompt: str, profile: dict = None) -> list:
    """
    Use Groq AI to generate a structured workout plan as a todo list.
    Returns a list of dicts: [{id, title, details, reps, done}]
    """
    goal = (profile or {}).get('goal', 'maintenance')
    diet = (profile or {}).get('diet_type', 'balanced')
    weight = (profile or {}).get('weight', '')

    system_prompt = (
        "You are a certified personal trainer. Generate a structured workout plan as a JSON array. "
        "Each item must have exactly: title (string), details (string with sets/reps/duration), reps (number). "
        "Return ONLY a valid JSON array, no markdown, no extra text. Example: "
        '[{"title":"Squats","details":"3 sets x 12 reps","reps":36},'
        '{"title":"Push-ups","details":"3 sets x 15 reps","reps":45}]'
    )

    user_content = f"User goal: {goal}. Diet: {diet}."
    if weight:
        user_content += f" Weight: {weight}kg."
    user_content += f" Request: {user_prompt}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]

    response = groq_chat_completion(messages, model="llama-3.3-70b-versatile")
    if not response:
        return _default_workout_plan()

    try:
        # Strip markdown fencing if present
        clean = re.sub(r'```(?:json)?', '', response).strip().strip('`')
        # Extract JSON array
        match = re.search(r'\[[\s\S]*\]', clean)
        if match:
            items = json.loads(match.group(0))
            if isinstance(items, list):
                result = []
                for i, item in enumerate(items):
                    if isinstance(item, dict) and item.get('title'):
                        result.append({
                            'id': f'ai-task-{i}',
                            'title': str(item.get('title', '')).strip(),
                            'details': str(item.get('details', '')).strip(),
                            'reps': max(1, int(item.get('reps', 10))),
                            'done': False,
                        })
                if result:
                    return result
    except Exception as e:
        print(f"AI workout plan parse error: {e}")

    return _default_workout_plan()


def _default_workout_plan():
    """Return a sensible default workout plan if AI fails."""
    return [
        {'id': 'ai-task-0', 'title': 'Warm-Up Jog', 'details': '5 min easy pace', 'reps': 1, 'done': False},
        {'id': 'ai-task-1', 'title': 'Squats', 'details': '3 sets x 12 reps', 'reps': 36, 'done': False},
        {'id': 'ai-task-2', 'title': 'Push-Ups', 'details': '3 sets x 15 reps', 'reps': 45, 'done': False},
        {'id': 'ai-task-3', 'title': 'Plank Hold', 'details': '3 sets x 30 sec', 'reps': 3, 'done': False},
        {'id': 'ai-task-4', 'title': 'Cool-Down Stretch', 'details': '5 min full-body stretch', 'reps': 1, 'done': False},
    ]
