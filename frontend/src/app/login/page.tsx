"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Shield, Wrench, Lock, Mail, RefreshCw, AlertCircle, Sparkles, Server } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  // Mode tabs: "live" or "bypass"
  const [authMode, setAuthMode] = useState<"live" | "bypass">("live");

  // Live Auth states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Supabase Config states fetched dynamically from Backend
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [backendOnline, setBackendOnline] = useState(false);

  const getBackendUrl = () => {
    let url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    return url;
  };
  const BACKEND_URL = getBackendUrl();

  // Redirect logged-in users back to their respective dashboards automatically
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("supabase_token");
      const rawRole = localStorage.getItem("supabase_role");
      const role = rawRole ? rawRole.trim().toLowerCase() : "";
      
      console.log("[Login Page Gateway] Checking auto-restore:", { token: token ? "present" : "missing", rawRole, role });

      if (token && role) {
        if (role === "admin" || role === "administrator") {
          console.log("[Login Page Gateway] Auto-restoring admin session...");
          router.push("/admin");
        } else if (role === "planner") {
          console.log("[Login Page Gateway] Auto-restoring planner session...");
          router.push("/planner");
        }
      }
    }
  }, [router]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/config`);
        if (res.ok) {
          const data = await res.json();
          setSupabaseUrl(data.supabase_url);
          setSupabaseAnonKey(data.supabase_anon_key);
          setBackendOnline(true);
          if (!data.supabase_url || !data.supabase_anon_key) {
            // If keys are blank in env, default to bypass tab
            setAuthMode("bypass");
          }
        }
      } catch (e) {
        console.error("Backend config fetch failed", e);
        setBackendOnline(false);
        setAuthMode("bypass");
      }
    };
    fetchConfig();
  }, []);

  const handleLiveLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase credentials are not configured on the server yet. Please use the Developer Bypass tab.");
      }

      // POST to Supabase GoTrue Auth token endpoint
      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error_description || "Invalid email or password.");
      }

      const authData = await res.json();
      const token = authData.access_token;

      // Call backend `/me` endpoint with token to resolve and lazy-sync user profile role
      const meRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!meRes.ok) {
        throw new Error("Failed to sync profile with database.");
      }

      const meData = await meRes.json();

      // Save credentials locally
      localStorage.setItem("supabase_token", token);
      localStorage.setItem("supabase_role", meData.role);
      localStorage.setItem("supabase_dept", meData.department);
      localStorage.setItem("supabase_name", meData.full_name);

      // Route based on role
      if (meData.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/planner");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleBypassLogin = (role: "admin" | "planner", dept: string = "water") => {
    const token = role === "admin" ? "mock-token-superadmin" : `mock-token-${dept}`;
    const name = role === "admin" ? "Super Admin" : `${dept.toUpperCase()} Planner`;

    localStorage.setItem("supabase_token", token);
    localStorage.setItem("supabase_role", role);
    localStorage.setItem("supabase_dept", dept);
    localStorage.setItem("supabase_name", name);

    if (role === "admin") {
      router.push("/admin");
    } else {
      router.push("/planner");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between relative overflow-hidden">
      {/* Background ambient glow shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-6 flex items-center justify-between border-b border-slate-900 backdrop-blur z-10 bg-slate-950/80">
        <div className="flex items-center gap-3">
          <Building2 className="h-9 w-9 text-amber-400" />
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-slate-100">Greater Chennai Corporation</h1>
            <p className="text-[10px] uppercase font-bold text-slate-400">Road Excavation Coordination & AI Planning Platform</p>
          </div>
        </div>
      </header>

      {/* Auth Form Card */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 z-10">
        <div className="w-full max-w-md bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur shadow-2xl relative">
          <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />

          {/* Heading */}
          <div className="text-center space-y-2 mb-6">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-900/60 text-[10px] text-blue-300 font-bold uppercase tracking-wider">
              <Sparkles className="h-3 w-3 text-amber-400" /> Secure Gateway
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">Access Control Portal</h2>
            <p className="text-[11px] text-slate-400">Authorized personnel only</p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800/80 text-xs font-semibold mb-6">
            <button
              onClick={() => setAuthMode("live")}
              className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                authMode === "live"
                  ? "bg-blue-950 text-white border border-blue-900/50"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Server className="h-3.5 w-3.5" /> Supabase Connection
            </button>
            <button
              onClick={() => setAuthMode("bypass")}
              className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                authMode === "bypass"
                  ? "bg-blue-950 text-white border border-blue-900/50"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Lock className="h-3.5 w-3.5" /> Developer Bypass
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-xs text-rose-300 flex items-center gap-2 mb-4 font-semibold">
              <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Live Login Form */}
          {authMode === "live" && (
            <form onSubmit={handleLiveLogin} className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="block text-slate-400 uppercase font-bold tracking-wider">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-500" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="e.g. admin@chennai.gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500/50 transition font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-400 uppercase font-bold tracking-wider">Secret Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-500" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500/50 transition font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-950/50"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  "Authenticate & Verify"
                )}
              </button>
            </form>
          )}

          {/* Developer Bypass Form */}
          {authMode === "bypass" && (
            <div className="space-y-4 text-xs font-sans">
              <div className="p-3 bg-amber-950/40 border border-amber-900/40 text-amber-300 rounded-xl leading-relaxed text-[11px] font-semibold">
                <strong>Local Development Mode:</strong> Use these tokens to test database structures, UI views, and page layouts without active internet or Supabase connections.
              </div>

              <div className="space-y-2.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Choose Session Profile</h4>
                
                <button
                  onClick={() => handleBypassLogin("admin")}
                  className="w-full p-4 bg-slate-950 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-950/80 rounded-xl transition flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-950/60 rounded-lg text-amber-400">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block font-bold text-slate-200 group-hover:text-amber-400 transition-colors">GCC Zonal Administrator</span>
                      <span className="text-[10px] text-slate-400">Role: admin (Full Clearance Authority)</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </button>

                <button
                  onClick={() => handleBypassLogin("planner", "water")}
                  className="w-full p-4 bg-slate-950 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-950/80 rounded-xl transition flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-950/60 rounded-lg text-blue-400">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block font-bold text-slate-200 group-hover:text-blue-400 transition-colors">Utility Board Planner</span>
                      <span className="text-[10px] text-slate-400">Role: planner (CMWSSB Water Department)</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-900 bg-slate-950 text-center text-[10px] text-slate-500 backdrop-blur z-10 font-sans">
        © 2026 Greater Chennai Corporation. All rights reserved. Managed by GCC Digital Services Division & Zonal GIS Coordination Committee.
      </footer>
    </div>
  );
}

// Icon helper since ChevronRight was not imported initially in react
function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
