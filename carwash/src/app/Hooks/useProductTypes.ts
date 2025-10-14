"use client"

import { useState, useEffect } from "react"
import type { ProductTypeItem } from "../lib/types/pos"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.interphaselabs.com/api/v1"

export function useProductTypes() {
  const [data, setData] = useState<ProductTypeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const fetchProductTypes = async () => {
      try {
        // Update endpoint ke POS Service
        const response = await fetch(`${API_BASE}/pos/product-groups`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch product types")
        }

        const result = await response.json()
        setData(result.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchProductTypes()
  }, [])

  return { data, loading, error }
}