"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "../lib/context/session";

// 1️⃣ Define User type untuk hasil akhir FE
export interface User {
  id: string;
  username: string;
  email?: string;
  name?: string;
  role?: string;
}

// 2️⃣ Define tipe data mentah dari API (tanpa any)
interface APIUser {
  id?: string;
  user_id?: string;
  username?: string;
  email?: string;
  name?: string;
  full_name?: string;
  role?: string | { role_name?: string };
}

interface UsersResponse {
  success: boolean;
  data: APIUser[];
  message?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.interphaselabs.com/api/v1";

export function useUsers() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useSession(); // ✅ perbaikan: ambil token dari session
  const token = session?.token;

  // ✅ Gunakan useCallback supaya tidak bikin warning useEffect dependency
  const fetchUsers = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const result: UsersResponse = await response.json();

      // 3️⃣ Mapping data tanpa any
      const users: User[] = result.data.map((item) => ({
        id: item.id || item.user_id || "",
        username: item.username || "",
        email: item.email,
        name: item.name || item.full_name,
        role:
          typeof item.role === "object" && item.role !== null
            ? item.role.role_name || JSON.stringify(item.role)
            : item.role,
      }));

      setData(users);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [token]); // ✅ useCallback dependency

  // ✅ Aman dari warning dependency
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { data, loading, error, refetch: fetchUsers };
}
