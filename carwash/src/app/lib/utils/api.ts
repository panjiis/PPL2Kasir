import type { LoginResponse } from "../types/auth"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.interphaselabs.com/api/v1"

// Helper untuk handle API errors
class ApiRequestError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = "ApiRequestError"
    this.status = status
    this.code = code
  }
}

// Generic fetch wrapper dengan error handling
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new ApiRequestError(data.message || "An error occurred", response.status, data.code)
    }

    return data
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error
    }

    // Network errors atau parsing errors
    throw new ApiRequestError("Network error. Please check your connection.", undefined, "NETWORK_ERROR")
  }
}

// Authenticated request wrapper (untuk request yang butuh token)
export async function authenticatedRequest<T>(endpoint: string, token: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}

// Login function
export async function login(username: string, password: string): Promise<LoginResponse> {
  if (!username || !password) {
    throw new ApiRequestError("Username and password are required", 400, "VALIDATION_ERROR")
  }

  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
}

// Logout function (jika API menyediakan endpoint logout)
export async function logout(token: string): Promise<void> {
  try {
    await authenticatedRequest("/auth/logout", token, {
      method: "POST",
    })
  } catch (error) {
    console.error("Logout error:", error)
    // Tidak throw error karena kita tetap ingin clear session di client
  }
}

// Verify token (untuk check apakah token masih valid)
export async function verifyToken(token: string): Promise<boolean> {
  try {
    await authenticatedRequest("/auth/verify", token, {
      method: "GET",
    })
    return true
  } catch (error) {
    return false
  }
}

// Refresh token (jika API menyediakan refresh mechanism)
export async function refreshToken(token: string): Promise<LoginResponse> {
  return authenticatedRequest<LoginResponse>("/auth/refresh", token, {
    method: "POST",
  })
}

export { ApiRequestError }
