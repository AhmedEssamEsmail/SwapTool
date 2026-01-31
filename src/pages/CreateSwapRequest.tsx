import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { User, Shift, ShiftType } from '../types'

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  AM: 'AM Shift',
  PM: 'PM Shift',
  BET: 'BET Shift',
  OFF: 'Day Off'
}

export default function CreateSwapRequest() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [agents, setAgents] = useState<User[]>([])
  const [targetUserId, setTargetUserId] = useState('')
  const [myShifts, setMyShifts] = useState<Shift[]>([])
  const [targetShifts, setTargetShifts] = useState<Shift[]>([])
  const [myShiftId, setMyShiftId] = useState('')
  const [targetShiftId, setTargetShiftId] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [loadingShifts, setLoadingShifts] = useState(false)
  const [error, setError] = useState('')

  // Fetch other agents on mount
  useEffect(() => {
    fetchAgents()
    fetchMyShifts()
  }, [user])

  // Fetch target user's shifts when target changes
  useEffect(() => {
    if (targetUserId) {
      fetchTargetShifts()
    } else {
      setTargetShifts([])
      setTargetShiftId('')
    }
  }, [targetUserId])

  const fetchAgents = async () => {
    setLoadingAgents(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'agent')
        .neq('id', user!.id)
        .order('name')

      if (error) throw error
      setAgents(data || [])
    } catch (err) {
      console.error('Error fetching agents:', err)
    } finally {
      setLoadingAgents(false)
    }
  }

  const fetchMyShifts = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', today)
        .order('date')

      if (error) throw error
      setMyShifts(data || [])
    } catch (err) {
      console.error('Error fetching my shifts:', err)
    }
  }

  const fetchTargetShifts = async () => {
    setLoadingShifts(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', targetUserId)
        .gte('date', today)
        .order('date')

      if (error) throw error
      setTargetShifts(data || [])
      setTargetShiftId('')
    } catch (err) {
      console.error('Error fetching target shifts:', err)
    } finally {
      setLoadingShifts(false)
    }
  }

  const formatShiftOption = (shift: Shift) => {
    const date = new Date(shift.date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
    return `${date} - ${SHIFT_TYPE_LABELS[shift.shift_type]}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!targetUserId) {
      setError('Please select a target user')
      return
    }

    if (!myShiftId) {
      setError('Please select your shift date')
      return
    }

    if (!targetShiftId) {
      setError('Please select their shift date')
      return
    }

    setLoading(true)
    try {
      const { error: insertError } = await supabase
        .from('swap_requests')
        .insert({
          requester_id: user!.id,
          target_user_id: targetUserId,
          requester_shift_id: myShiftId,
          target_shift_id: targetShiftId,
          status: 'pending_acceptance'
        })

      if (insertError) throw insertError

      navigate('/dashboard')
    } catch (err) {
      console.error('Error creating swap request:', err)
      setError('Failed to create swap request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Swap Request</h1>
        <p className="mt-1 text-sm text-gray-500">
          Request to swap shifts with a colleague
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="targetUser" className="block text-sm font-medium text-gray-700">
              Select Colleague
            </label>
            {loadingAgents ? (
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                Loading agents...
              </div>
            ) : (
              <select
                id="targetUser"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                required
              >
                <option value="">Select a colleague...</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            )}
            {agents.length === 0 && !loadingAgents && (
              <p className="mt-1 text-sm text-gray-500">No other agents available</p>
            )}
          </div>

          <div>
            <label htmlFor="myShift" className="block text-sm font-medium text-gray-700">
              Your Shift Date
            </label>
            <select
              id="myShift"
              value={myShiftId}
              onChange={(e) => setMyShiftId(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              required
            >
              <option value="">Select your shift...</option>
              {myShifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {formatShiftOption(shift)}
                </option>
              ))}
            </select>
            {myShifts.length === 0 && (
              <p className="mt-1 text-sm text-gray-500">No upcoming shifts available</p>
            )}
          </div>

          <div>
            <label htmlFor="targetShift" className="block text-sm font-medium text-gray-700">
              Their Shift Date
            </label>
            {loadingShifts ? (
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                Loading shifts...
              </div>
            ) : (
              <select
                id="targetShift"
                value={targetShiftId}
                onChange={(e) => setTargetShiftId(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                disabled={!targetUserId}
                required
              >
                <option value="">
                  {targetUserId ? 'Select their shift...' : 'Select a colleague first'}
                </option>
                {targetShifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {formatShiftOption(shift)}
                  </option>
                ))}
              </select>
            )}
            {targetUserId && targetShifts.length === 0 && !loadingShifts && (
              <p className="mt-1 text-sm text-gray-500">No upcoming shifts available for this colleague</p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !targetUserId || !myShiftId || !targetShiftId}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
