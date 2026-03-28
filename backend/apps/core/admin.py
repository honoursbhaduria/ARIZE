from django.contrib import admin
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
	WomenHealthProfile,
)


admin.site.register(UserProfile)
admin.site.register(WorkoutSession)
admin.site.register(NutritionLog)
admin.site.register(SleepLog)
admin.site.register(FitnessBandSync)
admin.site.register(RAGMemoryEntry)
admin.site.register(RecommendationLog)
admin.site.register(WhatsAppLog)
admin.site.register(ShoppingSuggestion)
admin.site.register(MusicRecommendation)
admin.site.register(ProgressPhoto)
admin.site.register(NotificationPreference)
admin.site.register(WomenHealthProfile)
