"use client"

import { useState, useEffect } from "react"
import type { Supplier } from "../lib/types/inventory"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

export function useSuppliers() {
  const [data, setData] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${API_BASE}/api/v1/inventory/suppliers`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch suppliers")
        }

        const result = await response.json()
        console.log("[v0] Suppliers API response:", result)
        setData(result.data || [])
      } catch (err) {
        console.error("[v0] Error fetching suppliers:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchSuppliers()
  }, [])

  return { data, loading, error }
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  try {
    const token = localStorage.getItem("token")
    const response = await fetch(`${API_BASE}/api/v1/inventory/suppliers/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) return null

    const result = await response.json()
    return result.data
  } catch (err) {
    console.error("[v0] Error fetching supplier by ID:", err)
    return null
  }
}
