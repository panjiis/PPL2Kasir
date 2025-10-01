"use client"

import { useState, useEffect } from "react"
import { useToken } from "../lib/context/session"

export interface Employee {
  id: string
  name: string
  email?: string
  role?: string
  photo?: string
}

interface EmployeesResponse {
  success: boolean
  data: any[]
  message?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.interphaselabs.com/api/v1"

export function useEmployees() {
  const [data, setData] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const token = useToken()

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    const fetchEmployees = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_BASE_URL}/employees`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch employees")
        }

        const result: EmployeesResponse = await response.json()

        const employees = result.data.map((item: any) => ({
          id: item.id || item.employee_id,
          name: item.name || item.employee_name,
          email: item.email,
          // Flatten role object to string if it's an object
          role:
            typeof item.role === "object" && item.role !== null
              ? item.role.role_name || JSON.stringify(item.role)
              : item.role || item.position,
          photo: item.photo || item.photo_url,
        }))

        setData(employees)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchEmployees()
  }, [token])

  return { data, loading, error }
}
