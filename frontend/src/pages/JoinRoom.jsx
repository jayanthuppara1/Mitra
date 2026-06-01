import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../lib/supabase'

export default function JoinRoom() {
  const { code } = useParams()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [status, setStatus] = useState('loading') // loading | preview | joining | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate(`/login?next=/join/${code}`, { replace: true })
      return
    }

    const fetchRoom = async () => {
      const { data, error } = await supabase
        .rpc('get_room_by_invite_code', { code })
        .maybeSingle()

      if (error || !data) {
        setStatus('error')
        setErrorMsg('This invite link is invalid or the room no longer exists.')
        return
      }

      const { data: existing } = await supabase
        .from('room_members')
        .select('id')
        .eq('room_id', data.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        navigate(`/rooms/${data.id}`, { replace: true })
        return
      }

      setRoom(data)
      setStatus('preview')
    }

    fetchRoom()
  }, [code, user, authLoading, navigate])

  const join = async () => {
    setStatus('joining')
    const { error } = await supabase.from('room_members').insert({
      room_id: room.id,
      user_id: user.id,
      role: 'member',
      rsvp_status: 'pending',
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }

    navigate(`/rooms/${room.id}`, { replace: true })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Checking invite…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-red-400 mb-4">{errorMsg}</p>
          <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white transition">
            Go to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">You're invited to</p>
          <h1 className="text-2xl font-bold">{room?.title}</h1>
          {room?.location && (
            <p className="text-gray-400 mt-1 text-sm">{room.location}</p>
          )}
          {room?.description && (
            <p className="text-gray-400 mt-3 text-sm">{room.description}</p>
          )}
        </div>

        <button
          onClick={join}
          disabled={status === 'joining'}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium transition"
        >
          {status === 'joining' ? 'Joining…' : 'Join room'}
        </button>

        <Link
          to="/dashboard"
          className="mt-4 block text-center text-sm text-gray-500 hover:text-gray-300 transition"
        >
          No thanks
        </Link>
      </div>
    </div>
  )
}
