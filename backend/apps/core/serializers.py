from django.contrib.auth.models import User
from rest_framework import serializers
from .models import (
    UserProfile,
    WomenHealthProfile,
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
    Cart,
    CartItem,
)


class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_username(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError('Username cannot be empty.')
        if User.objects.filter(username__iexact=cleaned).exists():
            raise serializers.ValidationError('A user with that username already exists.')
        return cleaned

    def validate_email(self, value):
        cleaned = value.strip().lower()
        if not cleaned:
            raise serializers.ValidationError('Email cannot be empty.')
        if User.objects.filter(email__iexact=cleaned).exists():
            raise serializers.ValidationError('A user with that email already exists.')
        return cleaned

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        UserProfile.objects.get_or_create(user=user)
        return user


class WomenHealthProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = WomenHealthProfile
        fields = [
            'cycle_length_days',
            'period_duration_days',
            'last_period_date',
            'cycle_regularity',
            'mood_pattern',
            'behavior_notes',
            'symptoms',
            'updated_at',
        ]
        read_only_fields = ['updated_at']


class UserProfileSerializer(serializers.ModelSerializer):
    streak_days = serializers.SerializerMethodField()
    women_health_profile = WomenHealthProfileSerializer(source='user.women_health_profile', read_only=True)
    women_health = WomenHealthProfileSerializer(write_only=True, required=False)

    class Meta:
        model = UserProfile
        fields = [
            'age',
            'weight',
            'height',
            'district',
            'goal',
            'diet_type',
            'gender',
            'activity_level',
            'streak_days',
            'notifications_enabled',
            'women_health_profile',
            'women_health',
        ]

    def get_streak_days(self, obj):
        return obj.streak_days

    def validate_height(self, value):
        if value is not None and not 80 <= value <= 260:
            raise serializers.ValidationError('Height must be between 80 and 260 cm.')
        return value

    def validate_weight(self, value):
        if value is not None and not 20 <= value <= 400:
            raise serializers.ValidationError('Weight must be between 20 and 400 kg.')
        return value

    def update(self, instance, validated_data):
        women_health_payload = validated_data.pop('women_health', None)
        instance = super().update(instance, validated_data)

        effective_gender = validated_data.get('gender', instance.gender)
        if effective_gender != 'female':
            WomenHealthProfile.objects.filter(user=instance.user).delete()
            return instance

        if women_health_payload:
            women_health_profile, _ = WomenHealthProfile.objects.get_or_create(user=instance.user)
            for key, value in women_health_payload.items():
                setattr(women_health_profile, key, value)
            women_health_profile.save()

        return instance


class ChatSerializer(serializers.Serializer):
    message = serializers.CharField()


class FoodSearchSerializer(serializers.Serializer):
    query = serializers.CharField()
    # Amount eaten; nutrition is looked up per 100 g and scaled to this.
    grams = serializers.FloatField(required=False, min_value=1, max_value=5000)


class WorkoutSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutSession
        fields = ['id', 'exercise_name', 'reps', 'duration_minutes', 'form_score', 'calories_burned', 'created_at']


class CVAnalyzeSerializer(serializers.Serializer):
    exercise_name = serializers.CharField()
    reps = serializers.IntegerField(min_value=0)
    form_score = serializers.FloatField(min_value=0, max_value=100)
    duration_minutes = serializers.IntegerField(min_value=0, default=0)


class VideoWorkoutAnalyzeSerializer(serializers.Serializer):
    video = serializers.FileField()
    exercise_name = serializers.CharField(required=False, allow_blank=True, default='Workout Session')
    duration_seconds = serializers.FloatField(required=False, min_value=0, default=0)


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


class HeartHealthPredictionSerializer(serializers.Serializer):
    Gender = serializers.ChoiceField(choices=['Male', 'Female'])
    Age = serializers.ChoiceField(choices=['18-34', '35-50', '51-64', '65+'])
    History = serializers.ChoiceField(choices=['No', 'Yes'])
    Patient = serializers.ChoiceField(choices=['No', 'Yes'])
    TakeMedication = serializers.ChoiceField(choices=['No', 'Yes'])
    Severity = serializers.ChoiceField(choices=['Mild', 'Moderate', 'Sever'])
    BreathShortness = serializers.ChoiceField(choices=['No', 'Yes'])
    VisualChanges = serializers.ChoiceField(choices=['No', 'Yes'])
    NoseBleeding = serializers.ChoiceField(choices=['No', 'Yes'])
    Whendiagnoused = serializers.ChoiceField(choices=['<1 Year', '1 - 5 Years', '>5 Years'])
    Systolic = serializers.ChoiceField(choices=['100 - 110', '111 - 120', '121 - 130', '130+'])
    Diastolic = serializers.ChoiceField(choices=['70 - 80', '81 - 90', '91 - 100', '100+'])
    ControlledDiet = serializers.ChoiceField(choices=['No', 'Yes'])


class WhatsAppSerializer(serializers.Serializer):
    message = serializers.CharField()


class ShoppingSerializer(serializers.Serializer):
    preference = serializers.CharField(default='high protein')


class MusicSerializer(serializers.Serializer):
    mood = serializers.ChoiceField(choices=['cardio', 'strength', 'hiit', 'relax', 'yoga'])


class ProgressPhotoSerializer(serializers.ModelSerializer):
    """Full photo (used for upload and for opening a single photo)."""

    class Meta:
        model = ProgressPhoto
        fields = ['id', 'image_url', 'note', 'created_at']


class ProgressPhotoListSerializer(serializers.ModelSerializer):
    """Gallery listing: thumbnail only, never the full-size image."""

    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = ProgressPhoto
        fields = ['id', 'thumbnail_url', 'note', 'created_at']

    def get_thumbnail_url(self, photo):
        if photo.thumbnail:
            return photo.thumbnail
        # Linked (http) images are already lightweight references.
        return photo.image_url if not photo.image_url.startswith('data:') else ''


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['workout_reminders', 'streak_alerts', 'diet_suggestions', 'whatsapp_updates', 'updated_at']


class CartItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = ['id', 'product_name', 'product_image', 'product_category', 'wikipedia_url', 'amazon_url', 'flipkart_url', 'quantity', 'price_estimate', 'added_at']


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_items', 'total_price', 'created_at', 'updated_at']

    def get_total_items(self, obj):
        return obj.get_total_items()

    def get_total_price(self, obj):
        return obj.get_total_price()


class AddToCartSerializer(serializers.Serializer):
    product_name = serializers.CharField(max_length=256)
    product_image = serializers.URLField(required=False, allow_blank=True)
    product_category = serializers.CharField(max_length=64, default='food')
    wikipedia_url = serializers.URLField(required=False, allow_blank=True)
    amazon_url = serializers.URLField(required=False, allow_blank=True)
    flipkart_url = serializers.URLField(required=False, allow_blank=True)
    quantity = serializers.IntegerField(min_value=1, default=1)
    price_estimate = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
