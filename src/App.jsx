import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import Background from './components/Background'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import AIChat from './pages/AIChat'
import ComputerVision from './pages/ComputerVision'
import Analytics from './pages/Analytics'
import AppStore from './pages/AppStore'
import Integrations from './pages/Integrations'
import RepCounter from './pages/RepCounter'
import './App.css'

export default function App() {
  const location = useLocation()

  return (
    <div className="app-root">
      <Background />
      <Navbar />
      <main className="content">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={<AIChat />} />
            <Route path="/vision" element={<ComputerVision />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/nutrition" element={<AppStore />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/counter" element={<RepCounter />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  )
}
