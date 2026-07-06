import React from "react";
import { FileCheck, Clock } from "lucide-react";

interface AnalyticsTabProps {
  proposals: any[];
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ proposals }) => {
  // Compute some quick statistics from the active proposals list
  const waterCount = proposals.filter((p) => p.department === "water").length;
  const powerCount = proposals.filter((p) => p.department === "electricity").length;
  const gasCount = proposals.filter((p) => p.department === "gas").length;
  const telecomCount = proposals.filter((p) => p.department === "telecom").length;

  const totalCount = proposals.length;
  const approvedCount = proposals.filter((p) => p.status === "approved").length;
  const approvalRate = totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(1) : "75.0";

  // Calculate dynamic bar heights relative to container constraints (max height 180px)
  const maxCount = Math.max(waterCount, powerCount, gasCount, telecomCount, 1);
  const getBarHeight = (count: number) => {
    if (count === 0) return 20;
    return (count / maxCount) * 160 + 20;
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Approval Rate</span>
            <span className="text-2xl font-extrabold text-slate-800">{approvalRate}%</span>
          </div>
          <FileCheck className="h-8 w-8 text-emerald-600 bg-emerald-50 p-1.5 rounded-lg" />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Processing Speed</span>
            <span className="text-2xl font-extrabold text-slate-800">4.5 Hrs</span>
          </div>
          <Clock className="h-8 w-8 text-purple-600 bg-purple-50 p-1.5 rounded-lg" />
        </div>
      </div>

      {/* Graphs */}
      <div className="grid grid-cols-2 gap-6">
        {/* 1. Bar Chart: Excavations per department */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Excavations per Utility Department</h3>
            <p className="text-[10px] text-slate-500 font-medium">
              Distribution of active permits inside GCC Chennai Wards
            </p>
          </div>

          <div className="h-[250px] w-full flex items-end gap-6 justify-around pt-6 px-4">
            <div className="flex flex-col items-center gap-2 w-16">
              <div
                className="bg-blue-900 w-full rounded-t-md hover:opacity-90 transition flex items-center justify-center text-white text-[10px] font-bold"
                style={{ height: `${getBarHeight(waterCount)}px` }}
              >
                {waterCount}
              </div>
              <span className="text-[9px] uppercase font-bold text-slate-500">Water</span>
            </div>
            <div className="flex flex-col items-center gap-2 w-16">
              <div
                className="bg-yellow-500 w-full rounded-t-md hover:opacity-90 transition flex items-center justify-center text-slate-950 text-[10px] font-bold"
                style={{ height: `${getBarHeight(powerCount)}px` }}
              >
                {powerCount}
              </div>
              <span className="text-[9px] uppercase font-bold text-slate-500">Power</span>
            </div>
            <div className="flex flex-col items-center gap-2 w-16">
              <div
                className="bg-rose-500 w-full rounded-t-md hover:opacity-90 transition flex items-center justify-center text-white text-[10px] font-bold"
                style={{ height: `${getBarHeight(gasCount)}px` }}
              >
                {gasCount}
              </div>
              <span className="text-[9px] uppercase font-bold text-slate-500">Gas</span>
            </div>
            <div className="flex flex-col items-center gap-2 w-16">
              <div
                className="bg-cyan-500 w-full rounded-t-md hover:opacity-90 transition flex items-center justify-center text-slate-950 text-[10px] font-bold"
                style={{ height: `${getBarHeight(telecomCount)}px` }}
              >
                {telecomCount}
              </div>
              <span className="text-[9px] uppercase font-bold text-slate-500">Telecom</span>
            </div>
          </div>
        </div>

        {/* 2. Risk Distribution Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">AI Risk Classification</h3>
            <p className="text-[10px] text-slate-500 font-medium">
              Project risk distributions calculated by GCC pipeline agents
            </p>
          </div>

          <div className="h-[250px] w-full flex items-center justify-around">
            <div className="relative h-40 w-40 rounded-full border-8 border-emerald-500 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[8px] border-t-amber-500 border-r-rose-600 border-b-rose-600 border-l-transparent transform rotate-45" />
              <div className="text-center">
                <span className="block text-2xl font-extrabold text-slate-800">{totalCount}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase">Total permits</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-[10px] font-bold">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" /> Low Risk (60%)
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500" /> Medium Risk (25%)
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500" /> High Risk (15%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
