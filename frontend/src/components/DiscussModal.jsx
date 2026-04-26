import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import ModeToggle from './ModeToggle'
import useSpeechInput from '../hooks/useSpeechInput'
import { discuss, getProvider } from '../api'

export default function DiscussModal({ doc, onClose }) {
  const [mode, setMode] = useState('voice')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const sessionId = useRef(uuidv4())
  const audioRef = useRef(null)
  const bottomRef = useRef(null)

  const sendMessage = useCallback(async (text, currentMode) => {
    if (!text.trim() || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text, mode: currentMode }])
    setLoading(true)

    const data = await discuss(doc.id, {
      message: text,
      session_id: sessionId.current,
      mode: currentMode,
      provider: getProvider(),
    })

    setMessages(prev => [...prev, { role: 'assistant', content: data.reply, mode: currentMode }])
    setLoading(false)

    if (currentMode === 'voice' && data.audio_url && audioRef.current) {
      audioRef.current.src = data.audio_url
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
    }
  }, [doc.id, loading])

  const { listening, start, stop } = useSpeechInput(
    useCallback((transcript) => sendMessage(transcript, 'voice'), [sendMessage])
  )

  // Auto-start mic in voice mode
  useEffect(() => { if (mode === 'voice') start() }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleAudioEnd = () => {
    setPlaying(false)
    if (mode === 'voice') start()
  }

  const handleModeChange = (newMode) => {
    setMode(newMode)
    if (newMode === 'voice') start()
    else stop()
  }

  return (
    <div className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col">
      <audio ref={audioRef} onEnded={handleAudioEnd} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
        <h2 className="font-semibold text-white truncate pr-4">{doc.title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white flex-shrink-0">
          <X size={20} />
        </button>
      </div>

      {/* Mode toggle */}
      <div className="flex justify-center pt-8 pb-4">
        <ModeToggle mode={mode} onChange={handleModeChange} active={listening || playing} />
      </div>

      {/* Prompt hint */}
      {messages.length === 0 && (
        <p className="text-center text-slate-400 text-sm px-8 pb-4">
          {mode === 'voice'
            ? 'Ask a question about this document'
            : 'Type a question about this document'}
        </p>
      )}

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-sky-700 text-white'
                : 'bg-slate-700 text-slate-100'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-400 animate-pulse">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Text input — shown in text mode only */}
      {mode === 'text' && (
        <div className="px-4 py-4 border-t border-slate-700 flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input, 'text')}
            placeholder="Type a question…"
            className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 text-sm outline-none placeholder:text-slate-500"
          />
          <button
            onClick={() => sendMessage(input, 'text')}
            className="bg-sky-700 text-white px-4 rounded-xl hover:bg-sky-600 transition">
            <Send size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
