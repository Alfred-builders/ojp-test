"use client";

import type { UserRole } from "@/types/auth";

interface RequireRoleProps {
  role: UserRole;
  allowed: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireRole({
  role,
  allowed,
  children,
  fallback = null,
}: RequireRoleProps) {
  if (!allowed.includes(role)) return fallback;
  return children;
}
