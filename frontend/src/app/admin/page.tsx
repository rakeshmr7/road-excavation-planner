"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { GCCDashboard } from "../../components/GCCDashboard";

export default function AdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("supabase_token");
    const rawRole = localStorage.getItem("supabase_role");
    const role = rawRole ? rawRole.trim().toLowerCase() : "";

    console.log("[Admin Page Guard] Checking auth:", { token: token ? "present" : "missing", rawRole, role });

    if (!token) {
      console.log("[Admin Page Guard] No token found, redirecting to /login");
      router.push("/login");
    } else if (role !== "admin" && role !== "administrator") {
      console.log("[Admin Page Guard] Role mismatch, redirecting to /login");
      router.push("/login");
    } else {
      console.log("[Admin Page Guard] Authorization successful");
      setAuthorized(true);
    }
  }, [router]);

  if (!mounted || !authorized) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-900" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Checking credentials...</span>
        </div>
      </div>
    );
  }

  return <GCCDashboard forcedRole="admin" showRoleSwitcher={false} />;
}
