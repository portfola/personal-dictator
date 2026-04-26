import { useEffect, useState } from 'react'
import { Upload } from 'lucide-react'
import DocRow from '../components/DocRow'
import DiscussModal from '../components/DiscussModal'
import ProviderToggle from '../components/ProviderToggle'
import { getLibrary, uploadDoc } from '../api'

export default function Library() {
  const [docs, setDocs] = useState([])
  const [discussDoc, setDiscussDoc] = useState(null)
  const [uploading, setUploading] = useState(false)

  const load = () => getLibrary().then(setDocs)
  useEffect(() => { load() }, [])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    await uploadDoc(file)
    await load()
    setUploading(false)
    e.target.value = ''
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Personal Dictator</h1>
          <div className="flex items-center gap-3">
            <ProviderToggle />
            <label className="flex items-center gap-2 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 rounded-lg text-sm font-medium cursor-pointer transition-colors">
              <Upload size={15} />
              Add
              <input type="file" accept=".md,.txt" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        </div>

        {uploading && (
          <p className="text-slate-400 text-sm mb-4 animate-pulse">Uploading…</p>
        )}

        {docs.length === 0 ? (
          <p className="text-slate-500 text-sm text-center mt-24">
            No documents yet. Add a .md or .txt file to get started.
          </p>
        ) : (
          docs.map(doc => (
            <DocRow key={doc.id} doc={doc} onDiscuss={setDiscussDoc} />
          ))
        )}
      </div>

      {discussDoc && (
        <DiscussModal doc={discussDoc} onClose={() => setDiscussDoc(null)} />
      )}
    </div>
  )
}
