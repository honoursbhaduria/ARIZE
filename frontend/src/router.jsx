import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router'
import { isAuthenticated } from './services/api'
import { queryClient } from './lib/queryClient'
import {
  cartQuery,
  consistencyQuery,
  exerciseLibraryQuery,
  leaderboardQuery,
  notificationPrefsQuery,
  nutritionLogsQuery,
  overviewQuery,
  postureArticleQuery,
  profileQuery,
  progressPhotosQuery,
  workoutSessionsQuery,
  workoutSummaryQuery,
} from './lib/queries'
import AppLayout from './layouts/AppLayout'
import NotFound from './pages/NotFound'
import RouteError from './pages/RouteError'

const page = (importer) => lazyRouteComponent(importer)

// Kick off data fetching as soon as a route starts loading (or on link hover).
const prefetch = (...queries) => ({ context }) => {
  queries.forEach((query) => context.queryClient.prefetchQuery(query))
}

const requireAuth = ({ location }) => {
  if (!isAuthenticated()) {
    throw redirect({ to: '/login', search: { redirect: location.href } })
  }
}

const redirectIfAuthed = () => {
  if (isAuthenticated()) throw redirect({ to: '/dashboard' })
}

const rootRoute = createRootRouteWithContext()({
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
})

const landingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: page(() => import('./pages/Landing')) })

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search) => ({ redirect: typeof search.redirect === 'string' ? search.redirect : undefined }),
  beforeLoad: redirectIfAuthed,
  component: page(() => import('./pages/Login')),
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  beforeLoad: redirectIfAuthed,
  component: page(() => import('./pages/Register')),
})

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  beforeLoad: requireAuth,
  component: page(() => import('./pages/Onboarding')),
})

// Everything inside the app shell requires a session.
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: requireAuth,
  loader: prefetch(workoutSummaryQuery, consistencyQuery, profileQuery),
  component: AppLayout,
})

const child = (path, importer, loader, extra = {}) =>
  createRoute({ getParentRoute: () => appRoute, path, component: page(importer), loader, ...extra })

const appChildren = [
  child('/dashboard', () => import('./pages/Dashboard'), prefetch(workoutSessionsQuery, nutritionLogsQuery)),
  child('/counter', () => import('./pages/RepCounter')),
  child('/chat', () => import('./pages/AIChat')),
  child('/nutrition', () => import('./pages/Nutrition')),
  child('/heart-health', () => import('./pages/HeartHealth')),
  child('/gallery', () => import('./pages/ProgressGallery'), prefetch(progressPhotosQuery)),
  child('/analytics', () => import('./pages/Analytics'), prefetch(overviewQuery, leaderboardQuery, workoutSessionsQuery, nutritionLogsQuery)),
  child('/integrations', () => import('./pages/Integrations')),
  child('/settings', () => import('./pages/Settings'), prefetch(notificationPrefsQuery)),
  child('/vision', () => import('./pages/ComputerVision'), prefetch(exerciseLibraryQuery)),
  child('/shopping-cart', () => import('./pages/Cart'), prefetch(cartQuery)),
  child('/posture-reading', () => import('./pages/PostureReading'), ({ context, deps }) => {
    context.queryClient.prefetchQuery(postureArticleQuery(deps.topic))
  }, {
    validateSearch: (search) => ({ topic: typeof search.topic === 'string' && search.topic ? search.topic : 'Squat' }),
    loaderDeps: ({ search }) => ({ topic: search.topic }),
  }),
]

const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  registerRoute,
  onboardingRoute,
  appRoute.addChildren(appChildren),
])

export function createAppRouter(options = {}) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 150,
    scrollRestoration: true,
    ...options,
  })
}

export const router = createAppRouter()
