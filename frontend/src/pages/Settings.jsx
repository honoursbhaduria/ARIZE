import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Bell, Camera, KeyRound, Save, Shield, User } from 'lucide-react'
import { changePassword } from '../services/api'
import { logActivity } from '../services/activityFeed'
import { notificationPrefsQuery, profileQuery, useUpdateNotificationPrefs, useUpdateProfile, useUploadProgressPhoto } from '../lib/queries'
import { DIET_OPTIONS, GENDER_OPTIONS, GOAL_OPTIONS, cleanProfilePayload } from '../lib/profile'
import { Alert, Button, Card, CardHeader, Field, Input, PageHeader, Select, Skeleton, Switch } from '../ui/components'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/toast-context'
import LocationPicker from '../components/LocationPicker'

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: '0–1 sessions / week' },
  { value: 'moderate', label: '2–4 sessions / week' },
  { value: 'heavy', label: '5+ sessions / week' },
]

const PREF_ITEMS = [
  { key: 'workout_reminders', label: 'Workout reminders', hint: 'A nudge when it’s time to train' },
  { key: 'streak_alerts', label: 'Streak alerts', hint: 'Warnings before your streak breaks' },
  { key: 'diet_suggestions', label: 'Diet suggestions', hint: 'Meal ideas based on your goal' },
  { key: 'whatsapp_updates', label: 'WhatsApp updates', hint: 'Weekly progress summaries' },
]

function ProfileForm({ initial }) {
  const toast = useToast()
  const update = useUpdateProfile()
  const [profile, setProfile] = useState(() => ({
    age: initial?.age ?? '',
    weight: initial?.weight ?? '',
    height: initial?.height ?? '',
    district: initial?.district || 'global',
    goal: initial?.goal || 'maintenance',
    diet_type: initial?.diet_type || 'vegetarian',
    gender: initial?.gender || 'other',
    activity_level: initial?.activity_level || 'moderate',
  }))
  const set = (key) => (event) => setProfile((prev) => ({ ...prev, [key]: event.target.value }))

  const save = (event) => {
    event.preventDefault()
    update.mutate(cleanProfilePayload(profile), {
      onSuccess: () => {
        toast.success('Profile updated')
        logActivity({
          source: 'Settings',
          action: 'Profile updated',
          details: `Goal: ${profile.goal}, diet: ${profile.diet_type}, district: ${profile.district}`,
          meta: { goal: profile.goal, diet_type: profile.diet_type, district: profile.district },
        })
      },
      onError: (err) => toast.error(err.message || 'Could not save profile'),
    })
  }

  return (
    <form className="stack" onSubmit={save}>
      <div className="grid-2">
        <Field label="Age" htmlFor="s-age"><Input id="s-age" type="number" inputMode="numeric" min={0} value={profile.age} onChange={set('age')} /></Field>
        <Field label="Weight (kg)" htmlFor="s-weight"><Input id="s-weight" type="number" inputMode="decimal" min={0} step="0.1" value={profile.weight} onChange={set('weight')} /></Field>
        <Field label="Height (cm)" htmlFor="s-height"><Input id="s-height" type="number" inputMode="decimal" min={0} step="0.5" value={profile.height} onChange={set('height')} /></Field>
        <Field label="Gender" htmlFor="s-gender"><Select id="s-gender" options={GENDER_OPTIONS} value={profile.gender} onChange={set('gender')} /></Field>
        <Field label="Training level" htmlFor="s-activity"><Select id="s-activity" options={ACTIVITY_OPTIONS} value={profile.activity_level} onChange={set('activity_level')} /></Field>
        <Field label="Goal" htmlFor="s-goal"><Select id="s-goal" options={GOAL_OPTIONS} value={profile.goal} onChange={set('goal')} /></Field>
        <Field label="Diet type" htmlFor="s-diet"><Select id="s-diet" options={DIET_OPTIONS} value={profile.diet_type} onChange={set('diet_type')} /></Field>
      </div>
      <Field label="City" htmlFor="s-district" hint="Used for your local leaderboard">
        <LocationPicker id="s-district" value={profile.district} onChange={(label) => setProfile((prev) => ({ ...prev, district: label }))} />
      </Field>
      <Button type="submit" variant="primary" icon={Save} loading={update.isPending} block>Save profile</Button>
    </form>
  )
}

function PreferencesForm({ initial }) {
  const toast = useToast()
  const update = useUpdateNotificationPrefs()
  const [prefs, setPrefs] = useState(() => ({
    workout_reminders: true,
    streak_alerts: true,
    diet_suggestions: true,
    whatsapp_updates: false,
    ...(initial || {}),
  }))

  const save = () =>
    update.mutate(prefs, {
      onSuccess: () => {
        toast.success('Preferences saved')
        const enabled = PREF_ITEMS.filter((item) => prefs[item.key]).map((item) => item.key)
        logActivity({
          source: 'Settings',
          action: 'Notification preferences updated',
          details: enabled.length ? `Enabled: ${enabled.join(', ')}` : 'All reminders turned off.',
          meta: { enabled },
        })
      },
      onError: (err) => toast.error(err.message || 'Could not save preferences'),
    })

  return (
    <div className="stack">
      <ul className="list">
        {PREF_ITEMS.map((item) => (
          <li key={item.key} className="list-row">
            <label htmlFor={`pref-${item.key}`} className="grow" style={{ cursor: 'pointer' }}>
              <strong style={{ display: 'block' }}>{item.label}</strong>
              <span className="tiny muted">{item.hint}</span>
            </label>
            <Switch id={`pref-${item.key}`} label={item.label} checked={prefs[item.key]} onChange={(checked) => setPrefs((prev) => ({ ...prev, [item.key]: checked }))} />
          </li>
        ))}
      </ul>
      <Button variant="violet" loading={update.isPending} onClick={save} block>Update preferences</Button>
    </div>
  )
}

function PhotoByUrl() {
  const toast = useToast()
  const upload = useUploadProgressPhoto()
  const [form, setForm] = useState({ image_url: '', note: '' })

  const submit = (event) => {
    event.preventDefault()
    if (!/^https?:\/\//i.test(form.image_url.trim())) {
      toast.error('Enter a full image URL starting with http(s)://')
      return
    }
    upload.mutate({ image_url: form.image_url.trim(), note: form.note }, {
      onSuccess: () => {
        toast.success('Photo added to your gallery')
        logActivity({ source: 'Progress Gallery', action: 'Photo uploaded', details: form.note ? `Entry added: ${form.note}` : 'New progress photo added.', meta: { note: form.note } })
        setForm({ image_url: '', note: '' })
      },
      onError: (err) => toast.error(err.message || 'Upload failed'),
    })
  }

  return (
    <form className="stack" onSubmit={submit}>
      <Field label="Image URL" htmlFor="photo-url"><Input id="photo-url" type="url" placeholder="https://…" value={form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} /></Field>
      <Field label="Note (optional)" htmlFor="photo-url-note"><Input id="photo-url-note" value={form.note} maxLength={255} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} /></Field>
      <Button type="submit" variant="ghost" loading={upload.isPending} disabled={!form.image_url.trim()} block>Add progress photo</Button>
    </form>
  )
}

function ChangePasswordModal({ open, onClose }) {
  const toast = useToast()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: () => changePassword({ currentPassword: form.current, newPassword: form.next }),
    onSuccess: () => {
      toast.success('Password updated')
      setForm({ current: '', next: '', confirm: '' })
      onClose()
    },
    onError: (err) => setError(err.message || 'Could not update password'),
  })

  const submit = (event) => {
    event.preventDefault()
    setError('')
    if (form.next.length < 8) return setError('New password must be at least 8 characters.')
    if (form.next !== form.confirm) return setError('New passwords do not match.')
    mutation.mutate()
  }

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title="Change password">
      <form className="stack" onSubmit={submit}>
        <Field label="Current password" htmlFor="pw-current" hint="Leave blank if you signed up with Google">
          <Input id="pw-current" type="password" autoComplete="current-password" value={form.current} onChange={set('current')} />
        </Field>
        <Field label="New password" htmlFor="pw-new"><Input id="pw-new" type="password" autoComplete="new-password" value={form.next} onChange={set('next')} /></Field>
        <Field label="Confirm new password" htmlFor="pw-confirm"><Input id="pw-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} /></Field>
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" variant="primary" loading={mutation.isPending} block>Update password</Button>
      </form>
    </Modal>
  )
}

export default function Settings() {
  const profile = useQuery(profileQuery)
  const prefs = useQuery(notificationPrefsQuery)
  const [passwordOpen, setPasswordOpen] = useState(false)

  return (
    <div className="page">
      <PageHeader eyebrow="Character sheet" title="Settings" subtitle="Your profile, alerts and account security." />

      <div className="split">
        <div className="stack">
          <Card>
            <CardHeader icon={User} title="Profile" subtitle="Used to personalise coaching, BMI and leaderboards" />
            {profile.isLoading ? <Skeleton height={320} /> : profile.isError ? <Alert tone="error">{profile.error.message}</Alert> : <ProfileForm initial={profile.data} />}
          </Card>

          <Card>
            <CardHeader icon={Shield} tone="green" title="Security" />
            <p className="small muted" style={{ marginBottom: 14 }}>Your session uses signed tokens and passwords are never stored in plain text.</p>
            <Button variant="ghost" icon={KeyRound} onClick={() => setPasswordOpen(true)} block>Change password</Button>
          </Card>
        </div>

        <div className="stack">
          <Card>
            <CardHeader icon={Bell} tone="violet" title="Alert center" />
            {prefs.isLoading ? <Skeleton height={260} /> : <PreferencesForm initial={prefs.data} />}
          </Card>

          <Card>
            <CardHeader icon={Camera} tone="orange" title="Add photo by link" subtitle="Or upload from your device in Progress Gallery" />
            <PhotoByUrl />
          </Card>
        </div>
      </div>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  )
}
