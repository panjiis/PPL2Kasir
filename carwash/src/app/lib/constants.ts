export const COLOR_CHOICES = [
  { key: "primary", bg: "bg-primary", text: "text-primary-foreground" },
  { key: "secondary", bg: "bg-secondary", text: "text-secondary-foreground" },
  { key: "muted", bg: "bg-muted", text: "text-foreground" },
  { key: "destructive", bg: "bg-destructive", text: "text-destructive-foreground" },
  { key: "card", bg: "bg-card", text: "text-foreground" },
] as const

export type ColorKey = (typeof COLOR_CHOICES)[number]["key"]

export function classesForColor(key: ColorKey) {
  const found = COLOR_CHOICES.find((c) => c.key === key) ?? COLOR_CHOICES[0]
  return { bg: found.bg, text: found.text }
}
