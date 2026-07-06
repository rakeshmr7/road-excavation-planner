import React from "react";
import { Calendar, Layers, ChevronRight, FileEdit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProposalListProps {
  currentRole: "admin" | "planner";
  proposals: any[];
  plannerDept: string;
  selectedProposal: any;
  handleSelectProposal: (prop: any) => void;
  getFilteredProposals: () => any[];
  filterDept: string;
  setFilterDept: (val: string) => void;
  filterPriority: string;
  setFilterPriority: (val: string) => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  searchRoad: string;
  setSearchRoad: (val: string) => void;
  handleDeleteProposal?: (id: string) => void;
}

export const ProposalList: React.FC<ProposalListProps> = ({
  currentRole,
  proposals,
  plannerDept,
  selectedProposal,
  handleSelectProposal,
  getFilteredProposals,
  filterDept,
  setFilterDept,
  filterPriority,
  setFilterPriority,
  filterStatus,
  setFilterStatus,
  searchRoad,
  setSearchRoad,
  handleDeleteProposal,
}) => {
  const router = useRouter();

  if (currentRole === "planner") {
    const deptProposals = proposals.filter((p) => p.department === plannerDept);
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider font-sans">
          {plannerDept.toUpperCase()} Excavation Submissions ({deptProposals.length})
        </h3>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {deptProposals.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 font-sans">
              No proposals submitted by your department yet.
            </div>
          ) : (
            deptProposals.map((prop) => (
              <div
                key={prop.id}
                onClick={() => handleSelectProposal(prop)}
                className={`p-3 rounded-lg border cursor-pointer hover:border-blue-400 transition flex items-center justify-between font-sans ${
                  selectedProposal?.id === prop.id
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-100 bg-slate-50/30"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-800">{prop.road_name}</div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{prop.purpose}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      prop.status === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : prop.status === "revision"
                        ? "bg-purple-100 text-purple-800"
                        : prop.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {prop.status === "revision" ? "needs revision" : prop.status}
                  </span>

                  {prop.status === "revision" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/planner?edit=${prop.id}`);
                      }}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold uppercase transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Edit Revision"
                    >
                      <FileEdit className="h-3 w-3" /> Edit
                    </button>
                  )}

                  {prop.status === "rejected" && handleDeleteProposal && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProposal(prop.id);
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold uppercase transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Delete Proposal"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  const filtered = getFilteredProposals();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <div>
          <h2 className="text-md font-bold text-slate-800">Pending Excavation Clearances</h2>
          <p className="text-xs text-slate-500 font-medium">GCC administrative decision list</p>
        </div>
        <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-bold">
          {proposals.filter((p) => p.status === "pending").length} Pending
        </span>
      </div>

      {/* Filter Options */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="border rounded p-1.5 text-[10px] focus:outline-none"
        >
          <option value="all">All Departments</option>
          <option value="water">CMWSSB (Water)</option>
          <option value="electricity">TNEB (Power)</option>
          <option value="gas">Chennai Gas</option>
          <option value="telecom">Telecom</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="border rounded p-1.5 text-[10px] focus:outline-none"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="emergency">Emergency</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded p-1.5 text-[10px] focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="revision">Needs Revision</option>
        </select>

        <input
          type="text"
          placeholder="Search street..."
          value={searchRoad}
          onChange={(e) => setSearchRoad(e.target.value)}
          className="border rounded p-1.5 text-[10px] focus:outline-none"
        />
      </div>

      <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No excavation proposals matching filter criteria.
          </div>
        ) : (
          filtered.map((prop) => (
            <div
              key={prop.id}
              onClick={() => handleSelectProposal(prop)}
              className={`p-4 rounded-xl border cursor-pointer hover:border-slate-300 transition flex items-start justify-between gap-4 ${
                selectedProposal?.id === prop.id
                  ? "border-blue-500 bg-blue-50/20"
                  : "border-slate-200"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      prop.department === "water"
                        ? "bg-blue-100 text-blue-800"
                        : prop.department === "electricity"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {prop.department.toUpperCase()}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      prop.priority === "high" || prop.priority === "emergency"
                        ? "bg-red-100 text-red-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {prop.priority}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-800">{prop.road_name}</h3>
                <p className="text-[10px] text-slate-500 line-clamp-2">{prop.purpose}</p>
                <div className="flex items-center gap-3 text-[10px] text-slate-600 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {prop.start_date} to {prop.end_date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" /> {prop.length_m} meters
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end justify-between h-full gap-4">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    prop.status === "approved"
                      ? "bg-emerald-100 text-emerald-800"
                      : prop.status === "pending"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {prop.status}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
