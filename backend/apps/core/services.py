import hashlib
import json
import os
from urllib.request import Request, urlopen
from urllib.error import URLError


def pseudo_embedding(text: str):
    digest = hashlib.sha256(text.encode('utf-8')).digest()
    return [round(byte / 255, 4) for byte in digest[:16]]


def build_rag_response(message: str, context: dict):
    message_lower = message.lower()
    if 'not improving' in message_lower:
        return {
            'answer': 'Your recent pattern shows low protein intake and inconsistent workout frequency. Increase daily protein and keep a 4-day minimum workout rhythm.',
            'embedding_preview': pseudo_embedding(message),
        }

    if 'what should i do today' in message_lower:
        return {
            'answer': 'Based on your fatigue and sleep trend, do a light recovery workout: 25 minutes mobility + 20 minutes zone-2 cardio.',
            'embedding_preview': pseudo_embedding(message),
        }

    return {
        'answer': f"Personalized recommendation: focus on {context.get('goal', 'maintenance')} with balanced macros and progressive overload.",
        'embedding_preview': pseudo_embedding(message),
    }


def nutrition_lookup(query: str):
    seed = max(len(query), 5)
    return {
        'food': query.title(),
        'calories': 60 * seed,
        'protein': round(seed * 1.8, 1),
        'carbs': round(seed * 2.2, 1),
        'fats': round(seed * 0.9, 1),
    }


def workout_recommendation(fatigue: float, streak: int, sleep_hours: float, performance: float):
    if sleep_hours < 5 or fatigue > 80:
        intensity = 'rest'
        note = 'High fatigue and low sleep detected. Prioritize recovery, mobility, and hydration.'
    elif sleep_hours < 7 or performance < 55:
        intensity = 'light'
        note = 'Moderate readiness. Do light cardio and controlled technique work today.'
    elif streak >= 5 and performance >= 70:
        intensity = 'intense'
        note = 'High readiness and stable streak. Proceed with an intense progressive overload session.'
    else:
        intensity = 'light'
        note = 'Balanced state detected. Perform medium-volume training with attention to form.'

    return {
        'intensity': intensity,
        'note': note,
        'readiness_score': round((100 - fatigue + performance + min(sleep_hours * 10, 80)) / 3, 2),
    }


def consistency_feedback(missed_workouts: int, previous_score: int, current_score: int):
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
    }
    return map_data[mood]


def shopping_suggestions(preference: str):
    return [
        {
            'title': 'Paneer High-Protein Pack',
            'category': 'protein-food',
            'external_url': 'https://example-shopify-store.com/products/paneer-pack',
        },
        {
            'title': 'Whey Protein Isolate',
            'category': 'supplement',
            'external_url': 'https://example-shopify-store.com/products/whey-isolate',
        },
        {
            'title': f'{preference.title()} Smart Basket',
            'category': 'bundle',
            'external_url': 'https://example-shopify-store.com/collections/smart-baskets',
        },
    ]


def fastapi_post(path: str, payload: dict):
    base_url = os.getenv('FASTAPI_SERVICE_URL', 'http://localhost:9000')
    url = f'{base_url}{path}'
    body = json.dumps(payload).encode('utf-8')
    request = Request(url=url, data=body, headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urlopen(request, timeout=4) as response:
            return json.loads(response.read().decode('utf-8'))
    except (URLError, TimeoutError, json.JSONDecodeError):
        return None
