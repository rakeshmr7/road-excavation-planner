import { FileText, Layers, Database, BarChart3, Clock, Users } from "lucide-react";

interface SidebarProps {
  activeTab: "dashboard" | "create_proposal" | "submissions" | "gis" | "policies" | "audit" | "analytics" | "users";
  setActiveTab: (tab: "dashboard" | "create_proposal" | "submissions" | "gis" | "policies" | "audit" | "analytics" | "users") => void;
  currentRole: "admin" | "planner";
  plannerDept: "water" | "electricity" | "gas" | "telecom";
  setPlannerDept: (dept: "water" | "electricity" | "gas" | "telecom") => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentRole,
  plannerDept,
  setPlannerDept,
}) => {
  return (
    <nav className="w-64 bg-slate-900 text-slate-300 p-4 flex flex-col justify-between flex-shrink-0">
      <div className="flex flex-col gap-1.5 font-sans">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Navigation</div>

        {/* Admin Navigation */}
        {currentRole === "admin" && (
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "dashboard"
                ? "bg-blue-950 text-white border-l-4 border-amber-500"
                : "hover:bg-slate-800 hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4 text-blue-400" />
            Pending Approvals
          </button>
        )}

        {/* Planner Navigation */}
        {currentRole === "planner" && (
          <>
            <button
              onClick={() => setActiveTab("create_proposal")}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "create_proposal"
                  ? "bg-blue-950 text-white border-l-4 border-amber-500"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <FileText className="h-4 w-4 text-emerald-400" />
              New Permit Request
            </button>

            <button
              onClick={() => setActiveTab("submissions")}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "submissions"
                  ? "bg-blue-950 text-white border-l-4 border-amber-500"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Layers className="h-4 w-4 text-blue-400" />
              My Submissions
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab("gis")}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
            activeTab === "gis"
              ? "bg-blue-950 text-white border-l-4 border-amber-500"
              : "hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Layers className="h-4 w-4 text-cyan-400" />
          GIS Monitoring Radar
        </button>

        {currentRole === "admin" && (
          <>
            <button
              onClick={() => setActiveTab("policies")}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "policies"
                  ? "bg-blue-950 text-white border-l-4 border-amber-500"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Database className="h-4 w-4 text-amber-400" />
              Policy Knowledge Base
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "analytics"
                  ? "bg-blue-950 text-white border-l-4 border-amber-500"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              AI Analytics
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "audit"
                  ? "bg-blue-950 text-white border-l-4 border-amber-500"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Clock className="h-4 w-4 text-purple-400" />
              Digital Audit Trail
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "users"
                  ? "bg-blue-950 text-white border-l-4 border-amber-500"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4 text-cyan-400" />
              Planner Profiles
            </button>
          </>
        )}
      </div>

      {currentRole === "planner" && (
        <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/50 mt-6 flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-500">Active Board Context</span>
          <select
            value={plannerDept}
            onChange={(e: any) => setPlannerDept(e.target.value)}
            disabled={true}
            className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-400 py-1.5 px-2 rounded focus:outline-none cursor-not-allowed opacity-70"
          >
            <option value="water">CMWSSB (Water Board)</option>
            <option value="electricity">TNEB (Electricity Board)</option>
            <option value="gas">Chennai Gas Agency</option>
            <option value="telecom">Telecom Department</option>
          </select>
        </div>
      )}
    </nav>
  );
};
