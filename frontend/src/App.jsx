import { useEffect, useState } from 'react'
import Library from './pages/Library'
import { getMe, login } from './api'

export default function App() {
  const [auth, setAuth] = useState('loading') // 'loading' | 'in' | 'out'

  useEffect(() => {
    getMe()
      .then(me => setAuth(me?.email ? 'in' : 'out'))
      .catch(() => setAuth('out'))
  }, [])

  if (auth === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading…
      </div>
    )
  }

  if (auth === 'out') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="w-10 h-10" />
          <h1 className="text-2xl font-semibold text-gray-800">Personal Dictator</h1>
        </div>
        <button
          onClick={login}
          className="px-5 py-2.5 rounded-lg bg-gray-900 text-white font-medium shadow hover:bg-gray-700 transition"
        >
          Sign in with Google
        </button>
      </div>
    )
  }

  return <Library />
}
