const BASE = '/api'

// Send the session cookie with every request, and bounce to Google login on 401.
const opts = (o = {}) => ({ credentials: 'include', ...o })

const handle = (r) => {
  if (r.status === 401) {
    window.location.href = `${BASE}/auth/login`
    throw new Error('Not authenticated')
  }
  return r.json()
}

export const getMe = () =>
  fetch(`${BASE}/auth/me`, opts()).then(r => (r.ok ? r.json() : null))

export const login = () => {
  window.location.href = `${BASE}/auth/login`
}

export const logout = () =>
  fetch(`${BASE}/auth/logout`, opts({ method: 'POST' })).then(() => {
    window.location.reload()
  })

export const getLibrary = () =>
  fetch(`${BASE}/library`, opts()).then(handle)

export const uploadDoc = (file) => {
  const form = new FormData()
  form.append('file', file)
  return fetch(`${BASE}/library/upload`, opts({ method: 'POST', body: form })).then(handle)
}

export const deleteDoc = (id) =>
  fetch(`${BASE}/library/${id}`, opts({ method: 'DELETE' })).then(handle)

export const summarize = (id, provider = 'anthropic') =>
  fetch(`${BASE}/docs/${id}/summarize?provider=${provider}`, opts({ method: 'POST' })).then(handle)

export const readDoc = (id) =>
  fetch(`${BASE}/docs/${id}/read`, opts()).then(handle)

export const discuss = (id, body) =>
  fetch(`${BASE}/docs/${id}/discuss`, opts({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })).then(handle)

export const getProvider = () => localStorage.getItem('ai_provider') || 'anthropic'
export const setProvider = (p) => localStorage.setItem('ai_provider', p)
