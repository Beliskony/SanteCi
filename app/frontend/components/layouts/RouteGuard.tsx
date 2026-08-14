"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/app/frontend/store/useAuthStore";

interface RouteGuardProps {
  children: React.ReactNode;
}

const ROLE_PREFIXES: Array<{ prefix: string; role: "patient" | "doctor" }> = [
  { prefix: "/doctor",  role: "doctor" },
  { prefix: "/patient", role: "patient" },
];

function getRequiredRole(pathname: string): "patient" | "doctor" | null {
  const match = ROLE_PREFIXES.find(({ prefix }) => pathname.startsWith(prefix));
  return match?.role ?? null;
}

const RouteGuard = ({ children }: RouteGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();

  const requiredRole = getRequiredRole(pathname ?? "");

  useEffect(() => {
    if (!_hasHydrated) return;

    if (!isAuthenticated || !user || user.role !== requiredRole) {
      router.replace("/");
    }
  }, [_hasHydrated, isAuthenticated, user, requiredRole, router]);

  if (!_hasHydrated || !isAuthenticated || !user || user.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
};

export default RouteGuard;