import { useState } from 'react'
import { getProvider, setProvider } from '../api'

export default function ProviderToggle() {
  const [provider, setLocal] = useState(getProvider())
  const toggle = () => {
    const next = provider === 'anthropic' ? 'together' : 'anthropic'
    setProvider(next)
    setLocal(next)
  }
  return (
    <button onClick={toggle}
      className="text-xs text-slate-400 hover:text-white border border-slate-600 rounded-lg px-3 py-1.5 transition-colors">
      {provider === 'anthropic' ? 'Claude' : 'Together AI'}
    </button>
  )
}
