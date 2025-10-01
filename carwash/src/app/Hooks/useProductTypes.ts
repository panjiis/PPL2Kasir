"use client"

import { useState, useEffect } from "react"
import type { ProductTypeItem } from "../lib/types/inventory"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

export function useProductTypes() {
  const [data, setData] = useState<ProductTypeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProductTypes = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${API_BASE}/api/v1/inventory/product-types`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch product types")
        }

        const result = await response.json()
        console.log("[v0] Product types API response:", result)
        setData(result.data || [])
      } catch (err) {
        console.error("[v0] Error fetching product types:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchProductTypes()
  }, [])

  return { data, loading, error }
}
