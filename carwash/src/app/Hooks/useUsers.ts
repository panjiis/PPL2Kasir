"use client"

import { useState, useEffect } from "react"
import { useToken } from "../lib/context/session"

export interface User {
  id: string
  username: string
  email?: string
  name?: string
  role?: string
}

interface UsersResponse {
  success: boolean
  data: any[]
  message?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.interphaselabs.com/api/v1"

export function useUsers() {
  const [data, setData] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const token = useToken()

  const fetchUsers = async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }

      const result: UsersResponse = await response.json()

      const users = result.data.map((item: any) => ({
        id: item.id || item.user_id,
        username: item.username,
        email: item.email,
        name: item.name || item.full_name,
        // Flatten role object to string if it's an object
        role:
          typeof item.role === "object" && item.role !== null
            ? item.role.role_name || JSON.stringify(item.role)
            : item.role,
      }))

      setData(users)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [token])

  return { data, loading, error, refetch: fetchUsers }
}
