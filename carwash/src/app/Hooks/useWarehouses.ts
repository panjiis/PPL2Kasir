"use client"

import { useState, useEffect } from "react"
import type { Warehouse } from "../lib/types/inventory"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

export function useWarehouses() {
  const [data, setData] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${API_BASE}/api/v1/inventory/warehouses`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch warehouses")
        }

        const result = await response.json()
        console.log("[v0] Warehouses API response:", result)
        setData(result.data || [])
      } catch (err) {
        console.error("[v0] Error fetching warehouses:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchWarehouses()
  }, [])

  return { data, loading, error }
}

export async function getWarehouseByCode(code: string): Promise<Warehouse | null> {
  try {
    const token = localStorage.getItem("token")
    const response = await fetch(`${API_BASE}/api/v1/inventory/warehouses/code/${code}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) return null

    const result = await response.json()
    return result.data
  } catch (err) {
    console.error("[v0] Error fetching warehouse by code:", err)
    return null
  }
}
