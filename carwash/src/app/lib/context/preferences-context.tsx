"use client"

import * as React from "react"

interface ButtonPref {
  label?: string
  color?: string
}

interface PreferencesContextType {
  isCustomize: boolean
  toggleCustomize: () => void
  getButtonLabel: (key: string, defaultLabel: string) => string
  getButtonColorClasses: (key: string) => { bg: string; text: string; border?: string }
  setButtonPref: (key: string, pref: ButtonPref) => void
  colorOptions: Array<{ key: string; label: string; classes: { bg: string; text: string } }>
  getProductImage: (productId: string, defaultImage: string) => string
  setProductImage: (productId: string, image: string) => void
}

const PreferencesContext = React.createContext<PreferencesContextType | undefined>(undefined)

const COLOR_OPTIONS = [
  { key: "primary", label: "Primary", classes: { bg: "bg-primary", text: "text-primary-foreground" } },
  { key: "secondary", label: "Secondary", classes: { bg: "bg-secondary", text: "text-secondary-foreground" } },
  { key: "accent", label: "Accent", classes: { bg: "bg-accent", text: "text-accent-foreground" } },
  { key: "muted", label: "Muted", classes: { bg: "bg-muted", text: "text-muted-foreground" } },
]

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [isCustomize, setIsCustomize] = React.useState(false)
  const [buttonPrefs, setButtonPrefs] = React.useState<Record<string, ButtonPref>>({})
  const [productImages, setProductImages] = React.useState<Record<string, string>>({})

  const toggleCustomize = React.useCallback(() => {
    setIsCustomize((prev) => !prev)
  }, [])

  const getButtonLabel = React.useCallback(
    (key: string, defaultLabel: string) => {
      return buttonPrefs[key]?.label || defaultLabel
    },
    [buttonPrefs],
  )

  const getButtonColorClasses = React.useCallback(
    (key: string) => {
      const colorKey = buttonPrefs[key]?.color || "primary"
      const option = COLOR_OPTIONS.find((o) => o.key === colorKey)
      return option?.classes || COLOR_OPTIONS[0].classes
    },
    [buttonPrefs],
  )

  const setButtonPref = React.useCallback((key: string, pref: ButtonPref) => {
    setButtonPrefs((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...pref },
    }))
  }, [])

  const getProductImage = React.useCallback(
    (productId: string, defaultImage: string) => {
      return productImages[productId] || defaultImage
    },
    [productImages],
  )

  const setProductImage = React.useCallback((productId: string, image: string) => {
    setProductImages((prev) => ({
      ...prev,
      [productId]: image,
    }))
  }, [])

  const value = React.useMemo(
    () => ({
      isCustomize,
      toggleCustomize,
      getButtonLabel,
      getButtonColorClasses,
      setButtonPref,
      colorOptions: COLOR_OPTIONS,
      getProductImage,
      setProductImage,
    }),
    [
      isCustomize,
      toggleCustomize,
      getButtonLabel,
      getButtonColorClasses,
      setButtonPref,
      getProductImage,
      setProductImage,
    ],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const context = React.useContext(PreferencesContext)
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider")
  }
  return context
}
