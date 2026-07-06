import React from "react";
import { Cpu, RefreshCw, CheckCircle2, Info, XCircle, AlertTriangle, Layers, Download } from "lucide-react";

interface AIReviewConsoleProps {
  selectedProposal: any;
  activeAnalysis: any;
  loading: boolean;
  similarProjects: any[];
  currentRole: "admin" | "planner";
}

export const AIReviewConsole: React.FC<AIReviewConsoleProps> = ({
  selectedProposal,
  activeAnalysis,
  loading,
  similarProjects,
  currentRole,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between flex-shrink-0">
        <div>
          <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider flex items-center gap-1">
            <Cpu className="h-3.5 w-3.5 animate-pulse" /> GCC AI Co-Pilot Recommendation
          </span>
          <h4 className="text-xs font-bold truncate max-w-[280px]">{selectedProposal.road_name}</h4>
        </div>

        {activeAnalysis && (
          <div className="text-right">
            <span className="block text-[9px] uppercase text-slate-400">Confidence</span>
            <span className="text-sm font-bold text-emerald-400">{activeAnalysis.confidence_score}%</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-xs font-medium text-slate-500">Orchestrating 10 AI Agents...</span>
        </div>
      ) : activeAnalysis ? (
        <>
          {/* Scrollable Content Area */}
          <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto flex-1">
            {/* Recommendation Banner */}
            <div
              className={`p-3 rounded-lg border flex items-center gap-3 ${
                activeAnalysis.recommendation === "approve"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : activeAnalysis.recommendation === "approve_conditions"
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {activeAnalysis.recommendation === "approve" && <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />}
              {activeAnalysis.recommendation === "approve_conditions" && <Info className="h-6 w-6 text-blue-600 flex-shrink-0" />}
              {activeAnalysis.recommendation === "reject" && <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />}
              {activeAnalysis.recommendation === "manual_review" && <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />}

              <div>
                <span className="block text-[10px] uppercase font-bold tracking-wider">AI RECOMMENDATION</span>
                <span className="text-xs font-bold text-slate-800">
                  {activeAnalysis.recommendation === "approve"
                    ? "APPROVE PERMIT"
                    : activeAnalysis.recommendation === "approve_conditions"
                    ? "APPROVE WITH CONDITIONS"
                    : activeAnalysis.recommendation === "reject"
                    ? "REJECT REQUEST"
                    : "NEEDS MANUAL REVIEW"}
                </span>
              </div>
            </div>

            {/* Explainable AI report */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Explainable AI Report</span>
              <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg leading-relaxed whitespace-pre-line border">
                {activeAnalysis.explanation}
              </div>
            </div>

            {/* AI Metrics gauges */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 p-2.5 rounded border text-center">
                <span className="block text-[8px] uppercase font-bold text-slate-500">Public Inconvenience</span>
                <span className="text-sm font-bold text-slate-800">{activeAnalysis.public_impact_score}/100</span>
                <span className="block text-[8px] text-slate-400 mt-0.5">Disruption Score</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border text-center">
                <span className="block text-[8px] uppercase font-bold text-slate-500">Weather Risk</span>
                <span
                  className={`text-sm font-bold ${
                    activeAnalysis.weather_analysis?.risk_level === "high" ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {activeAnalysis.weather_analysis?.risk_level.toUpperCase()}
                </span>
                <span className="block text-[8px] text-slate-400 mt-0.5">Precipitation index</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border text-center">
                <span className="block text-[8px] uppercase font-bold text-slate-500">Traffic Congestion</span>
                <span
                  className={`text-sm font-bold ${
                    activeAnalysis.traffic_analysis?.disruption_level === "high" ? "text-rose-600" : "text-slate-800"
                  }`}
                >
                  {activeAnalysis.traffic_analysis?.congestion_coefficient_pct}%
                </span>
                <span className="block text-[8px] text-slate-400 mt-0.5">Diversion effect</span>
              </div>
            </div>

            {/* Policy violations */}
            {activeAnalysis.compliance_report?.violations?.length > 0 && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-800 flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-red-900">
                  <AlertTriangle className="h-3.5 w-3.5" /> Policy Violations Detected (RAG)
                </span>
                {activeAnalysis.compliance_report.violations.map((v: string, idx: number) => (
                  <span key={idx} className="text-[10px] leading-normal">
                    {v}
                  </span>
                ))}
              </div>
            )}

            {/* Department coordination suggestion */}
            {activeAnalysis.coordination_opportunities?.coordination_possible && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-blue-800 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-blue-900">
                  <Layers className="h-3.5 w-3.5" /> Joint Department Coordination Suggestion
                </span>
                {activeAnalysis.coordination_opportunities.suggestions.map((s: any, idx: number) => (
                  <div key={idx} className="text-[10px] leading-normal">
                    Combine excavation with <strong className="uppercase">{s.department}</strong> on {s.road_name}.
                    <span className="block mt-0.5 text-emerald-600 font-bold">
                      Estimated Restoration Cost Savings: {s.estimated_savings_percentage}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Similar Projects Lessons Learned */}
            {similarProjects.length > 0 && (
              <div className="border border-slate-200 p-3 rounded-lg space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Similar Past Projects (Vector Similarity search)
                </span>
                {similarProjects.map((p, idx) => (
                  <div key={idx} className="bg-slate-50 p-2 rounded text-[10px] border border-slate-100 space-y-1">
                    <div className="flex justify-between font-semibold text-slate-700">
                      <span>
                        {p.road_name} ({p.purpose})
                      </span>
                      <span className="text-blue-700">Match: {p.similarity_score}%</span>
                    </div>
                    <p className="text-slate-600 leading-normal">
                      <strong>Lessons learned:</strong> {p.lessons_learned}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Download permit PDF button */}
            {selectedProposal.status === "approved" && (
              <button
                onClick={() => alert("Permit PDF downloaded with digital signature verification.")}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Download className="h-4 w-4" /> Download Approved Permit (PDF)
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-xs text-slate-500">
          Select a proposal in the list to review AI coordination logs.
        </div>
      )}
    </div>
  );
};
