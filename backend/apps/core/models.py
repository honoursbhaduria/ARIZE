from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    DIET_CHOICES = [
        ('vegetarian', 'Vegetarian'),
        ('eggetarian', 'Eggetarian'),
        ('non_veg', 'Non-Veg'),
        ('vegan', 'Vegan'),
    ]

    GOAL_CHOICES = [
        ('muscle_gain', 'Muscle Gain'),
        ('fat_loss', 'Fat Loss'),
        ('maintenance', 'Maintenance'),
    ]
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]
    ACTIVITY_LEVEL_CHOICES = [
        ('sedentary', 'Sedentary'),
        ('moderate', 'Moderate'),
        ('heavy', 'Heavy'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    age = models.PositiveIntegerField(null=True, blank=True)
    weight = models.FloatField(null=True, blank=True)
    district = models.CharField(max_length=80, default='global')
    goal = models.CharField(max_length=32, choices=GOAL_CHOICES, default='maintenance')
    diet_type = models.CharField(max_length=32, choices=DIET_CHOICES, default='vegetarian')
    gender = models.CharField(max_length=16, choices=GENDER_CHOICES, default='other')
    activity_level = models.CharField(max_length=16, choices=ACTIVITY_LEVEL_CHOICES, default='moderate')
    streak_days = models.PositiveIntegerField(default=0)
    notifications_enabled = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.user.username} profile'


class WorkoutSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='workout_sessions')
    exercise_name = models.CharField(max_length=64)
    reps = models.PositiveIntegerField(default=0)
    duration_minutes = models.PositiveIntegerField(default=0)
    form_score = models.FloatField(default=0)
    calories_burned = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)


class NutritionLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='nutrition_logs')
    food_name = models.CharField(max_length=128)
    calories = models.PositiveIntegerField(default=0)
    protein = models.FloatField(default=0)
    carbs = models.FloatField(default=0)
    fats = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)


class SleepLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sleep_logs')
    hours = models.FloatField(default=0)
    quality_score = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)


class FitnessBandSync(models.Model):
    PROVIDER_CHOICES = [
        ('google_fit', 'Google Fit'),
        ('fitbit', 'Fitbit'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='band_syncs')
    provider = models.CharField(max_length=32, choices=PROVIDER_CHOICES)
    steps = models.PositiveIntegerField(default=0)
    heart_rate = models.PositiveIntegerField(default=0)
    sleep_hours = models.FloatField(default=0)
    calories_burned = models.PositiveIntegerField(default=0)
    synced_at = models.DateTimeField(auto_now_add=True)


class RAGMemoryEntry(models.Model):
    SOURCE_CHOICES = [
        ('workout', 'Workout'),
        ('sleep', 'Sleep'),
        ('food', 'Food'),
        ('chat', 'Chat'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rag_entries')
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    content = models.TextField()
    embedding_preview = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)


class RecommendationLog(models.Model):
    INTENSITY_CHOICES = [
        ('rest', 'Rest'),
        ('light', 'Light'),
        ('intense', 'Intense'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recommendations')
    intensity = models.CharField(max_length=20, choices=INTENSITY_CHOICES)
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


class WhatsAppLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='whatsapp_logs')
    direction = models.CharField(max_length=10, default='outbound')
    message = models.TextField()
    status = models.CharField(max_length=20, default='queued')
    created_at = models.DateTimeField(auto_now_add=True)


class ShoppingSuggestion(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shopping_suggestions')
    title = models.CharField(max_length=128)
    category = models.CharField(max_length=64)
    external_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class MusicRecommendation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='music_recommendations')
    mood = models.CharField(max_length=32)
    provider = models.CharField(max_length=32, default='spotify')
    playlist_name = models.CharField(max_length=128)
    playlist_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ProgressPhoto(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress_photos')
    image_url = models.TextField() # Changed from URLField to support Base64
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class WomenHealthProfile(models.Model):
    CYCLE_REGULARITY_CHOICES = [
        ('regular', 'Regular'),
        ('irregular', 'Irregular'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='women_health_profile')
    cycle_length_days = models.PositiveIntegerField(null=True, blank=True)
    period_duration_days = models.PositiveIntegerField(null=True, blank=True)
    last_period_date = models.DateField(null=True, blank=True)
    cycle_regularity = models.CharField(max_length=16, choices=CYCLE_REGULARITY_CHOICES, default='regular')
    mood_pattern = models.CharField(max_length=120, blank=True)
    behavior_notes = models.TextField(blank=True)
    symptoms = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Women's health profile for {self.user.username}"


class NotificationPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preference')
    workout_reminders = models.BooleanField(default=True)
    streak_alerts = models.BooleanField(default=True)
    diet_suggestions = models.BooleanField(default=True)
    whatsapp_updates = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)


class Cart(models.Model):
    """Shopping cart for authenticated users."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='shopping_cart')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart for {self.user.username}"

    def get_total_items(self):
        return sum(item.quantity for item in self.items.all())

    def get_total_price(self):
        return sum(item.get_subtotal() for item in self.items.all())


class CartItem(models.Model):
    """Individual item in the shopping cart."""
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product_name = models.CharField(max_length=256)
    product_image = models.URLField(blank=True)
    product_category = models.CharField(max_length=64, default='food')
    wikipedia_url = models.URLField(blank=True)
    amazon_url = models.URLField(blank=True)
    flipkart_url = models.URLField(blank=True)
    quantity = models.PositiveIntegerField(default=1)
    price_estimate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"

    def get_subtotal(self):
        return self.price_estimate * self.quantity
