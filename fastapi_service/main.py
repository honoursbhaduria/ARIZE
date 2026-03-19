from fastapi import FastAPI
from pydantic import BaseModel
import hashlib

app = FastAPI(title='BeastTrack AI Service', version='1.0.0')


class CVRequest(BaseModel):
    exercise_name: str
    reps: int
    form_score: float
    duration_minutes: int = 0


class NutritionImageRequest(BaseModel):
    image_url: str


class ChatRequest(BaseModel):
    message: str
    context: dict = {}


class RecommendationRequest(BaseModel):
    fatigue: float
    streak: int
    sleep_hours: float
    performance: float


def embedding_preview(text: str):
    digest = hashlib.sha256(text.encode('utf-8')).digest()
    return [round(byte / 255, 4) for byte in digest[:16]]


@app.get('/health')
def health():
    return {'status': 'ok', 'service': 'beasttrack-fastapi'}


@app.post('/cv/analyze')
def cv_analyze(payload: CVRequest):
    feedback = 'Good depth and tempo. Keep your chest up during the final reps.'
    return {
        'exercise_name': payload.exercise_name,
        'reps': payload.reps,
        'form_score': round(min(100, max(0, payload.form_score)), 2),
        'feedback': feedback,
    }


@app.post('/nutrition/recognize')
def nutrition_recognize(payload: NutritionImageRequest):
    seed = max(5, len(payload.image_url) % 15)
    return {
        'detected_food': 'Detected Meal Bowl',
        'calories': seed * 70,
        'protein': round(seed * 2.0, 1),
        'carbs': round(seed * 2.4, 1),
        'fats': round(seed * 0.8, 1),
    }


@app.post('/chat/respond')
def chat_respond(payload: ChatRequest):
    msg = payload.message.lower()
    if 'not improving' in msg:
        answer = 'Low protein intake and inconsistent workouts are reducing your progress. Increase protein and stabilize your weekly schedule.'
    elif 'what should i do today' in msg:
        answer = 'Today is a light day: 20 min mobility + 25 min zone-2 cardio + core activation.'
    else:
        answer = 'Focus on progressive overload, quality sleep, and consistent protein intake for best results.'

    return {
        'answer': answer,
        'embedding_preview': embedding_preview(payload.message),
        'context_used': payload.context,
    }


@app.post('/recommendation/workout')
def recommend_workout(payload: RecommendationRequest):
    if payload.sleep_hours < 5 or payload.fatigue > 80:
        intensity = 'rest'
        note = 'Recovery recommended due to fatigue and sleep deficit.'
    elif payload.performance > 70 and payload.streak >= 4:
        intensity = 'intense'
        note = 'High readiness detected. Proceed with intense workout.'
    else:
        intensity = 'light'
        note = 'Moderate readiness detected. Keep volume controlled.'

    readiness_score = round((100 - payload.fatigue + payload.performance + min(payload.sleep_hours * 10, 80)) / 3, 2)
    return {
        'intensity': intensity,
        'note': note,
        'readiness_score': readiness_score,
    }
