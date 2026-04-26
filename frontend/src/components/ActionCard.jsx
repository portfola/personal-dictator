import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import ModeToggle from './ModeToggle'

export default function ActionCard({ doc, action, loading, result, onClose }) {
  const [mode, setMode] = useState('voice')
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    if (result?.audio_url && mode === 'voice' && audioRef.current) {
      audioRef.current.src = result.audio_url
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
    }
  }, [result])

  const handleModeChange = (newMode) => {
    setMode(newMode)
    if (!audioRef.current) return
    if (newMode === 'text') {
      audioRef.current.pause()
      setPlaying(false)
    } else if (result?.audio_url) {
      audioRef.current.src = result.audio_url
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  const text = result?.summary || result?.text || ''

  return (
    <div className="bg-slate-900 border-t border-slate-700 px-5 py-6">
      <audio ref={audioRef} onEnded={() => setPlaying(false)} />

      <div className="flex items-start justify-between mb-5">
        <h3 className="font-semibold text-white text-base leading-tight">{doc.title}</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white ml-4 flex-shrink-0">
          <X size={18} />
        </button>
      </div>

      <div className="flex justify-center my-5">
        <ModeToggle mode={mode} onChange={handleModeChange} active={playing} />
      </div>

      {loading && (
        <p className="text-slate-400 text-sm text-center animate-pulse">
          {action === 'summarize' ? 'Generating summary…' : 'Preparing audio…'}
        </p>
      )}

      {mode === 'text' && text && (
        <p className="mt-4 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
      )}
    </div>
  )
}
