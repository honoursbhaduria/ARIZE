from django.contrib.auth.models import User
from rest_framework import serializers
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


class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        UserProfile.objects.get_or_create(user=user)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['age', 'weight', 'goal', 'diet_type', 'streak_days', 'notifications_enabled']


class ChatSerializer(serializers.Serializer):
    message = serializers.CharField()


class FoodSearchSerializer(serializers.Serializer):
    query = serializers.CharField()


class WorkoutSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutSession
        fields = ['id', 'exercise_name', 'reps', 'duration_minutes', 'form_score', 'calories_burned', 'created_at']


class CVAnalyzeSerializer(serializers.Serializer):
    exercise_name = serializers.CharField()
    reps = serializers.IntegerField(min_value=0)
    form_score = serializers.FloatField(min_value=0, max_value=100)
    duration_minutes = serializers.IntegerField(min_value=0, default=0)


class NutritionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NutritionLog
        fields = ['id', 'food_name', 'calories', 'protein', 'carbs', 'fats', 'created_at']


class FoodImageSerializer(serializers.Serializer):
    image_url = serializers.URLField(required=False, allow_blank=True)
    image_data = serializers.CharField(required=False, allow_blank=True)


class SleepLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SleepLog
        fields = ['id', 'hours', 'quality_score', 'created_at']


class FitnessBandSyncSerializer(serializers.ModelSerializer):
    class Meta:
        model = FitnessBandSync
        fields = ['id', 'provider', 'steps', 'heart_rate', 'sleep_hours', 'calories_burned', 'synced_at']


class RAGMemorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RAGMemoryEntry
        fields = ['id', 'source_type', 'content', 'embedding_preview', 'created_at']


class RecommendationRequestSerializer(serializers.Serializer):
    fatigue = serializers.FloatField(min_value=0, max_value=100)
    streak = serializers.IntegerField(min_value=0)
    sleep_hours = serializers.FloatField(min_value=0)
    performance = serializers.FloatField(min_value=0, max_value=100)


class WhatsAppSerializer(serializers.Serializer):
    message = serializers.CharField()


class ShoppingSerializer(serializers.Serializer):
    preference = serializers.CharField(default='high protein')


class MusicSerializer(serializers.Serializer):
    mood = serializers.ChoiceField(choices=['cardio', 'strength', 'relax'])


class ProgressPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgressPhoto
        fields = ['id', 'image_url', 'note', 'created_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['workout_reminders', 'streak_alerts', 'diet_suggestions', 'whatsapp_updates', 'updated_at']
