import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, 
  Plus, 
  Trash2, 
  Calendar, 
  Image as ImageIcon,
  Loader2,
  X,
  Upload,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { fetchProgressPhotos, uploadProgressPhoto } from '../services/api'
import { logActivity } from '../services/activityFeed'

export default function ProgressGallery() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [note, setNote] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadPhotos()
  }, [])

  const loadPhotos = async () => {
    setLoading(true)
    try {
      const data = await fetchProgressPhotos()
      setPhotos(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    
    if (!selectedFile.type.startsWith('image/')) {
      alert("Please select an image file.")
      return
    }

    setFile(selectedFile)
    setPreview(URL.createObjectURL(selectedFile))
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return
    
    setIsUploading(true)
    try {
      // Convert file to Base64 for the API
      const reader = new FileReader()
      const base64Promise = new Promise((resolve) => {
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(file)
      })
      
      const base64Data = await base64Promise
      
      await uploadProgressPhoto({
        image_url: base64Data, // Sending base64 as URL
        note: note
      })

      logActivity({
        source: 'Progress Gallery',
        action: 'Photo uploaded',
        details: note ? `Entry added: ${note}` : 'New progress photo added.',
        meta: { note }
      })
      
      setFile(null)
      setPreview('')
      setNote('')
      setShowAddModal(false)
      loadPhotos()
    } catch (e) {
      alert("Failed to upload photo.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <motion.div 
      className="grid-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div style={{ gridColumn: 'span 12', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Progress Gallery</h1>
          <p className="text-muted">Visual history of your transformation journey.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '3rem', padding: '0 1.5rem', borderRadius: '12px' }}
        >
          <Plus size={18} /> Add Entry
        </button>
      </div>

      {loading ? (
        <div style={{ gridColumn: 'span 12', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="spinner" size={32} style={{ color: 'var(--accent)' }} />
        </div>
      ) : photos.length === 0 ? (
        <div className="card" style={{ gridColumn: 'span 12', height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', textAlign: 'center' }}>
           <div style={{ padding: '2rem', background: 'var(--surface-hover)', borderRadius: '50%', color: 'var(--text-secondary)' }}>
              <Camera size={48} strokeWidth={1} />
           </div>
           <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No entries yet</h3>
              <p className="text-muted">Start documenting your physical evolution today.</p>
           </div>
           <button onClick={() => setShowAddModal(true)} className="btn-secondary">Upload First Photo</button>
        </div>
      ) : (
        <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {photos.map((photo, index) => (
            <motion.div 
              key={photo.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card"
              style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => setSelectedPhoto(photo)}
            >
              <div style={{ position: 'relative', paddingTop: '125%', background: '#000', borderRadius: '16px', overflow: 'hidden' }}>
                <img 
                  src={photo.image_url} 
                  alt={photo.note} 
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} 
                />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)' }}>
                      <Calendar size={12} /> {new Date(photo.created_at).toLocaleDateString()}
                   </div>
                   {photo.note && <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: '#fff', fontWeight: 500 }}>{photo.note}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Entry Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(10px)' }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="card"
              style={{ width: '100%', maxWidth: '450px', position: 'relative', zIndex: 1, padding: '2.5rem', borderRadius: '24px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>New Progress Entry</h2>
                <button onClick={() => setShowAddModal(false)} className="text-muted"><X size={20} /></button>
              </div>

              <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    border: '2px dashed var(--border)', 
                    borderRadius: '16px', 
                    padding: '2rem', 
                    textAlign: 'center',
                    background: 'var(--surface-hover)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {preview ? (
                    <img src={preview} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px' }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <Upload size={32} className="text-muted" strokeWidth={1} />
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Click to upload photo</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>JPG, PNG or WEBP</div>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    hidden 
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.5 }}>Note / Current Weight</label>
                  <input 
                    placeholder="Day 45 - Feeling stronger"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '1rem', color: '#fff', borderRadius: '12px' }}
                  />
                </div>
                
                <button type="submit" disabled={isUploading || !file} className="btn-primary" style={{ height: '3.5rem', borderRadius: '12px', fontWeight: 800 }}>
                  {isUploading ? 'SYNCING...' : 'SAVE TRANSFORMATION'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPhoto(null)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)' }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ position: 'relative', zIndex: 1, maxWidth: '90vw', maxHeight: '90vh' }}
            >
              <img 
                src={selectedPhoto.image_url} 
                style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }} 
              />
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                 <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700 }}>{new Date(selectedPhoto.created_at).toLocaleDateString()}</h3>
                 <p style={{ color: 'var(--accent)', fontWeight: 600 }}>{selectedPhoto.note}</p>
              </div>
              <button 
                onClick={() => setSelectedPhoto(null)}
                style={{ position: 'absolute', top: '-3rem', right: 0, color: '#fff' }}
              >
                <X size={32} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
