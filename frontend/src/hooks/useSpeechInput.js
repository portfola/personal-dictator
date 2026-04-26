import { useRef, useState, useCallback } from 'react'

export default function useSpeechInput(onResult) {
  const ref = useRef(null)
  const [listening, setListening] = useState(false)

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.lang = 'en-US'
    r.interimResults = false
    r.onresult = (e) => onResult(e.results[0][0].transcript)
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    r.start()
    ref.current = r
    setListening(true)
  }, [onResult])

  const stop = useCallback(() => {
    ref.current?.stop()
    setListening(false)
  }, [])

  return { listening, start, stop }
}
