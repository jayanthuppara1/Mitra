import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'

export default function CreateRoom() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (roomError) {
      setError(roomError.message)
      setSubmitting(false)
      return
    }

    const { error: memberError } = await supabase
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: user.id,
        role: 'admin',
        rsvp_status: 'going',
      })

    if (memberError) {
      setError(`Room created but adding you as member failed: ${memberError.message}`)
      setSubmitting(false)
      return
    }

    navigate(`/rooms/${room.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4">
        <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white transition">
          ← Back to your experiences
        </Link>
      </nav>
      <main className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2">New experience</h1>
        <p className="text-gray-400 mb-8">Set up a room for your group.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Orlando trip"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What is this trip about?"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Location (optional)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Orlando, FL"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Start date (optional)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">End date (optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium transition"
            >
              {submitting ? 'Creating…' : 'Create room'}
            </button>
            <Link to="/dashboard" className="px-5 py-3 text-gray-400 hover:text-white transition">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
