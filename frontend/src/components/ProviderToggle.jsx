import { useState } from 'react'
import { getProvider, setProvider } from '../api'

const OPTIONS = [
  { id: 'anthropic', label: 'Claude' },
  { id: 'together', label: 'Together' },
]

export default function ProviderToggle() {
  const [provider, setLocal] = useState(getProvider())
  const select = (id) => {
    setProvider(id)
    setLocal(id)
  }
  return (
    <div
      role="radiogroup"
      aria-label="AI provider"
      className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 p-0.5 text-xs"
    >
      {OPTIONS.map(({ id, label }) => {
        const active = provider === id
        return (
          <button
            key={id}
            role="radio"
            aria-checked={active}
            onClick={() => select(id)}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              active
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
