import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addToCart,
  clearCart,
  fetchAnalytics,
  fetchAnalyticsOverview,
  fetchNotificationPreferences,
  fetchNutritionLogs,
  fetchProfile,
  fetchProgressPhoto,
  fetchProgressPhotos,
  fetchStreakLeaderboard,
  fetchWorkoutSessions,
  fetchWorkoutSummary,
  getCartItems,
  removeFromCart,
  saveWorkoutSession,
  searchLocations,
  searchMusic,
  updateCartItem,
  updateNotificationPreferences,
  updateProfile,
  uploadProgressPhoto,
} from '../services/api'
import { getExerciseData, getPostureReadingContent } from '../services/wikipediaApi'
import { computeXp, levelFromXp } from './xp'

const asArray = (value) => (Array.isArray(value) ? value : [])

export const profileQuery = queryOptions({ queryKey: ['profile'], queryFn: fetchProfile })
export const workoutSummaryQuery = queryOptions({ queryKey: ['workouts', 'summary'], queryFn: fetchWorkoutSummary })
export const workoutSessionsQuery = queryOptions({
  queryKey: ['workouts', 'sessions'],
  queryFn: () => fetchWorkoutSessions().then(asArray),
})
export const nutritionLogsQuery = queryOptions({
  queryKey: ['nutrition', 'logs'],
  queryFn: () => fetchNutritionLogs().then(asArray),
})
export const consistencyQuery = queryOptions({ queryKey: ['analytics', 'consistency'], queryFn: fetchAnalytics })
export const overviewQuery = queryOptions({ queryKey: ['analytics', 'overview'], queryFn: fetchAnalyticsOverview })
export const leaderboardQuery = queryOptions({
  queryKey: ['analytics', 'leaderboard'],
  queryFn: () => fetchStreakLeaderboard().then((res) => asArray(res?.leaderboard)),
})
export const notificationPrefsQuery = queryOptions({ queryKey: ['notifications'], queryFn: fetchNotificationPreferences })
export const progressPhotosQuery = queryOptions({
  queryKey: ['progress', 'photos'],
  queryFn: () => fetchProgressPhotos().then(asArray),
})
export const progressPhotoQuery = (photoId) =>
  queryOptions({
    queryKey: ['progress', 'photo', photoId],
    queryFn: () => fetchProgressPhoto(photoId),
    staleTime: Infinity,
  })

export const cartQuery = queryOptions({
  queryKey: ['cart'],
  queryFn: () => getCartItems().then((res) => asArray(res?.items)),
})
export const exerciseLibraryQuery = queryOptions({
  queryKey: ['wiki', 'exercises'],
  queryFn: () => getExerciseData().then((data) => asArray(data).slice(0, 5)),
  staleTime: Infinity,
})
export const postureArticleQuery = (topic) =>
  queryOptions({
    queryKey: ['wiki', 'posture', topic],
    queryFn: async () => {
      const data = await getPostureReadingContent(topic)
      if (!data) throw new Error('Could not load posture content from Wikipedia.')
      return data
    },
    staleTime: Infinity,
  })

export const locationSearchQuery = (query) =>
  queryOptions({
    queryKey: ['locations', query.trim().toLowerCase()],
    queryFn: () => searchLocations(query.trim()),
    enabled: query.trim().length >= 2,
    staleTime: Infinity,
  })

export const musicSearchQuery = (query) =>
  queryOptions({
    queryKey: ['music', 'search', query.trim().toLowerCase()],
    queryFn: () => searchMusic(query.trim()).then((res) => asArray(res?.tracks)),
    enabled: query.trim().length >= 2,
    staleTime: 10 * 60 * 1000,
  })

// Level/XP/streak used by the HUD, sidebar and dashboard.
export function usePlayerStats() {
  const summary = useQuery(workoutSummaryQuery)
  const consistency = useQuery(consistencyQuery)
  const streakDays = consistency.data?.streak_days || 0
  const xp = computeXp({
    totalReps: summary.data?.total_reps,
    totalSessions: summary.data?.total_sessions,
    streakDays,
  })
  return { xp, streakDays, ...levelFromXp(xp), isLoading: summary.isLoading || consistency.isLoading }
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      if (data && typeof data === 'object') qc.setQueryData(['profile'], data)
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useUploadProgressPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: uploadProgressPhoto,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['progress', 'photos'] }),
  })
}

export function useSaveWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: saveWorkoutSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workouts'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useCartMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['cart'] })
  return {
    add: useMutation({ mutationFn: addToCart, onSuccess: invalidate }),
    remove: useMutation({
      mutationFn: removeFromCart,
      onMutate: (itemId) => qc.setQueryData(['cart'], (items = []) => items.filter((item) => item.id !== itemId)),
      onSettled: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ itemId, quantity }) => updateCartItem(itemId, quantity),
      onMutate: ({ itemId, quantity }) =>
        qc.setQueryData(['cart'], (items = []) => items.map((item) => (item.id === itemId ? { ...item, quantity } : item))),
      onSettled: invalidate,
    }),
    clear: useMutation({
      mutationFn: clearCart,
      onMutate: () => qc.setQueryData(['cart'], []),
      onSettled: invalidate,
    }),
  }
}
