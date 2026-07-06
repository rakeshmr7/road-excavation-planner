"use client";

import { useRouter } from "next/navigation";
import { Building2, Shield, Wrench, ChevronRight, Cpu, Layers, Sparkles } from "lucide-react";

export default function Home() {
  const router = useRouter();

  const handleEnterWorkspace = (targetPath: string) => {
    const token = localStorage.getItem("supabase_token");
    if (!token) {
      router.push("/login");
    } else {
      router.push(targetPath);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between relative overflow-hidden">
      {/* Background ambient glow shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-6 flex items-center justify-between border-b border-slate-900 backdrop-blur z-10 bg-slate-950/80">
        <div className="flex items-center gap-3">
          <Building2 className="h-9 w-9 text-amber-400" />
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-slate-100">Greater Chennai Corporation</h1>
            <p className="text-[10px] uppercase font-bold text-slate-400">Road Excavation Coordination & AI Planning Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">GCC Infrastructure Portal v1.2</span>
        </div>
      </header>

      {/* Main Selector */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 z-10 max-w-5xl mx-auto w-full">
        {/* Title */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-900 text-xs text-blue-300 font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" /> Chennai Municipal GIS & AI Integration
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white max-w-2xl leading-tight">
            Coordinated Road Excavation Planning Platform
          </h2>
          <p className="text-slate-400 text-xs md:text-sm max-w-xl mx-auto font-medium">
            Authorized portal for government administrators and public utility departments. Please select your dedicated workspace below to begin.
          </p>
        </div>

        {/* Portal choice cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Card 1: GCC Admin */}
          <div className="group bg-slate-900/40 border border-slate-800 rounded-2xl p-8 hover:border-blue-500/50 hover:bg-slate-900/60 transition-all duration-300 flex flex-col justify-between shadow-2xl relative">
            <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
            
            <div className="space-y-6">
              <div className="inline-flex p-4 rounded-xl bg-blue-950/80 border border-blue-900 text-blue-400">
                <Shield className="h-7 w-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                  GCC Zonal Administrator Portal
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Review and authorize excavation requests. Manage vector-embedded policy databases, analyze real-time AI weather and traffic risks, and audit tamper-proof system logs.
                </p>
              </div>

              {/* Feature list */}
              <ul className="space-y-2.5 text-xs text-slate-400 font-semibold">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Approve/Reject utility permit requests
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  RAG policy Knowledge Base Management
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Examine compliance reports and traffic metrics
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Digital audit trails & AI analytics overview
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <button
                onClick={() => handleEnterWorkspace("/admin")}
                className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50 cursor-pointer"
              >
                Enter Admin Workspace <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Utility Board Planner */}
          <div className="group bg-slate-900/40 border border-slate-800 rounded-2xl p-8 hover:border-amber-500/50 hover:bg-slate-900/60 transition-all duration-300 flex flex-col justify-between shadow-2xl relative">
            <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />

            <div className="space-y-6">
              <div className="inline-flex p-4 rounded-xl bg-amber-950/60 border border-amber-900/50 text-amber-400">
                <Wrench className="h-7 w-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                  Utility Department Planner Workspace
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Plot proposed excavation corridors on the GIS Chennai map. Submit detailed technical permits, detect conflicting duplicate trenches, and inspect coordination opportunities.
                </p>
              </div>

              {/* Feature list */}
              <ul className="space-y-2.5 text-xs text-slate-400 font-semibold">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Draw coordinates on Leaflet GIS Monitoring Map
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  3-step digital permit creation wizard
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Submit proposals (CMWSSB, TNEB, Gas, Telecom)
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Analyze multi-department coordination savings
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <button
                onClick={() => handleEnterWorkspace("/planner")}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-amber-950/20 cursor-pointer"
              >
                Enter Planner Workspace <ChevronRight className="h-4 w-4 text-slate-950" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-900 bg-slate-950 text-center text-[10px] text-slate-500 backdrop-blur z-10 font-sans">
        © 2026 Greater Chennai Corporation. All rights reserved. Managed by GCC Digital Services Division & Zonal GIS Coordination Committee.
      </footer>
    </div>
  );
}
