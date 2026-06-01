import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'

const RSVP_OPTIONS = [
  { value: 'going', label: 'Going' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'not_going', label: 'Not going' },
]

function formatDateRange(start, end) {
  if (!start && !end) return null
  const opts = { month: 'short', day: 'numeric' }
  const s = start ? new Date(start).toLocaleDateString('en-US', opts) : null
  const e = end ? new Date(end).toLocaleDateString('en-US', opts) : null
  if (s && e) return `${s} – ${e}`
  return s || e
}

function InviteModal({ inviteCode, onClose }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/join/${inviteCode}`

  const copy = async () => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">Invite people</h2>
        <p className="text-sm text-gray-400 mb-4">
          Share this link — anyone with it can join this room.
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={link}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 truncate focus:outline-none"
          />
          <button
            onClick={copy}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition whitespace-nowrap"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default function RoomDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [room, setRoom] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    if (!user || !id) return
    const fetchData = async () => {
      setLoading(true)
      setError('')

      const [roomResult, membersResult] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', id).is('deleted_at', null).maybeSingle(),
        supabase
          .from('room_members')
          .select('id, user_id, role, rsvp_status, joined_at, users(email, display_name, avatar_url)')
          .eq('room_id', id)
          .order('joined_at', { ascending: true }),
      ])

      if (roomResult.error) setError(roomResult.error.message)
      else if (!roomResult.data) setError('Room not found or you do not have access.')
      else setRoom(roomResult.data)

      if (membersResult.error) setError(membersResult.error.message)
      else setMembers(membersResult.data ?? [])

      setLoading(false)
    }
    fetchData()
  }, [id, user])

  const myMembership = members.find((m) => m.user_id === user?.id)

  const updateRsvp = async (status) => {
    if (!myMembership) return
    const previous = myMembership.rsvp_status
    setMembers((prev) =>
      prev.map((m) => (m.id === myMembership.id ? { ...m, rsvp_status: status } : m))
    )
    const { error } = await supabase
      .from('room_members')
      .update({ rsvp_status: status })
      .eq('id', myMembership.id)
    if (error) {
      setMembers((prev) =>
        prev.map((m) => (m.id === myMembership.id ? { ...m, rsvp_status: previous } : m))
      )
      setError(error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading room…</p>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <nav className="border-b border-gray-800 px-6 py-4">
          <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white">← Back</Link>
        </nav>
        <main className="max-w-xl mx-auto px-6 py-20 text-center text-gray-400">
          {error || 'Room not found.'}
        </main>
      </div>
    )
  }

  const dateRange = formatDateRange(room.start_date, room.end_date)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {showInvite && (
        <InviteModal inviteCode={room.invite_code} onClose={() => setShowInvite(false)} />
      )}

      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white transition">
          ← Back
        </Link>
        <button
          onClick={() => setShowInvite(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition"
        >
          Invite people
        </button>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold">{room.title}</h1>
          {(dateRange || room.location) && (
            <p className="text-gray-400 mt-2">
              {[dateRange, room.location].filter(Boolean).join(' · ')}
            </p>
          )}
          {room.description && (
            <p className="text-gray-300 mt-4 whitespace-pre-wrap">{room.description}</p>
          )}
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-900 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {myMembership && (
          <section className="mb-10">
            <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-3">Your RSVP</h2>
            <div className="flex gap-2 flex-wrap">
              {RSVP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateRsvp(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    myMembership.rsvp_status === opt.value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-3">
            Members ({members.length})
          </h2>
          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between p-4 bg-gray-900 border border-gray-800 rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {m.users?.display_name || m.users?.email || 'Unknown'}
                    {m.user_id === user?.id && (
                      <span className="ml-2 text-xs text-gray-500">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">
                    {m.role} · {(m.rsvp_status || 'no rsvp').replace('_', ' ')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
