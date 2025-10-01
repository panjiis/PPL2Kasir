"use client"
import React from "react"
import {
  EllipsisVertical,
  ListOrdered,
  LayoutDashboard,
  CreditCard,
  BarChart3,
  Boxes,
  Users,
  UserCog,
  Settings,
  History,
} from "lucide-react"
import { useCart } from "./cart-content"
import { usePreferences } from "@/app/providers/preferences-context"

const baseUser = {
  name: "WaziTUYA",
  role: "Admin",
  photo: "/logo.jpg",
}

const rawNavItems = [
  { key: "customize", label: "Customize", icon: LayoutDashboard, link: "/dashboard" },
  { key: "orders", label: "Order List", icon: ListOrdered, link: "/orders" },
  { key: "history", label: "History", icon: History, link: "/history" },
  { key: "transactions", label: "Transactions", icon: CreditCard, link: "/transactions" },
  { key: "reports", label: "Reports", icon: BarChart3, link: "/reports" },
  { key: "inventory", label: "Inventory", icon: Boxes, link: "/inventory" },
  { key: "customers", label: "Customers", icon: Users, link: "/customers" },
  { key: "staff", label: "Staff", icon: UserCog, link: "/staff" },
  { key: "settings", label: "Settings", icon: Settings, link: "/settings" },
]

export default function SidebarMock() {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const { setPaymentSheetOpen, billOption } = useCart()
  const { isCustomize, toggleCustomize, getButtonLabel, getButtonColorClasses, setButtonPref, colorOptions } =
    usePreferences()

  const user = baseUser

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Top row: Logo + bar */}
      <div className="flex items-center gap-1">
        <img src="/logo.jpg" alt="Logo" className="h-8 w-8 rounded-md bg-primary object-cover" />
        <div className="h-8 flex-1 rounded-md bg-primary flex items-center justify-center font-rubik font-bold tracking-wide text-primary-foreground text-base">
          Ezel Carwash Cilodong
        </div>
      </div>

      {/* Create order & Dashboard button side by side */}
      <div className="flex gap-2">
        <div
          className={[
            "flex-1 rounded-lg border border-border bg-primary p-3 text-primary-foreground cursor-pointer",
            !billOption ? "opacity-40 cursor-not-allowed" : "",
          ].join(" ")}
          onClick={() => billOption && setPaymentSheetOpen(true)}
          aria-disabled={!billOption}
          tabIndex={billOption ? 0 : -1}
        >
          <div className="flex items-center gap-3 justify-center">
            <div className="grid h-7 w-7 place-items-center text-primary-foreground/80">
              <ListOrdered className="h-4 w-4" />
            </div>
            <span className="text-sm">Create order</span>
          </div>
        </div>
        <button
          onClick={toggleCustomize}
          className="flex-1 rounded-lg border border-border bg-primary p-3 text-primary-foreground cursor-pointer flex items-center gap-3 justify-center hover:opacity-90 transition"
          aria-pressed={isCustomize}
        >
          <div className="grid h-7 w-7 place-items-center text-primary-foreground/80">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <span className="text-sm">{isCustomize ? "Done" : "Customize"}</span>
        </button>
      </div>

      {/* Grid of nav tiles */}
      <div className="grid grid-cols-3 gap-3">
        {rawNavItems.map((item) => {
          const key = `sidebar:${item.key}`
          const label = getButtonLabel(key, item.label)
          const color = getButtonColorClasses(key)
          return (
            <div key={item.key} className="rounded-lg border p-3 text-center transition group">
              <a
                href={item.link}
                className={[
                  "block rounded-md p-2",
                  color.bg,
                  color.text,
                  color.border ? color.border : "border-border",
                ].join(" ")}
              >
                <div className="mx-auto mb-2 grid h-10 w-10 place-items-center text-current">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="text-xs">{label}</div>
              </a>

              {isCustomize && (
                <div className="mt-2 space-y-2">
                  <input
                    className="w-full rounded-md border border-border bg-card text-foreground text-xs px-2 py-1"
                    defaultValue={label}
                    onBlur={(e) => setButtonPref(key, { label: e.currentTarget.value })}
                  />
                  <div className="flex flex-wrap gap-1">
                    {colorOptions.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setButtonPref(key, { color: opt.key })}
                        className={["h-5 w-5 rounded", opt.classes.bg].join(" ")}
                        aria-label={opt.label}
                        title={opt.label}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom composer */}
      <div className="mt-auto rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-md border-2 border-dashed text-foreground/70 overflow-hidden">
            <img src={user.photo || "/placeholder.svg"} alt={user.name} className="h-8 w-8 object-cover rounded-md" />
          </div>
          <div className="flex flex-col flex-1">
            <span className="text-base font-medium font-rubik text-foreground">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.role}</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="h-8 w-8 flex items-center justify-center"
              aria-label="User menu"
            >
              <EllipsisVertical color="currentColor" size={24} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-32 rounded bg-card shadow-lg border border-border z-10">
                <button
                  className="block w-full px-4 py-2 text-left text-foreground hover:bg-secondary"
                  onClick={() => setMenuOpen(false)}
                >
                  User Setting
                </button>
                <button
                  className="block w-full px-4 py-2 text-left text-foreground hover:bg-secondary"
                  onClick={() => setMenuOpen(false)}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customize tools area (appear in unused space) */}
      {isCustomize && (
        <div className="rounded-lg border border-border bg-secondary p-3">
          <div className="text-sm font-semibold  font-rubik text-foreground mb-2">Palette</div>
          <div className="flex gap-2 flex-wrap">
            {colorOptions.map((opt) => (
              <div key={opt.key} className="flex items-center gap-2">
                <span className={["h-5 w-5 rounded border border-border", opt.classes.bg].join(" ")} />
                <span className="text-xs text-muted-foreground">{opt.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
