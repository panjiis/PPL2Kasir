"use client"

import { useState, useEffect } from "react"
import type { Stock, StockCheck } from "../lib/types/inventory"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

export function useStocks() {
  const [data, setData] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${API_BASE}/api/v1/inventory/stocks`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch stocks")
        }

        const result = await response.json()
        console.log("[v0] Stocks API response:", result)
        setData(result.data || [])
      } catch (err) {
        console.error("[v0] Error fetching stocks:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchStocks()
  }, [])

  return { data, loading, error }
}

export function useLowStocks() {
  const [data, setData] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLowStocks = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${API_BASE}/api/v1/inventory/stocks/low`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch low stocks")
        }

        const result = await response.json()
        console.log("[v0] Low stocks API response:", result)
        setData(result.data || [])
      } catch (err) {
        console.error("[v0] Error fetching low stocks:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchLowStocks()
  }, [])

  return { data, loading, error }
}

export async function checkStock(productId: string, warehouseId: string, quantity: number): Promise<StockCheck | null> {
  try {
    const token = localStorage.getItem("token")
    const response = await fetch(`${API_BASE}/api/v1/inventory/stocks/check`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId, warehouseId, quantity }),
    })

    if (!response.ok) return null

    const result = await response.json()
    return result.data
  } catch (err) {
    console.error("[v0] Error checking stock:", err)
    return null
  }
}

export async function reserveStock(productId: string, warehouseId: string, quantity: number): Promise<boolean> {
  try {
    const token = localStorage.getItem("token")
    const response = await fetch(`${API_BASE}/api/v1/inventory/stocks/reserve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId, warehouseId, quantity }),
    })

    return response.ok
  } catch (err) {
    console.error("[v0] Error reserving stock:", err)
    return false
  }
}

export async function releaseStock(productId: string, warehouseId: string, quantity: number): Promise<boolean> {
  try {
    const token = localStorage.getItem("token")
    const response = await fetch(`${API_BASE}/api/v1/inventory/stocks/release`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId, warehouseId, quantity }),
    })

    return response.ok
  } catch (err) {
    console.error("[v0] Error releasing stock:", err)
    return false
  }
}

export async function updateStock(productId: string, warehouseId: string, quantity: number): Promise<boolean> {
  try {
    const token = localStorage.getItem("token")
    const response = await fetch(`${API_BASE}/api/v1/inventory/stocks/update`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId, warehouseId, quantity }),
    })

    return response.ok
  } catch (err) {
    console.error("[v0] Error updating stock:", err)
    return false
  }
}

export async function transferStock(
  productId: string,
  fromWarehouseId: string,
  toWarehouseId: string,
  quantity: number,
): Promise<boolean> {
  try {
    const token = localStorage.getItem("token")
    const response = await fetch(`${API_BASE}/api/v1/inventory/stocks/transfer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId, fromWarehouseId, toWarehouseId, quantity }),
    })

    return response.ok
  } catch (err) {
    console.error("[v0] Error transferring stock:", err)
    return false
  }
}
