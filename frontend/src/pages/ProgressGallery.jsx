import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Calendar, Camera, Plus, Upload } from 'lucide-react'
import { logActivity } from '../services/activityFeed'
import { progressPhotoQuery, progressPhotosQuery, useUploadProgressPhoto } from '../lib/queries'
import { resizeImageToDataUrl } from '../lib/image'
import { Alert, Button, Card, EmptyState, Field, Input, PageHeader, Skeleton } from '../ui/components'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/toast-context'

const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '')

// Shows the thumbnail straight away, then swaps in the full-size photo once loaded.
function PhotoViewer({ photo }) {
  const full = useQuery({ ...progressPhotoQuery(photo.id), enabled: Boolean(photo.id) })
  const src = full.data?.image_url || photo.thumbnail_url || photo.image_url
  return (
    <div className="stack">
      <div style={{ position: 'relative' }}>
        <img src={src} alt={photo.note || 'Progress photo'} style={{ width: '100%', maxHeight: '70dvh', objectFit: 'contain', borderRadius: 14, background: '#000' }} />
        {full.isLoading && <span className="spinner" style={{ position: 'absolute', top: 12, right: 12 }} />}
      </div>
      {photo.note && <p className="gold" style={{ fontWeight: 600 }}>{photo.note}</p>}
    </div>
  )
}

export default function ProgressGallery() {
  const toast = useToast()
  const photos = useQuery(progressPhotosQuery)
  const upload = useUploadProgressPhoto()
  const fileInputRef = useRef(null)

  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [note, setNote] = useState('')
  const [fileError, setFileError] = useState('')

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const resetForm = () => {
    setFile(null)
    setPreview('')
    setNote('')
    setFileError('')
  }

  const closeAdd = () => {
    setShowAdd(false)
    resetForm()
  }

  const handleFileChange = (event) => {
    const chosen = event.target.files?.[0]
    event.target.value = ''
    if (!chosen) return
    if (!chosen.type.startsWith('image/')) {
      setFileError('Please choose an image file.')
      return
    }
    setFileError('')
    setFile(chosen)
    setPreview(URL.createObjectURL(chosen))
  }

  const handleUpload = async (event) => {
    event.preventDefault()
    if (!file) return
    try {
      const imageData = await resizeImageToDataUrl(file)
      await upload.mutateAsync({ image_url: imageData, note })
      logActivity({
        source: 'Progress Gallery',
        action: 'Photo uploaded',
        details: note ? `Entry added: ${note}` : 'New progress photo added.',
        meta: { note },
      })
      toast.success('Progress entry saved')
      closeAdd()
    } catch (err) {
      setFileError(err.message || 'Failed to upload photo.')
    }
  }

  const list = photos.data || []

  return (
    <div className="page">
      <PageHeader
        eyebrow="Transformation log"
        title="Progress Gallery"
        subtitle="A private visual history of your journey."
        action={<Button variant="primary" icon={Plus} onClick={() => setShowAdd(true)}>Add entry</Button>}
      />

      {photos.isError && <Alert tone="error">{photos.error?.message || 'Could not load your photos.'}</Alert>}

      {photos.isLoading ? (
        <div className="grid-auto">{[0, 1, 2].map((i) => <Skeleton key={i} height={320} style={{ borderRadius: 20 }} />)}</div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon={Camera} title="No entries yet" action={<Button variant="primary" icon={Upload} onClick={() => setShowAdd(true)}>Upload first photo</Button>}>
            Snap a photo today. Future you will love the comparison.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))' }}>
          {list.map((photo, index) => (
            <motion.button
              type="button"
              key={photo.id || index}
              className="card card--flush card--interactive"
              style={{ aspectRatio: '4 / 5', textAlign: 'left' }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index, 8) * 0.04 }}
              onClick={() => setSelected(photo)}
              aria-label={`Open photo from ${formatDate(photo.created_at)}`}
            >
              <img src={photo.thumbnail_url || photo.image_url} alt={photo.note || 'Progress photo'} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', inset: 'auto 0 0 0', padding: 14, background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                <span className="eyebrow gold row" style={{ gap: 6 }}><Calendar size={12} /> {formatDate(photo.created_at)}</span>
                {photo.note && <span className="small" style={{ display: 'block', marginTop: 4, fontWeight: 600 }}>{photo.note}</span>}
              </span>
            </motion.button>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={closeAdd} title="New progress entry">
        <form className="stack" onSubmit={handleUpload}>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
          <button type="button" className="dropzone" onClick={() => fileInputRef.current?.click()}>
            {preview ? <img src={preview} alt="Selected" /> : (
              <>
                <Upload size={30} strokeWidth={1.5} />
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>Choose a photo</span>
                <span className="tiny">JPG, PNG or WEBP</span>
              </>
            )}
          </button>
          <Field label="Note / current weight" htmlFor="photo-note">
            <Input id="photo-note" placeholder="Day 45 – feeling stronger" value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} />
          </Field>
          {fileError && <Alert tone="error">{fileError}</Alert>}
          <Button type="submit" variant="primary" size="lg" block loading={upload.isPending} disabled={!file}>Save entry</Button>
        </form>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={formatDate(selected?.created_at)} wide>
        {selected && <PhotoViewer photo={selected} />}
      </Modal>
    </div>
  )
}
