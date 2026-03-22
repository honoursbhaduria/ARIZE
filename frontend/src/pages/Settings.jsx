import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Bell, 
  Camera, 
  Shield, 
  Smartphone, 
  Save,
  CheckCircle2
} from 'lucide-react'
import { 
  fetchProfile, 
  updateProfile, 
  fetchNotificationPreferences, 
  updateNotificationPreferences,
  uploadProgressPhoto 
} from '../services/api'

export default function Settings() {
  const [profile, setProfile] = useState({ age: '', weight: '', district: 'global', goal: 'maintenance', diet_type: 'vegetarian' })
  const [prefs, setPrefs] = useState({ workout_reminders: true, streak_alerts: true, diet_suggestions: true, whatsapp_updates: false })
  const [photoForm, setPhotoForm] = useState({ image_url: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function load() {
      const [p, n] = await Promise.all([fetchProfile(), fetchNotificationPreferences()])
      if (p) setProfile({
        age: p.age ?? '',
        weight: p.weight ?? '',
        district: p.district || 'global',
        goal: p.goal || 'maintenance',
        diet_type: p.diet_type || 'vegetarian'
      })
      if (n) setPrefs(n)
    }
    load()
  }, [])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await updateProfile(profile)
      showSuccess('Profile updated')
    } catch (e) {}
    finally { setSaving(false) }
  }

  const handleSavePrefs = async () => {
    setSaving(true)
    try {
      await updateNotificationPreferences(prefs)
      showSuccess('Preferences saved')
    } catch (e) {}
    finally { setSaving(false) }
  }

  const showSuccess = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--surface-hover)',
    border: '1px solid var(--border)',
    padding: '0.75rem',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem'
  }

  return (
    <motion.div 
      className="grid-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div style={{ gridColumn: 'span 12', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Settings</h1>
          <p className="text-muted">Manage your account and app preferences.</p>
        </div>
        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4ade80', fontSize: '0.875rem', fontWeight: 600, padding: '0.5rem 1rem', background: 'rgba(74, 222, 128, 0.1)', borderRadius: 'var(--radius)' }}>
            <CheckCircle2 size={16} /> {success}
          </div>
        )}
      </div>

      {/* Profile Settings */}
      <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
         <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
               <User size={18} />
               <h3 style={{ fontSize: '1.125rem' }}>Profile Configuration</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Age</label>
                  <input value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})} style={inputStyle} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Weight (kg)</label>
                  <input value={profile.weight} onChange={e => setProfile({...profile, weight: e.target.value})} style={inputStyle} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>District</label>
                  <input value={profile.district} onChange={e => setProfile({...profile, district: e.target.value})} style={inputStyle} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Goal</label>
                  <select value={profile.goal} onChange={e => setProfile({...profile, goal: e.target.value})} style={inputStyle}>
                     <option value="muscle_gain">Muscle Gain</option>
                     <option value="fat_loss">Fat Loss</option>
                     <option value="maintenance">Maintenance</option>
                  </select>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: 'span 2' }}>
                  <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Diet Type</label>
                  <select value={profile.diet_type} onChange={e => setProfile({...profile, diet_type: e.target.value})} style={inputStyle}>
                     <option value="vegetarian">Vegetarian</option>
                     <option value="non_veg">Non-Veg</option>
                     <option value="vegan">Vegan</option>
                  </select>
               </div>
            </div>
            
            <button onClick={handleSaveProfile} disabled={saving} className="btn-primary" style={{ marginTop: '2rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
               <Save size={16} /> Save Profile
            </button>
         </div>

         <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
               <Shield size={18} />
               <h3 style={{ fontSize: '1.125rem' }}>Security & Privacy</h3>
            </div>
            <p className="text-muted" style={{ fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
               Your account is protected with JWT session tokens. We don't store your plain text passwords.
            </p>
            <button className="btn-secondary" style={{ width: '100%' }}>Change Password</button>
         </div>
      </div>

      {/* Preferences & Photos */}
      <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
         <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
               <Bell size={18} />
               <h3 style={{ fontSize: '1.125rem' }}>Alert Center</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {[
                  { key: 'workout_reminders', label: 'Workout Reminders' },
                  { key: 'streak_alerts', label: 'Streak Alerts' },
                  { key: 'diet_suggestions', label: 'Diet Suggestions' },
                  { key: 'whatsapp_updates', label: 'WhatsApp Updates' },
               ].map(item => (
                  <label key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.5rem 0' }}>
                     <span style={{ fontSize: '0.875rem' }}>{item.label}</span>
                     <div style={{ position: 'relative' }}>
                        <input 
                           type="checkbox" 
                           checked={prefs[item.key]} 
                           onChange={e => setPrefs({...prefs, [item.key]: e.target.checked})}
                           style={{ display: 'none' }}
                        />
                        <div style={{ 
                           width: '40px', 
                           height: '20px', 
                           background: prefs[item.key] ? 'var(--accent)' : 'var(--surface-hover)', 
                           borderRadius: '10px',
                           border: '1px solid var(--border)',
                           transition: 'all 0.2s ease'
                        }}>
                           <div style={{ 
                              width: '14px', 
                              height: '14px', 
                              background: prefs[item.key] ? 'var(--bg)' : 'var(--text-secondary)', 
                              borderRadius: '50%',
                              position: 'absolute',
                              top: '3px',
                              left: prefs[item.key] ? '23px' : '3px',
                              transition: 'all 0.2s ease'
                           }} />
                        </div>
                     </div>
                  </label>
               ))}
            </div>
            
            <button onClick={handleSavePrefs} disabled={saving} className="btn-secondary" style={{ marginTop: '2rem', width: '100%' }}>
               Update Preferences
            </button>
         </div>

         <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
               <Camera size={18} />
               <h3 style={{ fontSize: '1.125rem' }}>Visual Progress</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <input 
                  placeholder="Image URL" 
                  value={photoForm.image_url}
                  onChange={e => setPhotoForm({...photoForm, image_url: e.target.value})}
                  style={inputStyle} 
               />
               <input 
                  placeholder="Note (optional)" 
                  value={photoForm.note}
                  onChange={e => setPhotoForm({...photoForm, note: e.target.value})}
                  style={inputStyle} 
               />
               <button className="btn-secondary" style={{ width: '100%' }}>Upload Progress Photo</button>
            </div>
         </div>
      </div>
    </motion.div>
  )
}
