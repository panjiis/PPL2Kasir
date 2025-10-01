"use client"
import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"

type User = { username: string; displayName: string }
type AuthContextValue = {
  user: User | null
  users: User[]
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}
const AuthContext = createContext<AuthContextValue | null>(null)

const DUMMY_USERS: Array<{ username: string; password: string; displayName: string }> = [
  { username: "admin", password: "123456", displayName: "Administrator" },
  { username: "budi", password: "123456", displayName: "Budi" },
  { username: "sari", password: "123456", displayName: "Sari" },
  { username: "rani", password: "123456", displayName: "Rani" },
  { username: "dimas", password: "123456", displayName: "Dimas" },
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem("currentUser")
    if (raw) {
      try {
        const u = JSON.parse(raw) as User
        setUser(u)
      } catch {}
    }
  }, [])

  const login = async (username: string, password: string) => {
    const match = DUMMY_USERS.find((u) => u.username === username && u.password === password)
    if (!match) return false
    const u = { username: match.username, displayName: match.displayName }
    localStorage.setItem("currentUser", JSON.stringify(u))
    setUser(u)
    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("currentUser")
  }

  const users = useMemo<User[]>(() => DUMMY_USERS.map(({ username, displayName }) => ({ username, displayName })), [])

  const value: AuthContextValue = { user, users, login, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
