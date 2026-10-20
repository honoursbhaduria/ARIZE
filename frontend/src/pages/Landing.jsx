import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Camera,
  Check,
  Dumbbell,
  Flame,
  HeartPulse,
  Image,
  MessageSquare,
  Music,
  ScanLine,
  Sparkles,
  Trophy,
  Utensils,
} from 'lucide-react'
import { isAuthenticated, loginAsDemo } from '../services/api'
import { Badge, ProgressBar } from '../ui/components'
import '../styles/landing.css'

const PATHS = [
  {
    title: 'Build Muscle',
    tone: 'gold',
    blurb: 'Stack reps, chase progressive overload and hit your protein every day.',
    perks: ['AI rep counter for squats, push-ups and curls', 'Protein-first nutrition finder', 'Strength-focused AI workout plans'],
  },
  {
    title: 'Burn Fat',
    tone: 'violet',
    blurb: 'Turn consistency into a game: daily quests, streaks and calorie tracking.',
    perks: ['Calories burned vs eaten, every day', 'Streak tracking + district leaderboard', 'HIIT and cardio music mixes'],
  },
  {
    title: 'Stay Balanced',
    tone: 'green',
    blurb: 'Move well, recover well. Posture checks, heart health and mindful sessions.',
    perks: ['Posture reading for every exercise', 'Heart health risk check', 'Zen and recovery coach modes'],
  },
]

const FEATURES = [
  { icon: Dumbbell, tone: 'gold', title: 'Workout Coach', text: 'Your webcam counts reps in real time and rejects sloppy ones.' },
  { icon: ScanLine, tone: 'violet', title: 'Vision Lab', text: 'Upload a training clip and get form score, reps and burn.' },
  { icon: MessageSquare, tone: 'blue', title: 'AI Coach', text: 'Ask anything. Upload medical reports so advice fits your body.' },
  { icon: Utensils, tone: 'orange', title: 'Nutrition', text: 'Type a meal or snap a photo to get calories and macros instantly.' },
  { icon: HeartPulse, tone: 'red', title: 'Heart Health', text: 'A quick questionnaire estimates your hypertension stage.' },
  { icon: Flame, tone: 'orange', title: 'Streaks & Leaderboard', text: 'Keep the fire alive and climb your district rankings.' },
  { icon: Image, tone: 'green', title: 'Progress Gallery', text: 'A private timeline of your transformation photos.' },
  { icon: Music, tone: 'violet', title: 'Session Audio', text: 'Mood-matched playlists for cardio, strength, HIIT or yoga.' },
]

const FAQS = [
  {
    q: 'Do I need any equipment?',
    a: 'No. A phone or laptop camera is enough for rep counting and posture feedback. Dumbbells are optional for curls.',
  },
  {
    q: 'Is my camera feed uploaded?',
    a: 'Live rep counting runs entirely in your browser. Only the final session summary (reps, duration, form score) is saved to your account.',
  },
  {
    q: 'How do levels and XP work?',
    a: 'Every rep, session and streak day earns XP. XP fills your level bar, and higher levels unlock new titles from Rookie to Legend.',
  },
  {
    q: 'Can I try it without signing up?',
    a: 'Yes. Hit "Try the demo" to jump into a ready-made account and explore every feature.',
  },
  {
    q: 'Is the medical advice a diagnosis?',
    a: 'No. AI Coach and Heart Health give educational guidance only. Always talk to a doctor about medical decisions.',
  },
]

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] },
}

export default function Landing() {
  const navigate = useNavigate()
  const authenticated = isAuthenticated()
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState('')

  const startDemo = async () => {
    setDemoLoading(true)
    setDemoError('')
    try {
      await loginAsDemo()
      navigate({ to: '/dashboard' })
    } catch (err) {
      setDemoError(err.message || 'Demo is unavailable right now.')
      setDemoLoading(false)
    }
  }

  const primaryCta = authenticated
    ? { to: '/dashboard', label: 'Continue training' }
    : { to: '/register', label: 'Start training' }

  return (
    <div className="landing">
      <nav className="l-nav">
        <div className="l-nav__inner">
          <Link to="/" className="brand">
            <span className="brand__mark"><Dumbbell size={18} strokeWidth={2.6} /></span>
            ARIZE
          </Link>
          <div className="l-nav__links">
            <a href="#paths">Paths</a>
            <a href="#arsenal">Features</a>
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="l-nav__actions">
            {authenticated ? (
              <Link to="/dashboard" className="btn btn--primary btn--sm">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn btn--ghost btn--sm l-nav__signin">Sign in</Link>
                <Link to="/register" className="btn btn--primary btn--sm">Join free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="hero__grid">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge tone="violet" icon={Sparkles}>AI fitness, built like a game</Badge>
            <h1 style={{ marginTop: 18 }}>
              Level up your body. <span className="hl">One rep at a time.</span>
            </h1>
            <p className="hero__lead">
              ARIZE turns training into a quest. Your camera counts every rep and checks your form, the AI coach plans
              your workouts and meals, and every session earns XP toward your next level.
            </p>
            <div className="hero__ctas">
              <Link to={primaryCta.to} className="btn btn--primary btn--lg">
                {primaryCta.label} <ArrowRight size={20} />
              </Link>
              {!authenticated && (
                <button type="button" className="hero__secondary" onClick={startDemo} disabled={demoLoading}>
                  {demoLoading ? <span className="spinner" /> : <Sparkles size={16} />}
                  Try the demo
                </button>
              )}
            </div>
            <p className="hero__note" style={{ marginTop: 12 }}>Free to start · takes about a minute</p>
            {demoError && <p className="small red" style={{ marginTop: 8 }}>{demoError}</p>}
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }}>
            <div className="hud-mock" aria-hidden="true">
              <div className="hud-mock__video">
                <video src="/hero-video.mp4" autoPlay loop muted playsInline poster="/image.png" />
                <div className="hud-mock__rep">
                  <div className="eyebrow" style={{ fontSize: '0.62rem' }}>Reps</div>
                  <div className="mono" style={{ fontSize: '1.7rem', fontWeight: 700, lineHeight: 1 }}>12<span className="dim">/20</span></div>
                </div>
                <div className="hud-mock__form"><Badge tone="green">Form: clean</Badge></div>
              </div>
              <div className="spread" style={{ marginBottom: 8 }}>
                <span className="eyebrow gold">Lv 7 · Rep Knight</span>
                <span className="mono tiny muted">1,420 / 1,750 XP</span>
              </div>
              <ProgressBar value={81} label="XP" />
              <div className="stack-sm" style={{ marginTop: 16 }}>
                <div className="quest-row quest-row--done"><span className="quest-row__check"><Check size={14} strokeWidth={3} /></span>Squats · 3×12<span className="grow" /><span className="mono tiny gold">36 reps</span></div>
                <div className="quest-row"><span className="quest-row__check" />Push-ups · 3×12<span className="grow" /><span className="mono tiny muted">36 reps</span></div>
                <div className="quest-row"><span className="quest-row__check" />Plank · 3×30s<span className="grow" /><span className="mono tiny muted">90 sec</span></div>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      <div className="stats-strip">
        <div className="stats-strip__inner">
          <div className="stat"><span className="stat__value">33</span><span className="stat__label">Body landmarks tracked</span></div>
          <div className="stat"><span className="stat__value">3</span><span className="stat__label">Exercises auto-counted</span></div>
          <div className="stat"><span className="stat__value">7</span><span className="stat__label">Rank titles to unlock</span></div>
          <div className="stat"><span className="stat__value">24/7</span><span className="stat__label">AI coach on call</span></div>
        </div>
      </div>

      <section id="paths" className="landing-section">
        <motion.div {...fadeUp}>
          <h2 className="section-title">Pick your path</h2>
          <p className="section-sub">Choose a goal during setup and ARIZE tunes your workouts, meals and coaching to match. Switch any time.</p>
        </motion.div>
        <div className="path-grid">
          {PATHS.map((path, index) => (
            <motion.div key={path.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: index * 0.08 }} className={`card card--${path.tone} card--interactive path-card`}>
              <Badge tone={path.tone}>Path {index + 1}</Badge>
              <h3>{path.title}</h3>
              <p className="muted">{path.blurb}</p>
              <ul>
                {path.perks.map((perk) => <li key={perk}><Check size={16} strokeWidth={3} />{perk}</li>)}
              </ul>
              <Link to={authenticated ? '/dashboard' : '/register'} className="btn btn--ghost btn--block">Choose {path.title}</Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="arsenal" className="landing-section" style={{ paddingTop: 0 }}>
        <motion.div {...fadeUp}>
          <h2 className="section-title">Your training arsenal</h2>
          <p className="section-sub">Everything you need in one place. No spreadsheets, no guesswork.</p>
        </motion.div>
        <div className="feature-grid">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div key={feature.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: (index % 4) * 0.06 }} className="card card--interactive feature-card">
                <span className={`icon-tile icon-tile--${feature.tone}`}><Icon size={20} /></span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="coach">
          <motion.div {...fadeUp} className="stack">
            <Badge tone="gold" icon={Trophy}>Meet your coach</Badge>
            <h2>A coach that remembers you</h2>
            <p className="muted" style={{ fontSize: '1.05rem' }}>
              The AI coach knows your goal, weight, diet and even your uploaded medical reports. Ask what to eat after
              leg day, how to fix your squat depth or how to sleep better, and get answers that fit you.
            </p>
            <p className="muted">Tap the floating dumbbell any time to switch between Beast, Zen and Recovery modes.</p>
          </motion.div>
          <motion.div {...fadeUp} className="card coach__mock" aria-hidden="true">
            <div className="bubble bubble--user">What should I eat after leg day?</div>
            <div className="bubble bubble--ai">
              Aim for ~35g protein within two hours. Since you&apos;re vegetarian: paneer bhurji with two rotis and a
              banana gets you there, with carbs to refill glycogen. 💪
              <div className="bubble__meta">AI Coach · personalised</div>
            </div>
            <div className="bubble bubble--user">And my squat depth?</div>
            <div className="bubble bubble--ai">Your last session flagged 3 shallow reps. Pause 1s at the bottom for your next set.</div>
          </motion.div>
        </div>
      </section>

      <section id="how" className="landing-section" style={{ paddingTop: 0 }}>
        <motion.div {...fadeUp}>
          <h2 className="section-title">How it works</h2>
        </motion.div>
        <div className="steps">
          {[
            { title: 'Create your hero', text: 'Sign up in seconds with email or Google, or jump straight into the demo.' },
            { title: 'Calibrate', text: 'A quick setup quest captures your goal, body metrics, diet and training level.' },
            { title: 'Train & level up', text: 'Complete daily quests, let the camera count your reps and watch your XP climb.' },
          ].map((step, index) => (
            <motion.div key={step.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: index * 0.08 }} className="card step">
              <div className="step__num">{index + 1}</div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="faq" className="landing-section" style={{ paddingTop: 0 }}>
        <h2 className="section-title">Frequently asked questions</h2>
        <div className="faq">
          {FAQS.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <motion.div {...fadeUp} className="final-cta">
          <Camera size={36} style={{ margin: '0 auto 16px', color: 'var(--gold)' }} />
          <h2>Your first quest is waiting</h2>
          <p>Set up in about a minute, then let the camera count your first set.</p>
          <Link to={primaryCta.to} className="btn btn--primary btn--lg">
            {primaryCta.label} <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>

      <footer className="l-footer">
        <div className="l-footer__inner">
          <span>© {new Date().getFullYear()} ARIZE. Train smart, recover hard.</span>
          <div className="l-footer__links">
            <a href="#paths">Paths</a>
            <a href="#arsenal">Features</a>
            <a href="#faq">FAQ</a>
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
