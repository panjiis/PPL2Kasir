// Types untuk authentication dan user data
export interface User {
  id: string
  username: string
  email?: string
  role?: string
  name?: string
}

export interface LoginResponse {
  success: boolean
  data: {
    token: string
    user: User
    expires_at?: {
      seconds: number
      nanos?: number
    }
  }
  message?: string
}

export interface Session {
  token: string
  user: User
  expiresAt: number
}

export interface ApiError {
  message: string
  status?: number
  code?: string
}
