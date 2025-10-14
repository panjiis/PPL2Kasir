'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

type NotificationType = 'success' | 'error' |  'info' | null;
type NotificationValue = {
  type: NotificationType;
  message: string;
  amount?: number;
  method?: string;
};

type NotificationContextProps = {
  notif: NotificationValue;
  showNotif: (notif: NotificationValue) => void;
  clearNotif: () => void;
};

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notif, setNotif] = useState<NotificationValue>({ type: null, message: '' });

  const showNotif = (value: NotificationValue) => setNotif(value);
  const clearNotif = () => setNotif({ type: null, message: '' });

  return (
    <NotificationContext.Provider value={{ notif, showNotif, clearNotif }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}