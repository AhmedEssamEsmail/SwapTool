import { createContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null; session: Session | null }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getUserFriendlyError(error: any): Error {
  const errorMessage = typeof error === 'string' 
    ? error 
    : (error?.message || error?.error_description || error?.msg || 'Unknown error')
  
  const message = errorMessage.toLowerCase()
  
  if (message.includes('email not confirmed')) {
    return new Error('Please verify your email address. Check your inbox for the confirmation link.')
  }
  if (message.includes('invalid login credentials') || message.includes('invalid email or password') || message.includes('invalid grant')) {
    return new Error('Invalid email or password. Please check your credentials.')
  }
  if (message.includes('user not found')) {
    return new Error('No account found with this email. Please sign up first.')
  }
  if (message.includes('invalid email')) return new Error('Please enter a valid email address.')
  if (message.includes('rate limit')) return new Error('Too many login attempts. Please wait a moment.')
  if (message.includes('network') || message.includes('fetch')) return new Error('Network error. Check your connection.')
  if (message.includes('abort')) return new Error('The request was cancelled. Please try again.')

  return new Error(errorMessage)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const isAuthenticated = !!session && !!user

  // Fetches the application profile from the 'profiles' table (renamed from 'users' to match Supabase convention)
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // Handle AbortError specifically to avoid console noise
        if (error.message?.includes('AbortError')) return null;
        throw error;
      }
      return data as User
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted) {
          setSession(session)
          setSupabaseUser(session?.user ?? null)
          
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id)
            if (mounted) setUser(profile)
          }
        }
      } catch (error) {
        console.error('Initialization error:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setSession(session)
        setSupabaseUser(session.user)
        
        // Fetch profile and update state
        const profile = await fetchUserProfile(session.user.id)
        if (mounted) {
          setUser(profile)
          setLoading(false)
        }
      } else {
        setSession(null)
        setSupabaseUser(null)
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchUserProfile])

  async function signUp(email: string, password: string, name: string) {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      })
      if (error) throw getUserFriendlyError(error)
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw getUserFriendlyError(error)

      if (data.session?.user) {
        setSession(data.session)
        setSupabaseUser(data.session.user)
        const profile = await fetchUserProfile(data.session.user.id)
        setUser(profile)
      }

      return { error: null, session: data.session }
    } catch (error: any) {
      return { 
        error: error instanceof Error ? error : getUserFriendlyError(error), 
        session: null 
      }
    }
  }

  async function signOut() {
    try {
      setLoading(true)
      await supabase.auth.signOut()
    } finally {
      setUser(null)
      setSupabaseUser(null)
      setSession(null)
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      supabaseUser, 
      session, 
      loading, 
      isAuthenticated, 
      signUp, 
      signIn, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  )
}
