import React from "react";
import { Building2, User, Shield, LogOut } from "lucide-react";

interface HeaderProps {
  currentRole: "admin" | "planner";
  setCurrentRole?: (role: "admin" | "planner") => void;
  serverOnline: boolean;
  setActiveTab?: (tab: any) => void;
  showRoleSwitcher?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  setCurrentRole,
  serverOnline,
  setActiveTab,
  showRoleSwitcher = true,
}) => {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-blue-900 text-white shadow-md">
      <div className="flex items-center gap-3 font-sans">
        <Building2 className="h-8 w-8 text-amber-400" />
        <div>
          <h1 className="text-lg font-bold tracking-tight">GREATER CHENNAI CORPORATION</h1>
          <p className="text-xs text-blue-200">
            {currentRole === "admin" ? "GCC Zonal Administrative Workspace" : "Utility Planner Excavation Portal"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Server Online Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-blue-950 border border-blue-800 font-sans">
          <span className={`h-2.5 w-2.5 rounded-full ${serverOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
          <span className="text-[10px] text-blue-200">{serverOnline ? 'FastAPI Connected' : 'Offline Preview Mode'}</span>
        </div>

        {/* Role Switcher Toggle (only if showRoleSwitcher is true) */}
        {showRoleSwitcher && setCurrentRole && setActiveTab && (
          <div className="flex items-center bg-blue-950 p-1 rounded-lg border border-blue-800 font-sans">
            <button
              onClick={() => {
                setCurrentRole("planner");
                setActiveTab("dashboard");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                currentRole === "planner"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-blue-300 hover:text-white"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Planner
            </button>
            <button
              onClick={() => {
                setCurrentRole("admin");
                setActiveTab("dashboard");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                currentRole === "admin"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-blue-300 hover:text-white"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              GCC Admin
            </button>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={() => {
            localStorage.removeItem("supabase_token");
            localStorage.removeItem("supabase_role");
            localStorage.removeItem("supabase_dept");
            localStorage.removeItem("supabase_name");
            window.location.href = "/login";
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-950 border border-blue-800 hover:bg-blue-850 transition text-rose-200 cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};
