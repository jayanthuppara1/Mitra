import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function formatDateRange(start, end) {
  if (!start && !end) return null
  const opts = { month: 'short', day: 'numeric' }
  const s = start ? new Date(start).toLocaleDateString('en-US', opts) : null
  const e = end ? new Date(end).toLocaleDateString('en-US', opts) : null
  if (s && e) return `${s} – ${e}`
  return s || e
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    const fetchRooms = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('rooms')
        .select('id, title, description, location, start_date, end_date, cover_image_url, room_members(count)')
        .is('deleted_at', null)
        .order('start_date', { ascending: false, nullsFirst: false })

      if (error) setError(error.message)
      else setRooms(data ?? [])
      setLoading(false)
    }
    fetchRooms()
  }, [user])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Mitra</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user?.email}</span>
          <button onClick={signOut} className="text-sm text-gray-400 hover:text-white transition">
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Your experiences</h2>
          <button
            onClick={() => navigate('/rooms/new')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition"
          >
            + New room
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-900 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading your rooms…</div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <div className="text-5xl mb-4">🗺️</div>
            <p className="text-lg">No experiences yet.</p>
            <p className="text-sm mt-2">Create your first room to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {rooms.map((room) => {
              const dateRange = formatDateRange(room.start_date, room.end_date)
              const memberCount = room.room_members?.[0]?.count ?? 0
              return (
                <Link
                  key={room.id}
                  to={`/rooms/${room.id}`}
                  className="block bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition"
                >
                  {room.cover_image_url && (
                    <div
                      className="h-32 -mx-5 -mt-5 mb-4 rounded-t-xl bg-cover bg-center"
                      style={{ backgroundImage: `url(${room.cover_image_url})` }}
                    />
                  )}
                  <h3 className="font-semibold text-lg">{room.title}</h3>
                  {(dateRange || room.location) && (
                    <p className="text-sm text-gray-400 mt-1">
                      {[dateRange, room.location].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-3">
                    {memberCount} {memberCount === 1 ? 'member' : 'members'}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
