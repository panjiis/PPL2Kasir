"use client"
import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useAuth } from "./auth-context"

export type ButtonPref = { label?: string; color?: string }
export type Prefs = {
  buttons: Record<string, ButtonPref>
  productImages: Record<string, string>
}
type PreferencesContextValue = {
  isCustomize: boolean
  toggleCustomize: () => void
  colorOptions: { key: string; label: string; classes: { bg: string; text: string; border?: string; hover?: string } }[]
  getButtonLabel: (key: string, fallback: string) => string
  getButtonColorClasses: (
    key: string,
    fallback?: string,
  ) => { bg: string; text: string; border?: string; hover?: string }
  setButtonPref: (key: string, pref: ButtonPref) => void
  getProductImage: (id: string, fallback: string) => string
  setProductImage: (id: string, url: string) => void
  resetAll: () => void
}
const PreferencesContext = createContext<PreferencesContextValue | null>(null)

const DEFAULT_PREFS: Prefs = { buttons: {}, productImages: {} }

export const COLOR_CHOICES = [
  { key: "primary", bg: "bg-primary", text: "text-primary-foreground" },
  { key: "secondary", bg: "bg-secondary", text: "text-foreground" },
  { key: "accent", bg: "bg-accent", text: "text-foreground" },
  { key: "muted", bg: "bg-muted", text: "text-foreground" },
  { key: "card", bg: "bg-card", text: "text-foreground" },
] as const

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [isCustomize, setIsCustomize] = useState(false)
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)

  const storageKey = user ? `prefs:${user.username}` : "prefs:guest"

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setPrefs(JSON.parse(raw))
      else setPrefs(DEFAULT_PREFS)
    } catch {
      setPrefs(DEFAULT_PREFS)
    }
  }, [storageKey])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(prefs))
  }, [prefs, storageKey])

  const colorOptions = useMemo(() => {
    // Tailwind tokens only (no hex). Keep <= 6 options.
    return [
      {
        key: "primary",
        label: "Primary",
        classes: {
          bg: "bg-primary",
          text: "text-primary-foreground",
          border: "border-border",
          hover: "hover:opacity-90",
        },
      },
      {
        key: "secondary",
        label: "Secondary",
        classes: { bg: "bg-secondary", text: "text-foreground", border: "border-border", hover: "hover:opacity-90" },
      },
      {
        key: "accent",
        label: "Accent",
        classes: { bg: "bg-accent", text: "text-foreground", border: "border-border", hover: "hover:opacity-90" },
      },
      {
        key: "muted",
        label: "Muted",
        classes: { bg: "bg-muted", text: "text-foreground", border: "border-border", hover: "hover:opacity-90" },
      },
      {
        key: "card",
        label: "Card",
        classes: { bg: "bg-card", text: "text-foreground", border: "border-border", hover: "hover:opacity-90" },
      },
      {
        key: "ring",
        label: "Ring",
        classes: { bg: "bg-ring", text: "text-foreground", border: "border-border", hover: "hover:opacity-90" },
      },
    ]
  }, [])

  const colorByKey = (key?: string) => colorOptions.find((c) => c.key === key)?.classes || colorOptions[1].classes // default secondary

  const getButtonLabel = (key: string, fallback: string) => prefs.buttons[key]?.label || fallback
  const getButtonColorClasses = (key: string) => colorByKey(prefs.buttons[key]?.color)

  const setButtonPref = (key: string, pref: ButtonPref) => {
    setPrefs((prev) => ({ ...prev, buttons: { ...prev.buttons, [key]: { ...prev.buttons[key], ...pref } } }))
  }

  const getProductImage = (id: string, fallback: string) => prefs.productImages[id] || fallback
  const setProductImage = (id: string, url: string) =>
    setPrefs((prev) => ({ ...prev, productImages: { ...prev.productImages, [id]: url } }))

  const toggleCustomize = () => setIsCustomize((s) => !s)
  const resetAll = () => setPrefs(DEFAULT_PREFS)

  const value: PreferencesContextValue = {
    isCustomize,
    toggleCustomize,
    colorOptions,
    getButtonLabel,
    getButtonColorClasses,
    setButtonPref,
    getProductImage,
    setProductImage,
    resetAll,
  }

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider")
  return ctx
}
