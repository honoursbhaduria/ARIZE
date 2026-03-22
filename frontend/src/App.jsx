import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Background from './components/Background'
import AppShell from './components/AppShell'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import AIChat from './pages/AIChat'
import ComputerVision from './pages/ComputerVision'
import Analytics from './pages/Analytics'
import AppStore from './pages/AppStore'
import Integrations from './pages/Integrations'
import RepCounter from './pages/RepCounter'
import ShoppingCart from './components/ShoppingCart'
import Login from './pages/Login'
import Register from './pages/Register'
import Settings from './pages/Settings'
import OnboardingQuiz from './pages/OnboardingQuiz'
import ProgressGallery from './pages/ProgressGallery'
import NotFound from './pages/NotFound'
import { isAuthenticated } from './services/api'
import './App.css'

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  const location = useLocation()
  const withShell = (element) => (
    <ProtectedRoute>
      <AppShell>{element}</AppShell>
    </ProtectedRoute>
  )

  return (
    <div className="app-root">
      <Background />
      <main className="content">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<OnboardingQuiz />} />
            <Route path="/dashboard" element={withShell(<Dashboard />)} />
            <Route path="/chat" element={withShell(<AIChat />)} />
            <Route path="/vision" element={withShell(<ComputerVision />)} />
            <Route path="/analytics" element={withShell(<Analytics />)} />
            <Route path="/nutrition" element={withShell(<AppStore />)} />
            <Route path="/gallery" element={withShell(<ProgressGallery />)} />
            <Route path="/shopping-cart" element={withShell(<ShoppingCart />)} />
            <Route path="/integrations" element={withShell(<Integrations />)} />
            <Route path="/counter" element={withShell(<RepCounter />)} />
            <Route path="/settings" element={withShell(<Settings />)} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  )
}
