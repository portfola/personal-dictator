import { useState } from 'react'
import { Headphones, FileText, MessageCircle } from 'lucide-react'
import ActionCard from './ActionCard'
import { summarize, readDoc, getProvider } from '../api'

export default function DocRow({ doc, onDiscuss }) {
  const [active, setActive] = useState(null) // 'read' | 'summarize' | null
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleAction = async (action) => {
    if (active === action) { setActive(null); return }
    setActive(action)
    setResult(null)
    setLoading(true)
    const data = action === 'summarize'
      ? await summarize(doc.id, getProvider())
      : await readDoc(doc.id)
    setResult(data)
    setLoading(false)
  }

  const icons = [
    { key: 'read', icon: <Headphones size={18} strokeWidth={1.5} />, label: 'Read aloud' },
    { key: 'summarize', icon: <FileText size={18} strokeWidth={1.5} />, label: 'Summarize' },
    { key: 'discuss', icon: <MessageCircle size={18} strokeWidth={1.5} />, label: 'Discuss' },
  ]

  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden mb-3">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800">
        <span className="text-white font-medium truncate mr-4 text-sm">{doc.title}</span>
        <div className="flex gap-4 flex-shrink-0">
          {icons.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => key === 'discuss' ? onDiscuss(doc) : handleAction(key)}
              aria-label={label}
              className={`transition-colors ${
                active === key ? 'text-sky-400' : 'text-slate-400 hover:text-white'
              }`}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      {active && active !== 'discuss' && (
        <ActionCard
          doc={doc}
          action={active}
          loading={loading}
          result={result}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  )
}
