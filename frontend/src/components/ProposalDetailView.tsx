"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, MapPin, Calendar, Layers, ShieldCheck, AlertTriangle, RefreshCw, Check, X, FileEdit, Trash2, Download, Cpu, Sparkles, FileText, Send, User, Info, MessageSquare } from "lucide-react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

const MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });

const BACKEND_URL = "http://localhost:8000";

interface ProposalDetailViewProps {
  id: string;
  currentRole: "admin" | "planner";
}

export default function ProposalDetailView({ id, currentRole }: ProposalDetailViewProps) {
  const router = useRouter();

  const getAuthHeader = () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("supabase_token");
      if (token) return `Bearer ${token}`;
    }
    return "Bearer mock-token-superadmin";
  };

  const [proposal, setProposal] = useState<any | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [similar, setSimilar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverOnline, setServerOnline] = useState(false);
  const [activeTab, setActiveTab] = useState<any>(currentRole === "admin" ? "dashboard" : "submissions");

  // Admin decision states
  const [remarks, setRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [triggeringAI, setTriggeringAI] = useState(false);

  // Tab state on the details card
  const [detailTab, setDetailTab] = useState<"spec" | "ai" | "decision" | "chat">("spec");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // AI Plan Chat states
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ q: string; a: string; sources?: any[] }>>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const [geomRoadName, setGeomRoadName] = useState<string | null>(null);
  const [roadMismatch, setRoadMismatch] = useState(false);

  useEffect(() => {
    if (!proposal || !proposal.geom) return;
    
    let lat = 0;
    let lon = 0;
    const geom = proposal.geom;
    
    try {
      if (geom.type === "Point") {
        lon = geom.coordinates[0];
        lat = geom.coordinates[1];
      } else if (geom.type === "LineString") {
        const coords = geom.coordinates;
        const sum = coords.reduce((acc: any, c: any) => [acc[0] + c[0], acc[1] + c[1]], [0, 0]);
        lon = sum[0] / coords.length;
        lat = sum[1] / coords.length;
      } else if (geom.type === "Polygon") {
        const coords = geom.coordinates[0];
        const sum = coords.reduce((acc: any, c: any) => [acc[0] + c[0], acc[1] + c[1]], [0, 0]);
        lon = sum[0] / coords.length;
        lat = sum[1] / coords.length;
      }
      
      if (lat && lon) {
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`, {
          headers: {
            "User-Agent": "Road-Excavation-Planner-GCC/1.0"
          }
        })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.address) {
            const road = data.address.road || data.address.suburb || data.address.neighbourhood || data.address.county || "";
            setGeomRoadName(road);
            
            // Extract core tokens for comparison, ignoring suffixes
            const chosen = proposal.road_name.toLowerCase().replace(/road|salai|street|high|ave|avenue|ln|lane/g, "").replace(/\s+/g, "").trim();
            const physical = road.toLowerCase().replace(/road|salai|street|high|ave|avenue|ln|lane/g, "").replace(/\s+/g, "").trim();
            
            if (chosen && physical && !chosen.includes(physical) && !physical.includes(chosen)) {
              setRoadMismatch(true);
            }
          }
        })
        .catch((err) => console.error("Error reverse geocoding centroid:", err));
      }
    } catch (e) {
      console.error("Geocoding calculation error", e);
    }
  }, [proposal]);

  // Planner department profile loaded from localStorage session
  const [plannerDept, setPlannerDept] = useState<"water" | "electricity" | "gas" | "telecom">(() => {
    if (typeof window !== "undefined") {
      const cachedDept = localStorage.getItem("supabase_dept");
      if (cachedDept && ["water", "electricity", "gas", "telecom"].includes(cachedDept)) {
        return cachedDept as any;
      }
    }
    return "water";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cachedDept = localStorage.getItem("supabase_dept");
      if (cachedDept && ["water", "electricity", "gas", "telecom"].includes(cachedDept)) {
        setPlannerDept(cachedDept as any);
      }
    }
  }, []);

  // Sync server check & fetch
  useEffect(() => {
    const checkAndFetch = async () => {
      let isOnline = false;
      try {
        const checkRes = await fetch(`${BACKEND_URL}/`);
        if (checkRes.ok) {
          isOnline = true;
          setServerOnline(true);
        }
      } catch (e) {
        setServerOnline(false);
      }

      // Fetch proposal details
      let activeProposal = null;
      if (isOnline) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/proposals`, {
            headers: { Authorization: getAuthHeader() },
          });
          if (res.ok) {
            const data = await res.json();
            const found = data.find((p: any) => p.id === id || String(p.id) === id);
            if (found) activeProposal = found;
          }
        } catch (e) {
          console.error("Error fetching proposal from server", e);
        }
      }

      if (activeProposal) {
        setProposal(activeProposal);

        // Fetch AI analysis
        let fetchedAnalysis = null;
        let fetchedSimilar = null;

        if (isOnline) {
          try {
            const analysisRes = await fetch(`${BACKEND_URL}/api/proposals/${id}/ai-analysis`, {
              headers: { Authorization: getAuthHeader() },
            });
            if (analysisRes.ok) {
              fetchedAnalysis = await analysisRes.json();
            }

            const similarRes = await fetch(`${BACKEND_URL}/api/proposals/${id}/similar-projects`, {
              headers: { Authorization: getAuthHeader() },
            });
            if (similarRes.ok) {
              fetchedSimilar = await similarRes.json();
            }
          } catch (e) {
            console.error("AI Analysis fetch error", e);
          }
        }

        setAnalysis(fetchedAnalysis);
        setSimilar(fetchedSimilar || []);
        
        // Auto switch tab to AI if analysis exists
        if (fetchedAnalysis) {
          setDetailTab("ai");
        }
      }

      setLoading(false);
    };

    checkAndFetch();
  }, [id]);

  // Manual trigger for the 10-Agent AI pipeline
  const handleTriggerAI = async () => {
    setTriggeringAI(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/proposals/${id}/ai-analysis`, {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(),
        },
      });

      if (res.ok) {
        const newAnalysis = await res.json();
        setAnalysis(newAnalysis);

        // Refetch similar projects
        const similarRes = await fetch(`${BACKEND_URL}/api/proposals/${id}/similar-projects`, {
          headers: { Authorization: getAuthHeader() },
        });
        if (similarRes.ok) {
          const similarData = await similarRes.json();
          setSimilar(similarData);
        }
        setErrorBanner(null);
        setDetailTab("ai");
      } else {
        const err = await res.json();
        setErrorBanner(`Failed to execute AI scan: ${err.detail || "Server error"}`);
      }
    } catch (e) {
      setErrorBanner("Server communication error.");
    } finally {
      setTriggeringAI(false);
    }
  };

  // Admin approval/rejection handler
  const handleAdminDecision = async (statusVal: "approved" | "rejected" | "revision") => {
    if (!proposal) return;
    setActionLoading(true);
    let success = false;

    if (serverOnline) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/proposals/${proposal.id}/decision`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: getAuthHeader(),
          },
          body: JSON.stringify({ status: statusVal, remarks }),
        });

        if (res.ok) {
          success = true;
        } else {
          const err = await res.json();
          setErrorBanner(`Failed to update proposal: ${err.detail || "Unknown error"}`);
        }
      } catch (e) {
        setErrorBanner("Server communication error.");
      }
    } else {
      success = true;
    }

    if (success) {
      router.push(`/${currentRole}?msg=status_updated_to_${statusVal}`);
    }
    setActionLoading(false);
  };

  const handleDownloadPDF = () => {
    if (!proposal) return;
    const token = localStorage.getItem("supabase_token") || "";
    window.open(`${BACKEND_URL}/api/proposals/${proposal.id}/download-report?token=${token}`, "_blank");
  };

  const handleDeleteProposal = async () => {
    if (!proposal) return;
    if (!window.confirm("Are you sure you want to permanently delete this rejected proposal?")) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/proposals/${proposal.id}`, {
        method: "DELETE",
        headers: {
          Authorization: getAuthHeader(),
        },
      });
      if (res.ok) {
        router.push(`/${currentRole}?msg=deleted`);
      } else {
        const err = await res.json();
        setErrorBanner(`Failed to delete proposal: ${err.detail || "Server error"}`);
      }
    } catch (e) {
      setErrorBanner("Server communication error.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/${currentRole}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 justify-center items-center">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-900" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading permit clearances...</span>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 justify-center items-center">
        <div className="text-center space-y-4 max-w-sm p-6 bg-white border rounded-2xl shadow-md">
          <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Clearance Request Not Found</h2>
          <p className="text-xs text-slate-500 font-medium">The requested excavation proposal ID does not exist or has been removed.</p>
          <button
            onClick={handleBack}
            className="w-full py-2 bg-blue-900 text-white rounded-lg text-xs font-bold uppercase hover:bg-blue-800 transition cursor-pointer shadow-md"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;
    const question = chatQuestion.trim();
    setChatQuestion("");
    setChatLoading(true);
    
    setChatHistory((prev) => [...prev, { q: question, a: "..." }]);
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/proposals/${id}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({ question }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatHistory((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = { q: question, a: data.answer, sources: data.sources };
          }
          return updated;
        });
      } else {
        setChatHistory((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = { q: question, a: "Error querying RAG plan chat. Please verify local settings." };
          }
          return updated;
        });
      }
    } catch (err) {
      setChatHistory((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = { q: question, a: "Server connection failed." };
        }
        return updated;
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleAskSuggestion = (suggestion: string) => {
    setChatQuestion(suggestion);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 animate-fade-in">
      <Header
        currentRole={currentRole}
        setCurrentRole={(role) => router.push(`/${role}`)}
        serverOnline={serverOnline}
        setActiveTab={() => {}}
        showRoleSwitcher={false}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            router.push(`/${currentRole}`);
          }}
          currentRole={currentRole}
          plannerDept={plannerDept}
          setPlannerDept={() => {}}
        />

        <main className="flex-1 p-6 overflow-y-auto space-y-5">
          {/* Custom page error banner bypassing blocking alerts */}
          {errorBanner && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-fade-in font-sans">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-600 flex-shrink-0" />
                <span>{errorBanner}</span>
              </div>
              <button
                onClick={() => setErrorBanner(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
          {/* Top focused bar */}
          <div className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 bg-white hover:bg-slate-100 border rounded-xl transition text-slate-600 flex items-center justify-center cursor-pointer shadow-xs"
                title="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <span className="text-[9px] uppercase font-bold text-blue-900 tracking-wider block font-semibold">
                  Excavation Case Details
                </span>
                <h1 className="text-sm font-bold text-slate-800 flex items-center gap-2 mt-0.5">
                  {proposal.road_name}{" "}
                  <span
                    className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                      proposal.department === "water"
                        ? "bg-blue-100 text-blue-800"
                        : proposal.department === "electricity"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {proposal.department}
                  </span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">Status:</span>
              <span
                className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs ${
                  proposal.status === "approved"
                    ? "bg-emerald-100 text-emerald-800"
                    : proposal.status === "pending"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {proposal.status}
              </span>
            </div>
          </div>

          {/* Custom road name alignment warning */}
          {roadMismatch && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-xs font-semibold space-y-1.5 animate-fade-in font-sans shadow-xs">
              <div className="flex items-center gap-2 font-bold text-amber-800 text-[10px] uppercase tracking-wider">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span>Warning: Road Alignment Mismatch</span>
              </div>
              <p className="leading-relaxed font-medium">
                <strong>Data Mismatch:</strong> While the PostGIS spatial engine works perfectly by evaluating the coordinates, it creates an operational mismatch between the text metadata and the physical shape. Planners are recommended to align their plotted shapes with the road names chosen.
              </p>
              {geomRoadName && (
                <p className="text-[10px] text-amber-700 font-bold mt-0.5">
                  Chosen Road Name: <span className="underline">{proposal.road_name}</span> | Physically Drawn Location: <span className="underline">{geomRoadName}</span>
                </p>
              )}
            </div>
          )}

          {/* Unified Height-Aligned Grid Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Hand: GIS Segment Map (60% width) */}
            <div className="xl:col-span-7 bg-white rounded-2xl border shadow-sm p-4 h-[530px] flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-800 mb-2.5 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                <MapPin className="h-4 w-4 text-blue-900" /> GIS Coordinates Shape Trace
              </h3>
              <div className="flex-1 w-full rounded-xl overflow-hidden border">
                <MapComponent
                  isEditable={false}
                  proposals={[proposal]}
                  selectedProposalId={proposal.id}
                />
              </div>
            </div>

            {/* Right Hand: Interactive Tabbed Panel (40% width) */}
            <div className="xl:col-span-5 bg-white rounded-2xl border shadow-sm h-[530px] flex flex-col overflow-hidden">
              {/* Tab Navigation Headers */}
              <div className="flex border-b bg-slate-50/50 text-xs font-bold uppercase tracking-wider flex-shrink-0">
                <button
                  onClick={() => setDetailTab("spec")}
                  className={`flex-1 py-3 text-center border-r hover:bg-slate-100/50 transition cursor-pointer ${
                    detailTab === "spec" ? "bg-white text-blue-900 border-b-2 border-b-blue-900" : "text-slate-400"
                  }`}
                >
                  Specs
                </button>
                {currentRole === "admin" && (
                  <button
                    onClick={() => setDetailTab("ai")}
                    className={`flex-1 py-3 text-center border-r hover:bg-slate-100/50 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      detailTab === "ai" ? "bg-white text-blue-900 border-b-2 border-b-blue-900" : "text-slate-400"
                    }`}
                  >
                    <Cpu className="h-3.5 w-3.5" /> AI Review
                    {analysis && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />}
                  </button>
                )}
                <button
                  onClick={() => setDetailTab("decision")}
                  className={`flex-1 py-3 text-center border-r hover:bg-slate-100/50 transition cursor-pointer ${
                    detailTab === "decision" ? "bg-white text-blue-900 border-b-2 border-b-blue-900" : "text-slate-400"
                  }`}
                >
                  Decision
                </button>
                {currentRole === "planner" && (
                  <button
                    onClick={() => setDetailTab("chat")}
                    className={`flex-1 py-3 text-center hover:bg-slate-100/50 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      detailTab === "chat" ? "bg-white text-blue-900 border-b-2 border-b-blue-900" : "text-slate-400"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Plan Chat
                  </button>
                )}
              </div>

              {/* Scrollable Tab Content Container */}
              <div className="flex-1 p-5 overflow-y-auto text-xs">
                {/* TAB 1: TECHNICAL SPECIFICATIONS */}
                {detailTab === "spec" && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                      <div className="col-span-2">
                        <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Project Purpose</span>
                        <span className="font-semibold text-slate-700 block text-xs">{proposal.purpose}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Contractor Company</span>
                        <span className="font-bold text-slate-700 block truncate">{proposal.contractor || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Excavation Method</span>
                        <span className="font-bold text-slate-700 block uppercase">{proposal.excavation_method}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Utility Class</span>
                        <span className="font-bold text-slate-700 block uppercase">{proposal.utility_type}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Traffic Diversion</span>
                        <span className="font-bold text-slate-700 block uppercase">{proposal.expected_traffic_diversion}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Trench Dimensions</span>
                        <span className="font-bold text-slate-700 block">
                          {proposal.length_m}m length × {proposal.width_m}m width ({proposal.area_sqm} sq.m area)
                        </span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Estimated Budget</span>
                        <span className="font-bold text-emerald-800 text-xs block">Rs. {Number(proposal.estimated_budget).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Timeline</span>
                        <span className="font-bold text-slate-700 block">{proposal.start_date} to {proposal.end_date}</span>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Scope Description</span>
                      <p className="p-3 bg-slate-50 border rounded-xl text-slate-600 leading-relaxed font-medium">
                        {proposal.description}
                      </p>
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" /> Primary Contact Details
                      </h4>
                      <div className="grid grid-cols-2 gap-y-2 text-[11px] font-semibold text-slate-600 bg-slate-50/50 p-3 border rounded-xl">
                        <div>Engineer: <span className="font-bold text-slate-800">{proposal.contact_name}</span></div>
                        <div>Mobile: <span className="font-bold text-slate-800">{proposal.contact_mobile}</span></div>
                        <div className="col-span-2 mt-0.5">Email: <span className="font-bold text-slate-800 text-xs truncate block">{proposal.contact_email}</span></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: AI CO-PILOT REVIEW */}
                {detailTab === "ai" && (
                  <div className="space-y-4 animate-fade-in">
                    {triggeringAI ? (
                      <div className="py-20 text-center flex flex-col items-center gap-4">
                        <RefreshCw className="h-7 w-7 animate-spin text-blue-900" />
                        <div className="space-y-1">
                          <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Running AI Evaluation Scan</span>
                          <span className="block text-[10px] text-slate-400 font-medium">Consulting RAG collections, PostGIS nodes, and weather API...</span>
                        </div>
                      </div>
                    ) : analysis ? (
                      <>
                        {/* Recommendation Banner */}
                        <div
                          className={`p-3.5 rounded-xl border flex items-center gap-3.5 shadow-xs ${
                            analysis.recommendation === "approve"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                              : analysis.recommendation === "approve_conditions"
                              ? "bg-blue-50 border-blue-200 text-blue-800"
                              : "bg-red-50 border-red-200 text-red-800"
                          }`}
                        >
                          {analysis.recommendation === "approve" && <Check className="h-5 w-5 bg-emerald-500 text-white rounded-full p-0.5" />}
                          {analysis.recommendation === "approve_conditions" && <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />}
                          {analysis.recommendation === "reject" && <X className="h-5 w-5 bg-red-500 text-white rounded-full p-0.5" />}
                          {analysis.recommendation === "manual_review" && <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />}

                          <div>
                            <span className="block text-[9px] uppercase font-extrabold tracking-wider opacity-85">AI Recommendation</span>
                            <span className="text-xs font-bold">
                              {analysis.recommendation === "approve"
                                ? "APPROVE MUNICIPAL PERMIT"
                                : analysis.recommendation === "approve_conditions"
                                ? "APPROVE WITH CLEARANCE CONDITIONS"
                                : analysis.recommendation === "reject"
                                ? "REJECT REQUEST IMMEDIATELY"
                                : "NEEDS MANUAL INTERVENTION"}
                            </span>
                          </div>
                        </div>

                        {/* Explainable AI report */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Explainable AI Report</span>
                          <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl leading-relaxed whitespace-pre-line border font-medium">
                            {analysis.explanation}
                          </div>
                        </div>



                        {/* Policy violations */}
                        {analysis.compliance_report?.violations?.length > 0 && (
                          <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-red-800 flex flex-col gap-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 text-red-900 mb-0.5">
                              <AlertTriangle className="h-3.5 w-3.5" /> Policy Violations Detected (RAG)
                            </span>
                            {analysis.compliance_report.violations.map((v: string, idx: number) => (
                              <span key={idx} className="text-[10px] leading-normal font-semibold">
                                • {v}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Department coordination suggestion */}
                        {analysis.coordination_opportunities?.coordination_possible && (
                          <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-blue-800 flex flex-col gap-1.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 text-blue-900 mb-0.5">
                              <Layers className="h-3.5 w-3.5" /> Joint Department Coordination Suggestion
                            </span>
                            {analysis.coordination_opportunities.suggestions.map((s: any, idx: number) => (
                              <div key={idx} className="text-[10px] leading-normal font-semibold space-y-1 border-b pb-1.5 last:border-0 last:pb-0">
                                <div>Combine excavation with <strong className="uppercase text-blue-900">{s.department}</strong> on {s.road_name}.</div>
                                <div className="text-emerald-600 font-bold">
                                  Restoration Savings: {s.estimated_savings_percentage}% cost reduction
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Overlapping Active Excavation Projects (Spatial Collision Alerts) */}
                        {analysis.duplicate_conflicts?.conflict_detected && analysis.duplicate_conflicts?.conflicts?.length > 0 ? (
                          <div className="border border-rose-200 bg-rose-50/20 p-3.5 rounded-xl space-y-2.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-600 animate-pulse" /> Overlapping Active Excavations (Spatial Collision)
                            </span>
                            <div className="space-y-2">
                              {analysis.duplicate_conflicts.conflicts.map((p: any, idx: number) => (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-rose-100 text-[10px] space-y-1.5 shadow-2xs">
                                  <div className="flex justify-between items-center font-bold">
                                    <span className="text-slate-800 uppercase tracking-wide">
                                      {p.department === "water" ? "CMWSSB (Water)" : p.department === "electricity" ? "TNEB (Electricity)" : p.department === "gas" ? "Gas Agency" : "Telecom Dept"}
                                    </span>
                                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                      p.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                    }`}>
                                      {p.status}
                                    </span>
                                  </div>
                                  <div className="text-slate-500 font-semibold leading-relaxed">
                                    <p><strong>Road Segment:</strong> {p.road_name}</p>
                                    <p><strong>Timeline:</strong> {p.start_date} to {p.end_date}</p>
                                  </div>
                                  <div className="pt-1.5 border-t border-slate-100 flex justify-end">
                                    <button
                                      onClick={() => router.push(`/${currentRole}/proposals/${p.proposal_id}`)}
                                      className="text-blue-900 hover:text-blue-800 font-extrabold uppercase text-[8px] tracking-wider cursor-pointer hover:underline"
                                    >
                                      View Conflict Details →
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="border border-emerald-150 bg-emerald-50/20 p-3.5 rounded-xl space-y-1 text-emerald-800 flex flex-col">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Spatial Collision Clearance
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-600 leading-normal">
                              No overlapping active excavation coordinates or conflict alerts detected on same road segment.
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="py-12 px-4 text-center space-y-4">
                        <div className="inline-flex p-3.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-full animate-bounce">
                          <Cpu className="h-6 w-6" />
                        </div>
                        <div className="space-y-1 max-w-xs mx-auto">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">No AI Analysis Generated</h4>
                          <p className="text-[10px] text-slate-400 font-medium">
                            An evaluation scan has not been generated for this excavation request yet.
                          </p>
                        </div>
                        <button
                          onClick={handleTriggerAI}
                          className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 mx-auto shadow-md"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Run AI Diagnostics Scan
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: CLEARANCE DECISION */}
                {detailTab === "decision" && (
                  <div className="space-y-4 animate-fade-in">
                    {/* IF CURRENT USER IS ADMIN: Render Decision Inputs */}
                    {currentRole === "admin" && (proposal.status === "pending" || proposal.status === "revision") ? (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Decision Remarks & Clearance Conditions
                          </label>
                          <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Add specific conditions (e.g. night shift construction, trench backfill compaction SOPs) or rejection reason..."
                            rows={6}
                            className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-900 focus:bg-white transition leading-relaxed font-medium text-slate-700"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          <button
                            onClick={() => handleAdminDecision("approved")}
                            disabled={actionLoading}
                            className="py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-sm active:scale-[0.98]"
                          >
                            {actionLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Approve"}
                          </button>
                          <button
                            onClick={() => handleAdminDecision("revision")}
                            disabled={actionLoading}
                            className="py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-sm active:scale-[0.98]"
                          >
                            {actionLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Revision"}
                          </button>
                          <button
                            onClick={() => handleAdminDecision("rejected")}
                            disabled={actionLoading}
                            className="py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-sm active:scale-[0.98]"
                          >
                            {actionLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Reject"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // FOR PLANNER OR RESOLVED PROPOSALS: Render read-only status and remarks summary
                      <div className="space-y-4 py-2">
                        {/* 1. Admin Decision Status Card */}
                        <div className="p-4 bg-slate-50 border rounded-xl space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Administrative Status:</span>
                            <span
                              className={`font-extrabold uppercase px-2.5 py-0.5 rounded-full text-[9px] tracking-wide ${
                                proposal.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : proposal.status === "revision"
                                  ? "bg-purple-100 text-purple-800"
                                  : proposal.status === "pending"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {proposal.status}
                            </span>
                          </div>
                          
                          {/* Admin Remarks / Changes requested */}
                          {proposal.remarks ? (
                            <div className="pt-3 border-t text-xs text-slate-600 font-semibold leading-relaxed">
                              {proposal.status === "revision" ? (
                                <span className="block text-purple-700 font-bold text-[9px] uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <FileEdit className="h-3.5 w-3.5" /> Revisions Requested by Admin:
                                </span>
                              ) : (
                                <span className="block text-slate-400 font-bold text-[9px] uppercase tracking-wider mb-1">
                                  Decision Remarks / Conditions:
                                </span>
                              )}
                              <p className="mt-1 bg-white p-3 border border-slate-100 rounded-lg italic text-[11px] font-medium text-slate-600 shadow-2xs leading-relaxed">
                                "{proposal.remarks}"
                              </p>
                            </div>
                          ) : (
                            proposal.status === "revision" && (
                              <div className="pt-3 border-t text-xs text-slate-500 font-medium">
                                Revisions requested. Contact Zonal Coordinator for details.
                              </div>
                            )
                          )}
                        </div>

                        {/* 2. AI Recommendation Summary (For Planner review) */}
                        {analysis && (
                          <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">AI Co-Pilot Suggestion:</span>
                              <span
                                className={`font-extrabold uppercase px-2 py-0.5 rounded text-[8px] tracking-wide ${
                                  analysis.recommendation === "approve"
                                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                                    : "bg-amber-50 border border-amber-200 text-amber-700"
                                }`}
                              >
                                {analysis.recommendation === "approve" ? "Approve" : "Manual Review"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                              <strong>AI Confidence:</strong> {analysis.confidence_score}% with {analysis.compliance_report?.violations?.length || 0} compliance warnings detected.
                            </p>
                          </div>
                        )}

                        {/* 3. Action Buttons (e.g. Download permit if approved) */}
                        {proposal.status === "approved" && (
                          <button
                            onClick={handleDownloadPDF}
                            className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                          >
                            <Download className="h-4 w-4" /> Download Approved Permit (PDF)
                          </button>
                        )}

                        {proposal.status === "revision" && currentRole === "planner" && (
                          <button
                            onClick={() => router.push(`/planner?edit=${proposal.id}`)}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-[0.98]"
                          >
                            <FileEdit className="h-4 w-4" /> Edit & Resubmit Request
                          </button>
                        )}

                        {proposal.status === "rejected" && currentRole === "planner" && (
                          <button
                            onClick={handleDeleteProposal}
                            disabled={actionLoading}
                            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-[0.98]"
                          >
                            {actionLoading ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Delete Rejected Request
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: PLAN CHAT ASSISTANT */}
                {detailTab === "chat" && currentRole === "planner" && (
                  <div className="flex flex-col h-full animate-fade-in font-sans pt-1">
                    {/* Chat Messages Log */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[310px] min-h-[220px]">
                      {chatHistory.length === 0 ? (
                        <div className="py-6 text-center space-y-3">
                          <Cpu className="h-7 w-7 text-blue-900/60 mx-auto animate-pulse" />
                          <div className="max-w-[200px] mx-auto space-y-1">
                            <h4 className="font-bold text-slate-700 text-xs">Plan Compliance Assistant</h4>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Ask questions regarding this specific excavation plan, monsoon bans, or why the admin rejected/requested revisions.
                            </p>
                          </div>
                          {/* Suggestion tags */}
                          <div className="pt-2 flex flex-col gap-1.5 max-w-[220px] mx-auto">
                            <button
                              onClick={() => handleAskSuggestion("Why was this plan rejected or returned for revision?")}
                              className="text-left text-[9px] font-bold text-blue-900 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 p-2 rounded-lg cursor-pointer"
                            >
                              "Why was this plan rejected or returned?"
                            </button>
                            <button
                              onClick={() => handleAskSuggestion("What are the monsoon bans and restrictions that apply to this street?")}
                              className="text-left text-[9px] font-bold text-blue-900 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 p-2 rounded-lg cursor-pointer"
                            >
                              "What are the monsoon bans for this street?"
                            </button>
                          </div>
                        </div>
                      ) : (
                        chatHistory.map((item, idx) => (
                          <div key={idx} className="space-y-2">
                            {/* Question */}
                            <div className="flex justify-end">
                              <div className="bg-blue-900 text-white text-[10px] font-bold py-2 px-3 rounded-2xl rounded-tr-none max-w-[85%] shadow-xs">
                                {item.q}
                              </div>
                            </div>
                            {/* Answer */}
                            <div className="flex justify-start">
                              <div className="bg-slate-100 text-slate-800 text-[10px] font-medium py-2 px-3 rounded-2xl rounded-tl-none max-w-[85%] leading-relaxed shadow-3xs whitespace-pre-line border">
                                {item.a}
                                {item.sources && item.sources.length > 0 && (
                                  <div className="mt-2 pt-1.5 border-t border-slate-200/50 flex flex-wrap gap-1">
                                    <span className="text-[8px] font-extrabold uppercase text-slate-400 block w-full">Citations:</span>
                                    {item.sources.map((src: any, sIdx: number) => (
                                      <span key={sIdx} className="bg-white px-1.5 py-0.5 border text-[8px] font-bold text-slate-500 rounded">
                                        {src.document_name} (Pg {src.page})
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      {chatLoading && (
                        <div className="flex justify-start items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Evaluating RAG context...
                        </div>
                      )}
                    </div>

                    {/* Chat Input Field */}
                    <form onSubmit={handleSendChat} className="flex gap-2 border-t border-slate-150 pt-2.5 mt-2.5 flex-shrink-0">
                      <input
                        type="text"
                        value={chatQuestion}
                        onChange={(e) => setChatQuestion(e.target.value)}
                        placeholder="Ask about plan compliance..."
                        disabled={chatLoading}
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none bg-slate-50/50"
                      />
                      <button
                        type="submit"
                        disabled={chatLoading || !chatQuestion.trim()}
                        className="p-2 bg-blue-900 text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 transition cursor-pointer flex items-center justify-center"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
