const BASE = '/api'

export const getLibrary = () =>
  fetch(`${BASE}/library`).then(r => r.json())

export const uploadDoc = (file) => {
  const form = new FormData()
  form.append('file', file)
  return fetch(`${BASE}/library/upload`, { method: 'POST', body: form }).then(r => r.json())
}

export const deleteDoc = (id) =>
  fetch(`${BASE}/library/${id}`, { method: 'DELETE' }).then(r => r.json())

export const summarize = (id, provider = 'anthropic') =>
  fetch(`${BASE}/docs/${id}/summarize?provider=${provider}`, { method: 'POST' }).then(r => r.json())

export const readDoc = (id) =>
  fetch(`${BASE}/docs/${id}/read`).then(r => r.json())

export const discuss = (id, body) =>
  fetch(`${BASE}/docs/${id}/discuss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json())

export const getProvider = () => localStorage.getItem('ai_provider') || 'anthropic'
export const setProvider = (p) => localStorage.setItem('ai_provider', p)
