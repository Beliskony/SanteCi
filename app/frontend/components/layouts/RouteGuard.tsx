"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/frontend/store/useAuthStore";

interface RouteGuardProps {
  role: "patient" | "doctor";
  children: React.ReactNode;
}

const RouteGuard = ({ role, children }: RouteGuardProps) => {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;

    if (!isAuthenticated || !user || user.role !== role) {
      router.replace("/");
    }
  }, [_hasHydrated, isAuthenticated, user, role, router]);

  if (!_hasHydrated || !isAuthenticated || !user || user.role !== role) {
    return null;
  }

  return <>{children}</>;
};

export default RouteGuard;