import { useEffect, useState } from 'react'

export default function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    if (!url || !key) {
      setStatus('env vars missing')
    } else {
      setStatus('env vars loaded ✓')
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Mithra</h1>
        <p className="mt-3 text-gray-400">Plan together. Live together. Remember together.</p>
        <p className="mt-6 text-yellow-400 text-sm">{status}</p>
      </div>
    </div>
  )
}
