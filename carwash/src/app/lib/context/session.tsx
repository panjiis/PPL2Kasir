"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { Session } from "../types/auth";

type SessionContextType = {
  session: Session | null;
  setSession: (session: Session | null) => void;
  clearSession: () => void; // ✅ tambahan
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSessionState] = useState<Session | null>(null);

  // load session on mount
  useEffect(() => {
    const stored = localStorage.getItem("session");
    if (stored) {
      const sessionData: Session = JSON.parse(stored);
      if (sessionData.expiresAt > Date.now()) setSessionState(sessionData);
      else localStorage.removeItem("session");
    }
  }, []);

  // setter
  const setSession = (newSession: Session | null) => {
    setSessionState(newSession);
    if (newSession) localStorage.setItem("session", JSON.stringify(newSession));
    else localStorage.removeItem("session");
  };

  // ✅ clearSession helper
  const clearSession = () => {
    setSessionState(null);
    localStorage.removeItem("session");
  };

  // auto-logout on expiration
  useEffect(() => {
    if (!session) return;
    const timeout = session.expiresAt - Date.now();
    if (timeout > 0) {
      const timer = setTimeout(() => setSession(null), timeout);
      return () => clearTimeout(timer);
    } else {
      setSession(null);
    }
  }, [session]);

  return (
    <SessionContext.Provider value={{ session, setSession, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
};
