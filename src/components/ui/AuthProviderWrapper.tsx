"use client"

import { AuthProvider } from "@/contexts/AuthContext";
import { ReactNode } from "react";

export function AuthProviderWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}