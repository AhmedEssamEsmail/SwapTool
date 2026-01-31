import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Settings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [autoApprove, setAutoApprove] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Redirect if not WFM
    if (user && user.role !== 'wfm') {
      navigate('/dashboard')
      return
    }
    fetchSettings()
  }, [user, navigate])

  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'wfm_auto_approve')
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" - that's okay, use default
        throw error
      }

      setAutoApprove(data?.value === 'true')
    } catch (err) {
      console.error('Error fetching settings:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle() {
    setSaving(true)
    setMessage('')

    try {
      const newValue = !autoApprove

      // Try to upsert the setting
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'wfm_auto_approve',
          value: newValue.toString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        })

      if (error) throw error

      setAutoApprove(newValue)
      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setMessage('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (user?.role !== 'wfm') {
    return null
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">WFM Settings</h1>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Auto-approve after TL approval</h2>
            <p className="text-sm text-gray-500 mt-1">
              When enabled, leave and swap requests will be automatically approved for WFM 
              once the Team Lead approves them. This bypasses manual WFM review.
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              autoApprove ? 'bg-primary-600' : 'bg-gray-200'
            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            role="switch"
            aria-checked={autoApprove}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                autoApprove ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            message.includes('success') 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">How it works:</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">•</span>
              <span><strong>Enabled:</strong> When TL approves a request, it's automatically approved by WFM as well.</span>
            </li>
            <li className="flex items-start">
              <span className="text-yellow-500 mr-2">•</span>
              <span><strong>Disabled:</strong> Requests require manual WFM approval after TL approval.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
