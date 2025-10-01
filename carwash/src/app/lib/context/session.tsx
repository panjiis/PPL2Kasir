"use client"

import * as React from "react"
import type { Session } from "../types/auth"

interface SessionContextType {
  session: Session | null
  setSession: (session: Session | null) => void
  clearSession: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const SessionContext = React.createContext<SessionContextType | undefined>(undefined)

const SESSION_STORAGE_KEY = "syntra_session"

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = React.useState<Session | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  // Load session dari sessionStorage saat mount
  React.useEffect(() => {
    const loadSession = () => {
      try {
        const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY)
        if (storedSession) {
          const parsedSession: Session = JSON.parse(storedSession)

          // Check apakah session masih valid (belum expired)
          if (parsedSession.expiresAt && parsedSession.expiresAt > Date.now()) {
            setSessionState(parsedSession)
          } else {
            // Session expired, clear it
            sessionStorage.removeItem(SESSION_STORAGE_KEY)
          }
        }
      } catch (error) {
        console.error("Error loading session:", error)
        sessionStorage.removeItem(SESSION_STORAGE_KEY)
      } finally {
        setIsLoading(false)
      }
    }

    loadSession()
  }, [])

  // Auto-clear session saat expired
  React.useEffect(() => {
    if (!session?.expiresAt) return

    const timeUntilExpiry = session.expiresAt - Date.now()

    if (timeUntilExpiry <= 0) {
      clearSession()
      return
    }

    const timeoutId = setTimeout(() => {
      clearSession()
      // Optional: redirect ke login atau show notification
    }, timeUntilExpiry)

    return () => clearTimeout(timeoutId)
  }, [session?.expiresAt])

  const setSession = React.useCallback((newSession: Session | null) => {
    setSessionState(newSession)

    if (newSession) {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession))
      } catch (error) {
        console.error("Error saving session:", error)
      }
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }, [])

  const clearSession = React.useCallback(() => {
    setSessionState(null)
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  }, [])

  const isAuthenticated = React.useMemo(() => {
    if (!session) return false
    if (!session.expiresAt) return true
    return session.expiresAt > Date.now()
  }, [session])

  const value = React.useMemo(
    () => ({
      session,
      setSession,
      clearSession,
      isAuthenticated,
      isLoading,
    }),
    [session, setSession, clearSession, isAuthenticated, isLoading],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// Hook untuk menggunakan session context
export function useSession() {
  const context = React.useContext(SessionContext)
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider")
  }
  return context
}

// Hook untuk mendapatkan token (shorthand)
export function useToken() {
  const { session } = useSession()
  return session?.token || null
}

// Hook untuk mendapatkan user (shorthand)
export function useUser() {
  const { session } = useSession()
  return session?.user || null
}
