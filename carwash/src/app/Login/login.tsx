"use client"
import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Lock } from "lucide-react"
import { useAuth } from "@/app/providers/auth-context"

function Banner({ kind, message }: { kind: "error" | "success"; message: string }) {
  return (
    <div
      className={[
        "rounded-md px-3 py-2 text-sm",
        kind === "error" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground",
      ].join(" ")}
    >
      {message}
    </div>
  )
}

export default function LoginPage() {
  const { login, users } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<null | { kind: "error" | "success"; msg: string }>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    const ok = await login(username, password)
    if (ok) {
      setStatus({ kind: "success", msg: "Login success..." })
      setTimeout(() => router.push("/Kasir"), 800)
    } else {
      setStatus({ kind: "error", msg: "Username / password salah" })
    }
  }

  const quickLogin = async (u: string) => {
    const ok = await login(u, "123456")
    if (ok) router.push("/Kasir")
    else setStatus({ kind: "error", msg: "Gagal login" })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card p-6 rounded-3xl border border-border">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold  font-rubik text-foreground mb-1">SYNTRA</h1>
            <p className="text-sm text-muted-foreground">Login Portal</p>
          </div>
          {status && (
            <div className="mb-3">
              <Banner kind={status.kind} message={status.msg} />
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground text-sm font-semibold font-rubik flex items-center gap-2">
                <User className="w-4 h-4" /> Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground text-sm font-semibold font-rubik flex items-center gap-2">
                <Lock className="w-4 h-4" /> Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground font-semibold font-rubik py-3 rounded-xl">
              Login
            </Button>
          </form>
        </Card>

        <Card className="bg-card p-6 rounded-3xl border border-border">
          <div className="text-sm text-muted-foreground mb-2">Dummy Users (klik untuk cepat login)</div>
          <div className="grid gap-2">
            {users.map((u) => (
              <button
                key={u.username}
                className="rounded-md border border-border bg-secondary px-3 py-2 text-left hover:opacity-90"
                onClick={() => quickLogin(u.username)}
              >
                <div className="text-foreground  font-rubik font-medium">{u.displayName}</div>
                <div className="text-xs text-muted-foreground">username: {u.username} • password: 123456</div>
              </button>
            ))}
          </div>
          <div className="mt-6">
            <div className="rounded-xl overflow-hidden">
              <img src="/image.jpg" alt="Sports car in showroom" className="w-full h-40 object-cover" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
