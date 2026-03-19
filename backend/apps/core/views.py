from django.contrib.auth.models import User
from django.db.models import Avg, Sum
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    UserProfile,
    WorkoutSession,
    NutritionLog,
    SleepLog,
    FitnessBandSync,
    RAGMemoryEntry,
    RecommendationLog,
    WhatsAppLog,
    ShoppingSuggestion,
    MusicRecommendation,
    ProgressPhoto,
    NotificationPreference,
)
from .serializers import (
    SignupSerializer,
    UserProfileSerializer,
    ChatSerializer,
    FoodSearchSerializer,
    WorkoutSessionSerializer,
    CVAnalyzeSerializer,
    NutritionLogSerializer,
    FoodImageSerializer,
    SleepLogSerializer,
    FitnessBandSyncSerializer,
    RAGMemorySerializer,
    RecommendationRequestSerializer,
    WhatsAppSerializer,
    ShoppingSerializer,
    MusicSerializer,
    ProgressPhotoSerializer,
    NotificationPreferenceSerializer,
)
from .services import (
    build_rag_response,
    nutrition_lookup,
    workout_recommendation,
    ai_workout_recommendation,
    ai_workout_analysis,
    consistency_feedback,
    mood_playlist,
    shopping_suggestions,
    pseudo_embedding,
    fastapi_post,
    calculate_streak,
    recognize_food_from_image,
)


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'status': 'ok', 'service': 'beasttrack-api'})


class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        NotificationPreference.objects.get_or_create(user=user)
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': {'id': user.id, 'username': user.username, 'email': user.email},
                'tokens': {'access': str(refresh.access_token), 'refresh': str(refresh)},
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = User.objects.filter(username=username).first()
        if not user or not user.check_password(password):
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': {'id': user.id, 'username': user.username, 'email': user.email},
                'tokens': {'access': str(refresh.access_token), 'refresh': str(refresh)},
            }
        )


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        if not email:
            return Response({'detail': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        username = email.split('@')[0]
        user, _ = User.objects.get_or_create(username=username, defaults={'email': email})
        UserProfile.objects.get_or_create(user=user)
        NotificationPreference.objects.get_or_create(user=user)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': {'id': user.id, 'username': user.username, 'email': user.email},
                'tokens': {'access': str(refresh.access_token), 'refresh': str(refresh)},
            }
        )


class ProfileView(APIView):
    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response(UserProfileSerializer(profile).data)

    def put(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DashboardSummaryView(APIView):
    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        workout_stats = request.user.workout_sessions.aggregate(calories=Sum('calories_burned'), avg_form=Avg('form_score'))
        nutrition_stats = request.user.nutrition_logs.aggregate(protein=Sum('protein'), carbs=Sum('carbs'), fats=Sum('fats'))
        return Response(
            {
                'daily_stats': {
                    'calories_burned': workout_stats['calories'] or 0,
                    'protein': round(nutrition_stats['protein'] or 0, 2),
                    'carbs': round(nutrition_stats['carbs'] or 0, 2),
                    'fats': round(nutrition_stats['fats'] or 0, 2),
                    'avg_form_score': round(workout_stats['avg_form'] or 0, 2),
                },
                'progress': {'weekly_improvement_percent': 20, 'monthly_consistency': 78},
                'profile': UserProfileSerializer(profile).data,
            }
        )


class ProgressTrackingView(APIView):
    def get(self, request):
        recent_workouts = WorkoutSession.objects.filter(user=request.user).order_by('-created_at')[:30]
        weekly_total_reps = sum(workout.reps for workout in recent_workouts[:7])
        monthly_total_reps = sum(workout.reps for workout in recent_workouts)
        return Response(
            {
                'weekly': {'total_reps': weekly_total_reps, 'sessions': min(recent_workouts.count(), 7)},
                'monthly': {'total_reps': monthly_total_reps, 'sessions': recent_workouts.count()},
            }
        )


class WorkoutSessionView(APIView):
    def get(self, request):
        queryset = WorkoutSession.objects.filter(user=request.user).order_by('-created_at')[:50]
        return Response(WorkoutSessionSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = WorkoutSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workout = serializer.save(user=request.user)
        return Response(WorkoutSessionSerializer(workout).data, status=status.HTTP_201_CREATED)


class CVAnalyzeView(APIView):
    def post(self, request):
        serializer = CVAnalyzeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Try FastAPI service first
        fastapi_result = fastapi_post('/cv/analyze', serializer.validated_data)

        if not fastapi_result:
            # Fall back to AI-powered analysis
            ai_result = ai_workout_analysis(
                exercise_name=serializer.validated_data['exercise_name'],
                reps=serializer.validated_data['reps'],
                duration=serializer.validated_data.get('duration_minutes', 1) * 60,
                form_notes=serializer.validated_data.get('form_notes', '')
            )
            fastapi_result = {
                'exercise_name': serializer.validated_data['exercise_name'],
                'reps': serializer.validated_data['reps'],
                'form_score': ai_result['form_score'],
                'feedback': ai_result['feedback'],
                'calories_burned': ai_result['calories_burned'],
            }

        workout = WorkoutSession.objects.create(
            user=request.user,
            exercise_name=fastapi_result['exercise_name'],
            reps=fastapi_result['reps'],
            duration_minutes=serializer.validated_data.get('duration_minutes', 0),
            form_score=fastapi_result.get('form_score', 75),
            calories_burned=fastapi_result.get('calories_burned', max(30, fastapi_result['reps'] * 4)),
        )
        return Response({'analysis': fastapi_result, 'session': WorkoutSessionSerializer(workout).data}, status=status.HTTP_201_CREATED)


class WorkoutSummaryView(APIView):
    def get(self, request):
        sessions = list(WorkoutSession.objects.filter(user=request.user).order_by('-created_at')[:20])
        total_reps = sum(session.reps for session in sessions)
        avg_form = sum(session.form_score for session in sessions) / len(sessions) if sessions else 0
        return Response(
            {
                'total_sessions': len(sessions),
                'total_reps': total_reps,
                'avg_form_score': round(avg_form, 2),
                'recent': WorkoutSessionSerializer(sessions[:5], many=True).data,
            }
        )


class FoodRecognitionView(APIView):
    def post(self, request):
        serializer = FoodImageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        image_data = serializer.validated_data.get('image_data')
        image_url = serializer.validated_data.get('image_url')

        # Try Gemini Vision API first with image_data
        if image_data:
            gemini_result = recognize_food_from_image(image_data)
            if gemini_result:
                nutrition = NutritionLog.objects.create(
                    user=request.user,
                    food_name=gemini_result['food'],
                    calories=gemini_result['calories'],
                    protein=gemini_result['protein'],
                    carbs=gemini_result['carbs'],
                    fats=gemini_result['fats'],
                )
                return Response({
                    'recognition': {
                        'detected_food': gemini_result['food'],
                        'calories': gemini_result['calories'],
                        'protein': gemini_result['protein'],
                        'carbs': gemini_result['carbs'],
                        'fats': gemini_result['fats'],
                        'source': 'gemini_vision'
                    },
                    'saved': NutritionLogSerializer(nutrition).data
                })

        # Fallback: try FastAPI service if Gemini fails
        fallback_data = {}
        if image_url:
            fallback_data['image_url'] = image_url

        fastapi_result = fastapi_post('/nutrition/recognize', fallback_data) if fallback_data else None

        if not fastapi_result:
            detected = nutrition_lookup('sample meal')
            fastapi_result = {
                'detected_food': detected['food'],
                'calories': detected['calories'],
                'protein': detected['protein'],
                'carbs': detected['carbs'],
                'fats': detected['fats'],
            }

        nutrition = NutritionLog.objects.create(
            user=request.user,
            food_name=fastapi_result['detected_food'],
            calories=fastapi_result['calories'],
            protein=fastapi_result['protein'],
            carbs=fastapi_result['carbs'],
            fats=fastapi_result['fats'],
        )
        return Response({'recognition': fastapi_result, 'saved': NutritionLogSerializer(nutrition).data})


class NutritionSearchView(APIView):
    def post(self, request):
        serializer = FoodSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = nutrition_lookup(serializer.validated_data['query'])

        entry = NutritionLog.objects.create(
            user=request.user,
            food_name=result['food'],
            calories=result['calories'],
            protein=result['protein'],
            carbs=result['carbs'],
            fats=result['fats'],
        )
        return Response({'result': result, 'saved': NutritionLogSerializer(entry).data})


class NutritionLogsView(APIView):
    def get(self, request):
        logs = NutritionLog.objects.filter(user=request.user).order_by('-created_at')[:50]
        return Response(NutritionLogSerializer(logs, many=True).data)


class SleepLogView(APIView):
    def get(self, request):
        logs = SleepLog.objects.filter(user=request.user).order_by('-created_at')[:30]
        return Response(SleepLogSerializer(logs, many=True).data)

    def post(self, request):
        serializer = SleepLogSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sleep_log = serializer.save(user=request.user)
        return Response(SleepLogSerializer(sleep_log).data, status=status.HTTP_201_CREATED)


class ConsistencyAnalyticsView(APIView):
    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        workout_count = WorkoutSession.objects.filter(user=request.user).count()
        missed_workouts = max(0, 7 - min(workout_count, 7))
        current_score = max(0, min(100, 100 - (missed_workouts * 10)))
        previous_score = max(0, current_score - 20)
        feedback = consistency_feedback(missed_workouts, previous_score, current_score)
        profile.streak_days = max(profile.streak_days, max(0, 7 - missed_workouts))
        profile.save(update_fields=['streak_days'])

        return Response(
            {
                'streak_days': profile.streak_days,
                'missed_workouts': missed_workouts,
                'weekly_consistency_score': current_score,
                'feedback': feedback,
            }
        )


class FitnessBandSyncView(APIView):
    def get(self, request):
        syncs = FitnessBandSync.objects.filter(user=request.user).order_by('-synced_at')[:20]
        return Response(FitnessBandSyncSerializer(syncs, many=True).data)

    def post(self, request):
        serializer = FitnessBandSyncSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sync = serializer.save(user=request.user)
        return Response(FitnessBandSyncSerializer(sync).data, status=status.HTTP_201_CREATED)


class RAGMemoryView(APIView):
    def get(self, request):
        entries = RAGMemoryEntry.objects.filter(user=request.user).order_by('-created_at')[:50]
        return Response(RAGMemorySerializer(entries, many=True).data)

    def post(self, request):
        serializer = RAGMemorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        if not payload.get('embedding_preview'):
            payload['embedding_preview'] = pseudo_embedding(payload['content'])
        entry = RAGMemoryEntry.objects.create(user=request.user, **payload)
        return Response(RAGMemorySerializer(entry).data, status=status.HTTP_201_CREATED)


class ChatAskView(APIView):
    def post(self, request):
        serializer = ChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        profile, _ = UserProfile.objects.get_or_create(user=request.user)

        # Get recent workout and nutrition data for context
        recent_workouts = WorkoutSession.objects.filter(user=request.user).order_by('-created_at')[:5]
        recent_sleep = SleepLog.objects.filter(user=request.user).order_by('-created_at').first()

        context = {
            'profile': {
                'goal': profile.goal,
                'diet_type': profile.diet_type,
                'streak_days': profile.streak_days,
                'weight': profile.weight,
            },
            'recent': {
                'recent_workouts': ', '.join([w.exercise_name for w in recent_workouts]) if recent_workouts else 'None',
                'avg_calories': sum(w.calories_burned for w in recent_workouts) // len(recent_workouts) if recent_workouts else 0,
                'avg_sleep': recent_sleep.hours if recent_sleep else 7,
            }
        }

        # Try FastAPI service first, fall back to Groq-powered response
        fastapi_result = fastapi_post('/chat/respond', {'message': serializer.validated_data['message'], 'context': context})
        response_data = fastapi_result or build_rag_response(serializer.validated_data['message'], context)

        RAGMemoryEntry.objects.create(
            user=request.user,
            source_type='chat',
            content=serializer.validated_data['message'],
            embedding_preview=response_data.get('embedding_preview', pseudo_embedding(serializer.validated_data['message'])),
        )
        return Response(response_data)


class RecommendationEngineView(APIView):
    def post(self, request):
        serializer = RecommendationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get user profile for personalized recommendations
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        last_workout = WorkoutSession.objects.filter(user=request.user).order_by('-created_at').first()

        # Always use AI-powered recommendations (Groq)
        user_profile = {'goal': profile.goal, 'diet_type': profile.diet_type}
        recent_metrics = {
            'streak': profile.streak_days,
            'sleep_hours': serializer.validated_data.get('sleep_hours', 7),
            'fatigue': serializer.validated_data.get('fatigue', 50),
            'performance': serializer.validated_data.get('performance', 70),
            'last_workout': last_workout.exercise_name if last_workout else 'None'
        }
        recommendation = ai_workout_recommendation(user_profile, recent_metrics)

        if 'ai_recommendation' not in recommendation:
            # Use rule-based if AI fails
            recommendation = workout_recommendation(**serializer.validated_data)

        RecommendationLog.objects.create(
            user=request.user,
            intensity=recommendation.get('intensity', 'moderate'),
            reason=recommendation.get('note', recommendation.get('ai_recommendation', '')),
        )
        return Response(recommendation)


class WhatsAppBotView(APIView):
    def post(self, request):
        serializer = WhatsAppSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        log = WhatsAppLog.objects.create(user=request.user, message=serializer.validated_data['message'], status='sent')
        return Response({'status': 'queued', 'log_id': log.id, 'message': log.message})


class ShoppingSuggestionView(APIView):
    def post(self, request):
        serializer = ShoppingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get user's goal for personalized suggestions
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        suggestions = shopping_suggestions(
            serializer.validated_data['preference'],
            goal=profile.goal
        )

        saved = []
        for suggestion in suggestions:
            item = ShoppingSuggestion.objects.create(user=request.user, **suggestion)
            saved.append({'id': item.id, **suggestion})
        return Response({'suggestions': saved})


class MusicRecommendationView(APIView):
    def post(self, request):
        serializer = MusicSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        recommendation = mood_playlist(serializer.validated_data['mood'])
        record = MusicRecommendation.objects.create(user=request.user, mood=serializer.validated_data['mood'], **recommendation)
        return Response({'id': record.id, **recommendation})


class ProgressPhotoView(APIView):
    def get(self, request):
        photos = ProgressPhoto.objects.filter(user=request.user).order_by('-created_at')[:50]
        return Response(ProgressPhotoSerializer(photos, many=True).data)

    def post(self, request):
        serializer = ProgressPhotoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        photo = serializer.save(user=request.user)
        return Response(ProgressPhotoSerializer(photo).data, status=status.HTTP_201_CREATED)


class NotificationPreferenceView(APIView):
    def get(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return Response(NotificationPreferenceSerializer(prefs).data)

    def put(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AnalyticsOverviewView(APIView):
    def get(self, request):
        nutrition = NutritionLog.objects.filter(user=request.user)
        workouts = WorkoutSession.objects.filter(user=request.user)
        return Response(
            {
                'calories_burned': workouts.aggregate(total=Sum('calories_burned'))['total'] or 0,
                'protein_intake': round(nutrition.aggregate(total=Sum('protein'))['total'] or 0, 2),
                'weekly_sessions': workouts.count(),
                'chart_data': {
                    'workouts': WorkoutSessionSerializer(workouts.order_by('-created_at')[:7], many=True).data,
                    'nutrition': NutritionLogSerializer(nutrition.order_by('-created_at')[:7], many=True).data,
                },
            }
        )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def feature_index(request):
    return Response(
        {
            'modules': [
                'auth',
                'profile_setup',
                'dashboard_daily_stats',
                'progress_tracking_weekly_monthly',
                'cv_rep_counting',
                'exercise_detection',
                'form_tracking',
                'workout_session_summary',
                'food_recognition',
                'nutrition_macros',
                'manual_food_search',
                'streak_consistency',
                'fitness_band_sync',
                'rag_memory_embeddings',
                'ai_chatbot',
                'workout_recommendation_engine',
                'whatsapp_bot',
                'shopping_suggestions',
                'gym_music',
                'progress_photos',
                'notifications',
                'analytics_dashboard',
                'security_jwt',
            ]
        }
    )
