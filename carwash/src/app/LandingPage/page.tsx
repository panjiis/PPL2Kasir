"use client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const raw = localStorage.getItem("currentUser")
    if (raw) {
      router.replace("/Kasir")
    } else {
      router.replace("/Login")
    }
  }, [router])

  // sementara loading kosong
  return null
}
