"use client";

import { createContext, useContext } from "react";

interface NotificationContextValue {
  userId: string;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  return (
    <NotificationContext.Provider value={{ userId }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotificationContext must be used within NotificationProvider"
    );
  }
  return ctx;
}
