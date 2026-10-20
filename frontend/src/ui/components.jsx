import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

const cx = (...parts) => parts.filter(Boolean).join(' ')

export function Button({
  variant = 'default',
  size,
  block = false,
  loading = false,
  icon: Icon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cx('btn', variant !== 'default' && `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : Icon ? <Icon size={18} aria-hidden="true" /> : null}
      {children}
    </button>
  )
}

export function Card({ tone, flush = false, interactive = false, className, children, ...props }) {
  return (
    <section
      className={cx('card', tone && `card--${tone}`, flush && 'card--flush', interactive && 'card--interactive', className)}
      {...props}
    >
      {children}
    </section>
  )
}

export function CardHeader({ icon: Icon, tone, title, subtitle, action }) {
  return (
    <div className="card-header">
      <div className="row grow">
        {Icon && (
          <span className={cx('icon-tile', tone && `icon-tile--${tone}`)}>
            <Icon size={20} />
          </span>
        )}
        <div className="grow">
          <h3 className="card-title">{title}</h3>
          {subtitle && <p className="muted small">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <header className="page-header">
      <div className="grow">
        {eyebrow && <div className="eyebrow gold">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function Field({ label, htmlFor, hint, children, className }) {
  return (
    <div className={cx('field', className)}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint && <span className="tiny dim">{hint}</span>}
    </div>
  )
}

export function Input({ className, ...props }) {
  return <input className={cx('input', className)} {...props} />
}

export function Textarea({ className, ...props }) {
  return <textarea className={cx('textarea', className)} {...props} />
}

export function Select({ options = [], className, ...props }) {
  return (
    <select className={cx('select', className)} {...props}>
      {options.map((option) => {
        const value = typeof option === 'string' ? option : option.value
        const label = typeof option === 'string' ? option : option.label
        return (
          <option key={value} value={value}>
            {label}
          </option>
        )
      })}
    </select>
  )
}

export function Badge({ tone, icon: Icon, children, className }) {
  return (
    <span className={cx('badge', tone && `badge--${tone}`, className)}>
      {Icon && <Icon size={12} aria-hidden="true" />}
      {children}
    </span>
  )
}

export function ProgressBar({ value = 0, tone, size, label }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div
      className={cx('bar', size === 'sm' && 'bar--sm')}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={cx('bar__fill', tone && `bar__fill--${tone}`)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Stat({ label, value, hint, valueClassName }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className={cx('stat__value', valueClassName)}>{value}</span>
      {hint && <span className="stat__hint">{hint}</span>}
    </div>
  )
}

const ALERT_ICONS = { error: AlertCircle, success: CheckCircle2, info: Info }

export function Alert({ tone = 'info', children }) {
  const Icon = ALERT_ICONS[tone] || Info
  return (
    <div className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={16} />
      <div className="grow">{children}</div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && <Icon size={40} strokeWidth={1.5} />}
      {title && <h3 style={{ color: 'var(--text)' }}>{title}</h3>}
      {children && <p className="small" style={{ maxWidth: '42ch' }}>{children}</p>}
      {action}
    </div>
  )
}

export function Spinner({ label = 'Loading' }) {
  return <span className="spinner" role="status" aria-label={label} />
}

export function Skeleton({ height = 16, width = '100%', style }) {
  return <div className="skeleton" style={{ height, width, ...style }} aria-hidden="true" />
}

export function Switch({ checked, onChange, label, id }) {
  return (
    <span className="switch">
      <input id={id} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="switch__track" />
    </span>
  )
}
