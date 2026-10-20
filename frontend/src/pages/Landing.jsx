import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  AnalyticsUpIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Camera01Icon,
  Cancel01Icon,
  Dumbbell01Icon,
  FireIcon,
  LockPasswordIcon,
  Mail01Icon,
  Menu01Icon,
  Notebook01Icon,
  QuoteDownIcon,
  Task01Icon,
  User03Icon,
  WebcamIcon,
} from '@hugeicons/core-free-icons'
import { isAuthenticated, loginAsDemo } from '../services/api'
import { registerAccount } from '../lib/auth'
import Logo from '../components/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import '../styles/landing.css'

const NAV = [
  { href: '#how', label: 'How it works' },
  { href: '#training', label: 'Training' },
  { href: '#coaching', label: 'Coaching' },
  { href: '#join', label: 'Join' },
]

const WHY = [
  { icon: WebcamIcon, title: 'Count every rep', text: 'with your camera, no wearables' },
  { icon: FireIcon, title: 'Keep the streak alive', text: 'with a plan for every day' },
  { icon: Notebook01Icon, title: 'Know what you eat', text: 'from a photo of your plate' },
  { icon: AnalyticsUpIcon, title: 'See real progress', text: 'in reps, form and photos' },
  { icon: Dumbbell01Icon, title: 'Fix your form', text: 'with cues while you lift' },
  { icon: Camera01Icon, title: 'Review any set', text: 'by uploading a video' },
]

const STEPS = [
  { icon: User03Icon, title: 'Set up your profile', text: 'Your goal, body stats and diet. It takes about a minute.' },
  { icon: Task01Icon, title: 'Get today’s plan', text: 'A daily workout built around your goal. Edit it or regenerate it any time.' },
  { icon: Calendar03Icon, title: 'Train and track', text: 'Count reps on camera, log meals and keep your streak going.' },
]

const MOVES = [
  { image: '/landing/squat.webp', title: 'Squats', tag: 'Hip & knee angle', text: 'Counts a rep only when you hit depth and stand all the way up.' },
  { image: '/landing/pushup.webp', title: 'Push-ups', tag: 'Shoulder & elbow angle', text: 'Flags short reps and sagging hips while you move.' },
  { image: '/landing/curl.webp', title: 'Bicep curls', tag: 'Both arms tracked', text: 'Rejects one-arm cheats and half reps, so every count is honest.' },
  { image: '/landing/pullup.webp', title: 'Any lift, on video', tag: 'Upload a clip', text: 'Upload a recorded set for a form score, rep estimate and calories.' },
]

// Real cues the Workout Coach shows during a set.
const CUES = [
  { cue: 'Drive through your heels. Core tight, chest up.', exercise: 'Squats' },
  { cue: 'Keep your elbows close to your body and hold a straight plank line.', exercise: 'Push-ups' },
  { cue: 'Keep your elbow stationary and lower the weight slowly.', exercise: 'Bicep curls' },
]

// Advances a carousel every `ms`, pausing while hovered/focused and when the
// visitor prefers reduced motion.
function useAutoAdvance(setIndex, length, ms) {
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = setInterval(() => setIndex((i) => (i + 1) % length), ms)
    return () => clearInterval(timer)
  }, [paused, setIndex, length, ms])
  return {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: () => setPaused(false),
  }
}

function Icon({ icon, className, size = 20 }) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={1.8} className={className} />
}

function Wordmark({ large = false }) {
  return <Logo size={large ? 'xl' : 'md'} />
}

function SectionTitle({ title, text, className }) {
  return (
    <div className={cn('mx-auto max-w-2xl text-center', className)}>
      <h2 className="text-[clamp(2rem,4.5vw,3rem)] leading-tight font-bold text-[#e8ecf1]">{title}</h2>
      {text && <p className="mt-4 text-lg text-muted-foreground">{text}</p>}
    </div>
  )
}

function RoundArrow({ direction, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="btn-texture grid size-10 shrink-0 place-items-center rounded-full border-2 border-gold-deep bg-gold-ink text-gold sm:size-11 transition-transform hover:scale-105 active:scale-95"
    >
      <Icon icon={direction === 'left' ? ArrowLeft01Icon : ArrowRight01Icon} />
    </button>
  )
}

function SignupForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const fields = [
    { key: 'username', label: 'Username', icon: User03Icon, type: 'text', autoComplete: 'username' },
    { key: 'email', label: 'Email address', icon: Mail01Icon, type: 'email', autoComplete: 'email' },
    { key: 'password', label: 'Password (8+ characters)', icon: LockPasswordIcon, type: 'password', autoComplete: 'new-password' },
  ]

  const submit = async (event) => {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      await registerAccount(form)
      queryClient.clear()
      navigate({ to: '/onboarding' })
    } catch (err) {
      setError(err.message || 'Could not create your account.')
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-x-8 gap-y-5 sm:grid-cols-2 sm:gap-y-7">
      {fields.map((field) => (
        <label key={field.key} className={cn('flex flex-col gap-2', field.key === 'password' && 'sm:col-span-2')}>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon icon={field.icon} size={16} />
            {field.label}
          </span>
          <input
            type={field.type}
            autoComplete={field.autoComplete}
            value={form[field.key]}
            onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
            className="h-10 border-0 border-b border-input bg-transparent px-0 text-base text-[#e8ecf1] outline-none transition-colors focus:border-gold"
          />
        </label>
      ))}
      {error && <p role="alert" className="text-sm text-[#f58f91] sm:col-span-2">{error}</p>}
      <Button type="submit" variant="quest" size="xl" disabled={pending} className="sm:col-span-2">
        {pending ? 'Creating your account…' : 'Create free account'}
      </Button>
      <p className="text-sm text-muted-foreground sm:col-span-2">
        Already training with us? <Link to="/login" className="font-semibold text-gold underline underline-offset-4">Sign in</Link>
      </p>
    </form>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const authenticated = isAuthenticated()
  const [menuOpen, setMenuOpen] = useState(false)
  const [move, setMove] = useState(0)
  const [cue, setCue] = useState(0)
  const [demoPending, setDemoPending] = useState(false)

  const moveAuto = useAutoAdvance(setMove, MOVES.length, 4500)
  const cueAuto = useAutoAdvance(setCue, CUES.length, 6000)

  const startDemo = async () => {
    setDemoPending(true)
    try {
      await loginAsDemo()
      queryClient.clear()
      navigate({ to: '/dashboard' })
    } catch {
      setDemoPending(false)
    }
  }

  const primary = authenticated ? { to: '/dashboard', label: 'Open dashboard' } : { to: '/register', label: 'Start training' }
  const shift = (delta, length, setter) => setter((i) => (i + delta + length) % length)
  const visibleMoves = [-1, 0, 1].map((offset) => ({ offset, ...MOVES[(move + offset + MOVES.length) % MOVES.length] }))

  return (
    <div className="landing-root overflow-x-hidden">
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <header className="relative z-30 mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Wordmark />
          <nav className="hidden items-center gap-8 text-sm text-[#d7dee6] lg:flex" aria-label="Sections">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-white">{item.label}</a>
            ))}
          </nav>
          <div className="hidden items-center gap-5 lg:flex">
            {!authenticated && <Link to="/login" className="text-sm text-[#d7dee6] transition-colors hover:text-white">Sign in →</Link>}
            <Button asChild variant="quest" size="sm" className="px-5">
              <Link to={primary.to}>{authenticated ? 'Dashboard' : 'Join free'}</Link>
            </Button>
          </div>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-xs border border-border text-[#e8ecf1] lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <Icon icon={menuOpen ? Cancel01Icon : Menu01Icon} />
          </button>
        </header>

        {menuOpen && (
          <div className="absolute inset-x-4 top-20 z-40 border border-border bg-[#181b26] p-4 lg:hidden">
            <nav className="flex flex-col" aria-label="Sections">
              {NAV.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="px-3 py-3 text-[#d7dee6] hover:bg-white/5">
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {!authenticated && (
                <Button asChild variant="questGhost" size="sm">
                  <Link to="/login">Sign in</Link>
                </Button>
              )}
              <Button asChild variant="quest" size="sm" className={cn(authenticated && 'col-span-2')}>
                <Link to={primary.to}>{authenticated ? 'Dashboard' : 'Join free'}</Link>
              </Button>
            </div>
          </div>
        )}

        <div className="mx-auto flex max-w-4xl flex-col items-center px-5 pt-16 pb-24 text-center sm:px-8 sm:pt-24 sm:pb-32">
          <h1 className="landing-rise text-[clamp(2.8rem,8vw,6rem)] leading-[1] font-extrabold text-[#e8ecf1]">
            Train harder,
            <br />
            count every <span className="text-metal text-metal--gold">rep.</span>
          </h1>
          <p className="landing-rise mt-7 max-w-xl text-lg leading-relaxed text-[#d7dee6] sm:text-xl">
            Your camera counts every rep, flags sloppy form and logs the session. Pair it with meal tracking and a daily plan built around your goal.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3">
            <Button asChild variant="quest" size="xl">
              <Link to={primary.to}>{primary.label}</Link>
            </Button>
            <p className="text-sm text-[#818a98]">(free, takes about a minute)</p>
            {!authenticated && (
              <button type="button" onClick={startDemo} disabled={demoPending} className="mt-2 text-sm text-[#d7dee6] underline underline-offset-4 hover:text-white disabled:opacity-60">
                {demoPending ? 'Opening demo…' : 'Try the demo first →'}
              </button>
            )}
          </div>
          <div className="mt-16 grid w-full max-w-2xl grid-cols-3 gap-6 border-t border-border pt-8">
            {[
              ['33', 'body points tracked'],
              ['3', 'exercises auto-counted'],
              ['0', 'video uploaded while you train'],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="font-serif text-4xl leading-none font-extrabold text-gold sm:text-5xl">{value}</p>
                <p className="mt-2 text-xs text-muted-foreground sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider-gem" />

      {/* ---------- Why ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <SectionTitle title="Guesswork doesn’t build muscle" text="Everything you need to train well, in one place." />
        <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-10 sm:gap-y-10 lg:grid-cols-3">
          {WHY.map((item) => (
            <div key={item.title} className="flex flex-col gap-2">
              <Icon icon={item.icon} size={26} className="text-gold" />
              <h3 className="font-sans text-base font-medium tracking-normal text-[#e8ecf1] sm:text-xl">{item.title}</h3>
              <p className="text-sm text-[#919dab] sm:text-base">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="divider-wood" />

      {/* ---------- How it works ---------- */}
      <section id="how" className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:py-24 sm:px-8 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <h2 className="text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.05] font-bold text-[#e8ecf1]">Your path to a stronger, healthier you</h2>
          <p className="mx-auto mt-6 max-w-md text-lg text-muted-foreground lg:mx-0">Three steps and you are training with feedback on every rep.</p>
        </div>
        <div className="flex flex-col gap-4">
          {STEPS.map((step, index) => {
            const highlighted = index === 1
            return (
              <Card
                key={step.title}
                className={cn(
                  'flex-row items-start gap-4 rounded-xs px-6',
                  highlighted ? 'border-2 border-gold-deep bg-gold-ink/70 lg:-ml-10' : 'border-border',
                )}
              >
                <span className={cn('grid size-11 shrink-0 place-items-center rounded-full border', highlighted ? 'border-gold-deep text-gold' : 'border-border text-[#b2c1d0]')}>
                  <Icon icon={step.icon} />
                </span>
                <div>
                  <h3 className={cn("font-sans text-lg font-semibold tracking-normal", highlighted ? 'text-gold' : 'text-[#e8ecf1]')}>{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      <div className="divider-wood" />

      {/* ---------- Training carousel ---------- */}
      <section id="training" className="relative overflow-hidden py-16 sm:py-24">
        <SectionTitle title="The camera counts. You lift." text="Pose tracking runs in your browser, so video never leaves your device." className="px-5" />

        <div className="relative mx-auto mt-14 flex max-w-6xl items-center justify-center gap-6 px-5" {...moveAuto}>
          {visibleMoves.map((item) => (
            <Card
              key={`${item.title}-${item.offset}`}
              aria-hidden={item.offset !== 0}
              className={cn(
                'w-[min(380px,82vw)] shrink-0 gap-4 overflow-hidden rounded-xs p-3 transition-all duration-500',
                item.offset === 0 ? 'z-10 border-gold-deep' : 'hidden scale-90 opacity-40 md:flex',
              )}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-xs bg-ink">
                <img src={item.image} alt={item.offset === 0 ? item.title : ''} loading="lazy" className="size-full object-cover" />
                <span className="absolute bottom-3 left-3 rounded-full border border-gold-deep bg-ink/80 px-3 py-1 text-xs text-gold">{item.tag}</span>
              </div>
              <CardHeader className="px-2 pb-2">
                <CardTitle className="font-serif text-2xl font-bold text-[#e8ecf1]">{item.title}</CardTitle>
                <CardDescription>{item.text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
          <div className="pointer-events-none absolute inset-x-1 top-[38%] flex -translate-y-1/2 justify-between sm:inset-x-6 md:top-1/2 [&>button]:pointer-events-auto">
            <RoundArrow direction="left" label="Previous exercise" onClick={() => shift(-1, MOVES.length, setMove)} />
            <RoundArrow direction="right" label="Next exercise" onClick={() => shift(1, MOVES.length, setMove)} />
          </div>
        </div>
      </section>

      <div className="divider-wood" />

      {/* ---------- Coaching cues ---------- */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <img src="/landing/dark-gym.webp" alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-15" />
        <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
          <SectionTitle title="Cues while you train" text="Workout Coach talks you through each set, so you fix form mid-rep instead of after." />
          <div className="mt-12 flex min-h-[220px] items-center gap-4" {...cueAuto}>
            <span className="hidden sm:block"><RoundArrow direction="left" label="Previous cue" onClick={() => shift(-1, CUES.length, setCue)} /></span>
            <figure className="flex-1" aria-live="polite">
              <Icon icon={QuoteDownIcon} size={46} className="mx-auto text-gold" />
              <blockquote key={cue} className="landing-rise mt-6 font-serif text-[clamp(1.35rem,2.8vw,2rem)] leading-snug text-[#e8ecf1]">
                {CUES[cue].cue}
              </blockquote>
              <figcaption className="mt-6 inline-flex rounded-full border border-gold-deep px-4 py-1.5 text-sm text-gold">{CUES[cue].exercise}</figcaption>
            </figure>
            <span className="hidden sm:block"><RoundArrow direction="right" label="Next cue" onClick={() => shift(1, CUES.length, setCue)} /></span>
          </div>
        </div>
      </section>

      <div className="divider-wood" />

      {/* ---------- Coach ---------- */}
      <section id="coaching" className="py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <h2 className="text-metal text-metal--gold text-[clamp(2.6rem,6vw,4.6rem)] leading-[0.98] font-extrabold">
              A coach that
              <br />
              knows your
              <br />
              numbers
            </h2>
          </div>
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <img
              src="/landing/coach.webp"
              alt="Athlete training with dumbbells"
              loading="lazy"
              className="mb-8 aspect-[4/5] w-full max-w-xs rounded-xs border-2 border-gold-deep object-cover lg:aspect-[16/10] lg:max-w-none"
            />
            <p className="text-lg leading-relaxed text-muted-foreground">
              Ask about meals, sleep or recovery and get answers that use your goal, weight, diet and training history. Upload blood reports and the advice adapts to those too.
            </p>
            <ul className="mt-6 flex flex-col items-start gap-3 text-left text-[#d7dee6]">
              {['Plans built around your goal', 'Calories and macros from a photo of your plate', 'Heart health check with next steps'].map((line) => (
                <li key={line} className="flex items-center gap-3">
                  <span className="size-2 rotate-45 bg-gold" />
                  {line}
                </li>
              ))}
            </ul>
            <Button asChild variant="quest" size="xl" className="mt-8">
              <Link to={primary.to}>{primary.label}</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="divider-wood" />

      {/* ---------- Join ---------- */}
      <section id="join" className="mx-auto max-w-7xl px-5 py-16 sm:py-24 sm:px-8">
        <Card className="grid gap-8 rounded-xs border-border px-5 py-8 sm:gap-12 sm:px-12 sm:py-12 lg:grid-cols-[0.9fr_1.1fr]">
          <CardHeader className="px-0 text-center lg:text-left">
            <CardTitle className="font-serif text-[clamp(2rem,4.4vw,3rem)] leading-[1.05] font-bold text-[#e8ecf1]">Start your free plan</CardTitle>
            <CardDescription className="mx-auto mt-3 max-w-sm text-base lg:mx-0">Create an account and set up your profile. Your first workout plan is ready the moment you finish.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {authenticated ? (
              <div className="flex flex-col items-start gap-4">
                <p className="text-muted-foreground">You are already signed in.</p>
                <Button asChild variant="quest" size="xl">
                  <Link to="/dashboard">Go to dashboard</Link>
                </Button>
              </div>
            ) : (
              <SignupForm />
            )}
          </CardContent>
        </Card>
      </section>

      {/* ---------- Footer ---------- */}
      <div className="divider-gem" />
      <footer className="landing-footer py-16 text-center">
        <Wordmark large />
        <p className="mt-3 text-sm text-[#a3b3c7]">Train smarter, every rep.</p>
        <div className="mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/10 px-5 pt-6 text-xs text-[#a3b3c7] sm:flex-row sm:px-8">
          <span>© {new Date().getFullYear()} ARIZE. All rights reserved.</span>
          <span className="flex items-center gap-2"><Icon icon={WebcamIcon} size={14} /> Video stays on your device</span>
          <span>Photos: Unsplash</span>
        </div>
      </footer>
    </div>
  )
}
