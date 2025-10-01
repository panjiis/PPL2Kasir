"use client"

import * as React from "react"

interface NotificationContextType {
  notif: {
    type: "success" | "error" | "info" | ""
    message: string
    amount?: number
    method?: string
  }
  showNotif: (type: "success" | "error" | "info", message: string, amount?: number, method?: string) => void
  clearNotif: () => void
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notif, setNotif] = React.useState<{
    type: "success" | "error" | "info" | ""
    message: string
    amount?: number
    method?: string
  }>({
    type: "",
    message: "",
  })

  const showNotif = React.useCallback(
    (type: "success" | "error" | "info", message: string, amount?: number, method?: string) => {
      setNotif({ type, message, amount, method })
      setTimeout(() => {
        setNotif({ type: "", message: "" })
      }, 3000)
    },
    [],
  )

  const clearNotif = React.useCallback(() => {
    setNotif({ type: "", message: "" })
  }, [])

  const value = React.useMemo(
    () => ({
      notif,
      showNotif,
      clearNotif,
    }),
    [notif, showNotif, clearNotif],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotification() {
  const context = React.useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider")
  }
  return context
}
