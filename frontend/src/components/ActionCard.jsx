import { useState, useRef, useEffect } from 'react'
import { X, Play } from 'lucide-react'
import ModeToggle from './ModeToggle'

export default function ActionCard({ doc, action, loading, result, onClose }) {
  const [mode, setMode] = useState('voice')
  const [playing, setPlaying] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const audioRef = useRef(null)

  const attemptPlay = () => {
    if (!audioRef.current || !result?.audio_url) return
    if (audioRef.current.src !== result.audio_url) {
      audioRef.current.src = result.audio_url
    }
    audioRef.current.play()
      .then(() => { setPlaying(true); setBlocked(false) })
      .catch((err) => {
        console.warn('Audio playback blocked or failed:', err)
        setPlaying(false)
        setBlocked(true)
      })
  }

  useEffect(() => {
    if (result?.audio_url && mode === 'voice') attemptPlay()
  }, [result])

  const handleModeChange = (newMode) => {
    setMode(newMode)
    if (!audioRef.current) return
    if (newMode === 'text') {
      audioRef.current.pause()
      setPlaying(false)
    } else if (result?.audio_url) {
      attemptPlay()
    }
  }

  const text = result?.summary || result?.text || ''

  return (
    <div className="bg-slate-900 border-t border-slate-700 px-5 py-6">
      <audio
        ref={audioRef}
        preload="auto"
        onPlay={() => { setPlaying(true); setBlocked(false) }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={(e) => {
          console.error('Audio element error:', e.currentTarget.error)
          setBlocked(true)
          setPlaying(false)
        }}
      />

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

      {!loading && mode === 'voice' && blocked && result?.audio_url && (
        <div className="flex flex-col items-center gap-2 mt-2">
          <button
            onClick={attemptPlay}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm font-medium text-white transition-colors"
          >
            <Play size={16} /> Tap to play
          </button>
          <p className="text-xs text-slate-500">Browser blocked autoplay</p>
        </div>
      )}

      {mode === 'text' && text && (
        <p className="mt-4 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
      )}
    </div>
  )
}
