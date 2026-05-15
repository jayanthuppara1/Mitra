import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(() => {
      setConnected(true)
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Mithra</h1>
        <p className="mt-3 text-gray-400">Plan together. Live together. Remember together.</p>
        <div className="mt-6 flex gap-3 justify-center">
          <span className="inline-block px-3 py-1 text-xs bg-green-900 text-green-300 rounded-full">
            Day 0 — skeleton live ✓
          </span>
          <span className={`inline-block px-3 py-1 text-xs rounded-full ${
            connected 
              ? 'bg-blue-900 text-blue-300' 
              : 'bg-gray-800 text-gray-400'
          }`}>
            {connected ? 'Supabase connected ✓' : 'Connecting...'}
          </span>
        </div>
      </div>
    </div>
  )
}
