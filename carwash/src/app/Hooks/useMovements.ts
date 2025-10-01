"use client"

import { useState, useEffect } from "react"
import type { StockMovement } from "../lib/types/inventory"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

export function useMovements() {
  const [data, setData] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMovements = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${API_BASE}/api/v1/inventory/movements`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch movements")
        }

        const result = await response.json()
        console.log("[v0] Movements API response:", result)
        setData(result.data || [])
      } catch (err) {
        console.error("[v0] Error fetching movements:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchMovements()
  }, [])

  return { data, loading, error }
}
