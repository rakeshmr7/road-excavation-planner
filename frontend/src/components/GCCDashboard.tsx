"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { MapPin, RefreshCw, Check, AlertTriangle, Info } from "lucide-react";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ProposalForm } from "./ProposalForm";
import { ProposalList } from "./ProposalList";
import { AIReviewConsole } from "./AIReviewConsole";
import { PoliciesTab } from "./PoliciesTab";
import { AuditLogsTab } from "./AuditLogsTab";
import { AnalyticsTab } from "./AnalyticsTab";
import { UsersTab } from "./UsersTab";

// Dynamically import MapComponent to prevent SSR window reference crashes
const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-slate-100 rounded-lg border border-dashed border-slate-300">
      <div className="flex flex-col items-center gap-2">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
        <span className="text-sm font-medium text-slate-500 font-sans">Loading GCC GIS Layers...</span>
      </div>
    </div>
  ),
});

const BACKEND_URL = "http://localhost:8000";

interface GCCDashboardProps {
  forcedRole?: "admin" | "planner";
  showRoleSwitcher?: boolean;
}

export function GCCDashboard({ forcedRole, showRoleSwitcher = true }: GCCDashboardProps) {
  const router = useRouter();

  const getAuthHeader = () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("supabase_token");
      if (token) return `Bearer ${token}`;
    }
    return "Bearer mock-token-superadmin";
  };

  // Roles toggle: 'admin' or 'planner'
  // Roles toggle: 'admin' or 'planner'
  const [currentRole, setCurrentRole] = useState<"admin" | "planner">(forcedRole || "planner");
  
  // Load department profile synchronously from localStorage on client render
  const [plannerDept, setPlannerDept] = useState<"water" | "electricity" | "gas" | "telecom">(() => {
    if (typeof window !== "undefined") {
      const cachedDept = localStorage.getItem("supabase_dept");
      if (cachedDept && ["water", "electricity", "gas", "telecom"].includes(cachedDept)) {
        return cachedDept as any;
      }
    }
    return "water";
  });

  // Load department profile from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cachedDept = localStorage.getItem("supabase_dept");
      if (cachedDept && ["water", "electricity", "gas", "telecom"].includes(cachedDept)) {
        setPlannerDept(cachedDept as any);
      }

      // Check URL query parameters for redirect notifications
      const urlParams = new URLSearchParams(window.location.search);
      const msg = urlParams.get("msg");
      if (msg) {
        if (msg.startsWith("status_updated_to_")) {
          const statusVal = msg.replace("status_updated_to_", "").toUpperCase();
          setStatusBanner({
            type: "success",
            message: `Clearance request status was successfully updated to: ${statusVal}`,
          });
        } else if (msg === "submitted") {
          setStatusBanner({
            type: "success",
            message: "Excavation proposal submitted successfully! AI analysis pipeline triggered.",
          });
        } else if (msg === "deleted") {
          setStatusBanner({
            type: "success",
            message: "Excavation proposal deleted successfully.",
          });
        }
        // Clear query parameters from URL dynamically
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Sync role if forcedRole changes
  useEffect(() => {
    if (forcedRole) {
      setCurrentRole(forcedRole);
      setActiveTab(forcedRole === "planner" ? "create_proposal" : "dashboard");
    }
  }, [forcedRole]);

  // Tabs
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "create_proposal" | "submissions" | "gis" | "policies" | "audit" | "analytics" | "users"
  >(forcedRole === "planner" ? "create_proposal" : "dashboard");

  // API and local state synchronization
  const [proposals, setProposals] = useState<any[]>([]);
  const [roads, setRoads] = useState<string[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);

  // Similar Projects Vector Search list
  const [similarProjects, setSimilarProjects] = useState<any[]>([]);

  // RAG Chat State
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ q: string; a: string; sources?: any[] }>>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Proposal Creation Form wizard state
  const [formStep, setFormStep] = useState(1);
  const [formData, setFormData] = useState({
    road_name: "",
    purpose: "",
    description: "",
    start_date: "",
    end_date: "",
    priority: "medium",
    contact_name: "",
    contact_mobile: "",
    contact_email: "",
    estimated_budget: "" as any,
    contractor: "",
    excavation_method: "",
    utility_type: "",
    expected_traffic_diversion: "minor",
    risk_level: "medium",
    length_m: 0,
    width_m: 0.8,
    area_sqm: 0,
    geom: null as any,
  });

  // Filter States
  const [filterDept, setFilterDept] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchRoad, setSearchRoad] = useState("");

  // Perform API check to sync with backend if online
  const checkBackendStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/`);
      if (res.ok) {
        setServerOnline(true);
        fetchProposals();
        fetchRoads();
        fetchPolicies();
        fetchAuditLogs();
      } else {
        setServerOnline(false);
      }
    } catch {
      setServerOnline(false);
    }
  };

  const fetchProposals = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/proposals`, {
        headers: { Authorization: getAuthHeader() },
      });
      if (res.ok) {
        const data = await res.json();
        setProposals(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoads = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/roads`);
      if (res.ok) {
        const data = await res.json();
        setRoads(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPolicies = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/policies`, {
        headers: { Authorization: getAuthHeader() },
      });
      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/audit-logs`, {
        headers: { Authorization: getAuthHeader() },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) {
      console.error("Error fetching audit logs", e);
    }
  };

  useEffect(() => {
    checkBackendStatus();
  }, []);

  // Check if we are editing a proposal (redirected from details page with ?edit=proposal_id)
  useEffect(() => {
    const checkEditQuery = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get("edit");
      if (editId) {
        setLoading(true);
        try {
          const res = await fetch(`${BACKEND_URL}/api/proposals/${editId}`, {
            headers: { Authorization: getAuthHeader() },
          });
          if (res.ok) {
            const data = await res.json();
            setEditingProposalId(editId);
            setFormData({
              road_name: data.road_name,
              purpose: data.purpose,
              description: data.description,
              start_date: data.start_date,
              end_date: data.end_date,
              priority: data.priority,
              contact_name: data.contact_name,
              contact_mobile: data.contact_mobile,
              contact_email: data.contact_email,
              estimated_budget: data.estimated_budget,
              contractor: data.contractor,
              excavation_method: data.excavation_method,
              utility_type: data.utility_type,
              expected_traffic_diversion: data.expected_traffic_diversion,
              risk_level: data.risk_level,
              length_m: data.length_m,
              width_m: data.width_m,
              area_sqm: data.area_sqm,
              geom: data.geom,
            });
            setActiveTab("create_proposal");
            setFormStep(1);
          }
        } catch (e) {
          console.error("Failed to load proposal for editing", e);
        } finally {
          setLoading(false);
        }
      }
    };
    
    if (serverOnline) {
      checkEditQuery();
    }
  }, [serverOnline]);

  // Fetch AI Analysis results for selected proposal
  const handleSelectProposal = async (prop: any) => {
    router.push(`/${currentRole}/proposals/${prop.id}`);
  };

  const handleDeleteProposal = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this rejected proposal?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/proposals/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: getAuthHeader(),
        },
      });
      if (res.ok) {
        setStatusBanner({ type: "success", message: "Excavation proposal deleted successfully." });
        fetchProposals();
      } else {
        const err = await res.json();
        setStatusBanner({ type: "error", message: `Failed to delete proposal: ${err.detail || "Server error"}` });
      }
    } catch (e) {
      setStatusBanner({ type: "error", message: "Server communication error." });
    } finally {
      setLoading(false);
    }
  };

  // Map drawing callback
  const handleMapShapeDrawn = useCallback((geometry: any, length: number, area: number) => {
    setFormData((prev) => {
      if (prev.length_m === length && prev.area_sqm === area && prev.geom === geometry) {
        return prev;
      }
      return {
        ...prev,
        geom: geometry,
        length_m: parseFloat(length.toFixed(1)),
        area_sqm: parseFloat(area.toFixed(1)),
      };
    });
  }, []);

  // Form submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.geom) {
      setStatusBanner({ type: "error", message: "Please plot coordinates on the GIS Chennai Map first!" });
      return;
    }

    setLoading(true);
    const payload = {
      ...formData,
      department: plannerDept,
    };

    if (serverOnline) {
      try {
        const res = await fetch(
          editingProposalId 
            ? `${BACKEND_URL}/api/proposals/${editingProposalId}` 
            : `${BACKEND_URL}/api/proposals`, 
          {
            method: editingProposalId ? "PUT" : "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: getAuthHeader(),
            },
            body: JSON.stringify(payload),
          }
        );

        if (res.ok) {
          setStatusBanner({
            type: "success",
            message: editingProposalId 
              ? "Excavation Proposal updated and resubmitted successfully! AI re-evaluation triggered."
              : "Excavation Proposal submitted successfully! AI analysis pipeline triggered.",
          });
          setEditingProposalId(null);
          fetchProposals();
          setFormData({
            road_name: "",
            purpose: "",
            description: "",
            start_date: "",
            end_date: "",
            priority: "medium",
            contact_name: "",
            contact_mobile: "",
            contact_email: "",
            estimated_budget: "" as any,
            contractor: "",
            excavation_method: "",
            utility_type: "",
            expected_traffic_diversion: "minor",
            risk_level: "medium",
            length_m: 0,
            width_m: 0.8,
            area_sqm: 0,
            geom: null,
          });
          setFormStep(1);
        } else {
          const err = await res.json();
          const detailMsg = typeof err.detail === "object"
            ? JSON.stringify(err.detail)
            : err.detail || "Unknown error";
          setStatusBanner({ type: "error", message: `Submission failed: ${detailMsg}` });
        }
      } catch (e) {
        setStatusBanner({ type: "error", message: "Server communication error." });
      }
    } else {
      setTimeout(() => {
        const mockNewProp = {
          id: `prop-${Math.random().toString(36).substr(2, 9)}`,
          road_name: formData.road_name || "Anna Salai (Mount Road)",
          purpose: formData.purpose || "Water Pipeline expansion",
          description: formData.description,
          start_date: formData.start_date || "2026-08-01",
          end_date: formData.end_date || "2026-08-15",
          priority: formData.priority,
          status: "pending",
          department: plannerDept,
          contact_name: formData.contact_name || "Engineer Rakes",
          contact_mobile: formData.contact_mobile || "9988776655",
          contact_email: formData.contact_email || "rakes@chennai.gov.in",
          estimated_budget: formData.estimated_budget,
          contractor: formData.contractor || "Chennai Contracting",
          excavation_method: formData.excavation_method,
          utility_type: formData.utility_type,
          expected_traffic_diversion: formData.expected_traffic_diversion,
          risk_level: formData.risk_level,
          length_m: formData.length_m || 85,
          width_m: formData.width_m,
          area_sqm: formData.area_sqm || 68,
          geom: formData.geom,
          created_at: new Date().toISOString(),
        };

        setProposals((prev) => [mockNewProp, ...prev]);
        alert("Excavation Proposal submitted successfully! (Demonstration: Offline sync simulated AI analysis)");
        setFormData({
          road_name: "",
          purpose: "",
          description: "",
          start_date: "",
          end_date: "",
          priority: "medium",
          contact_name: "",
          contact_mobile: "",
          contact_email: "",
          estimated_budget: 150000,
          contractor: "",
          excavation_method: "Trenching",
          utility_type: "Water Pipe Relocation",
          expected_traffic_diversion: "minor",
          risk_level: "medium",
          length_m: 0,
          width_m: 0.8,
          area_sqm: 0,
          geom: null,
        });
        setFormStep(1);
      }, 1000);
    }
    setLoading(false);
  };

  // Admin decision approval handling
  const handleAdminDecision = async (statusUpdate: "approved" | "rejected" | "revision", remarks: string) => {
    if (!selectedProposal) return;
    setLoading(true);

    if (serverOnline) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/proposals/${selectedProposal.id}/decision`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: getAuthHeader(),
          },
          body: JSON.stringify({ status: statusUpdate, remarks }),
        });
        if (res.ok) {
          alert(`Proposal status successfully updated to ${statusUpdate.toUpperCase()}`);
          fetchProposals();
          setSelectedProposal(null);
          setActiveAnalysis(null);
        }
      } catch (e) {
        alert("Server error processing decision.");
      }
    } else {
      setTimeout(() => {
        setProposals((prev) =>
          prev.map((p) => (p.id === selectedProposal.id ? { ...p, status: statusUpdate } : p))
        );
        alert(`Proposal status successfully updated to ${statusUpdate.toUpperCase()} (Offline Sync)`);
        setSelectedProposal(null);
        setActiveAnalysis(null);
      }, 500);
    }
    setLoading(false);
  };

  // RAG Chat Submit
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;

    const currentQ = chatQuestion;
    setChatQuestion("");
    setChatLoading(true);

    if (serverOnline) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/chat/ask`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: getAuthHeader(),
          },
          body: JSON.stringify({ question: currentQ }),
        });
        if (res.ok) {
          const data = await res.json();
          setChatHistory((prev) => [...prev, { q: currentQ, a: data.answer, sources: data.sources }]);
        }
      } catch {
        alert("RAG communication error.");
      }
    } else {
      setTimeout(() => {
        let answer =
          "According to Section 4.2 of the Greater Chennai Corporation Road Cut SOP, utility providers must avoid excavation during the Northeast Monsoon (October to December). Emergency excavations require written approval from the Zonal Executive Engineer and are subject to double restoration charges.";
        if (currentQ.toLowerCase().includes("budget") || currentQ.toLowerCase().includes("deposit")) {
          answer =
            "Under the GCC 2023 Road Excavation Rules, a security deposit calculated at Rs. 2,500 per square meter for asphalt roads and Rs. 4,500 per square meter for concrete roads must be paid online before any trenching works commence.";
        }
        setChatHistory((prev) => [
          ...prev,
          {
            q: currentQ,
            a: answer,
            sources: [{ document_name: "GCC_Road_Cut_SOP_2024.pdf", page: 4 }],
          },
        ]);
      }, 700);
    }
    setChatLoading(false);
  };

  // Filtered Proposals list
  const getFilteredProposals = () => {
    return proposals.filter((p) => {
      const matchDept = filterDept === "all" || p.department === filterDept;
      const matchPriority = filterPriority === "all" || p.priority === filterPriority;
      const matchStatus = filterStatus === "all" || p.status === filterStatus;
      const matchRoad = !searchRoad || p.road_name.toLowerCase().includes(searchRoad.toLowerCase());
      return matchDept && matchPriority && matchStatus && matchRoad;
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 animate-fade-in">
      {/* 1. Header & Navigation */}
      <Header
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        serverOnline={serverOnline}
        setActiveTab={setActiveTab}
        showRoleSwitcher={showRoleSwitcher}
      />

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentRole={currentRole}
          plannerDept={plannerDept}
          setPlannerDept={setPlannerDept}
        />

        {/* Dashboard Content Container */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Custom Info Banner Bypassing Raw Popups */}
          {statusBanner && (
            <div className={`p-4 rounded-xl border flex items-center justify-between shadow-2xs mb-5 font-sans animate-fade-in ${
              statusBanner.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : statusBanner.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}>
              <div className="flex items-center gap-2 text-xs font-semibold">
                {statusBanner.type === "success" ? (
                  <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                ) : statusBanner.type === "error" ? (
                  <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                ) : (
                  <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                )}
                <span>{statusBanner.message}</span>
              </div>
              <button
                onClick={() => setStatusBanner(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
          {/* TAB 1: Proposals Dashboard (Admin Only) */}
          {activeTab === "dashboard" && currentRole === "admin" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full items-start animate-fade-in">
              {/* Left Column: Proposals List */}
              <div className="xl:col-span-7 flex flex-col gap-6">
                <ProposalList
                  currentRole={currentRole}
                  proposals={proposals}
                  plannerDept={plannerDept}
                  selectedProposal={selectedProposal}
                  handleSelectProposal={handleSelectProposal}
                  getFilteredProposals={getFilteredProposals}
                  filterDept={filterDept}
                  setFilterDept={setFilterDept}
                  filterPriority={filterPriority}
                  setFilterPriority={setFilterPriority}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  searchRoad={searchRoad}
                  setSearchRoad={setSearchRoad}
                  handleDeleteProposal={handleDeleteProposal}
                />
              </div>

              {/* Right Column: GIS Preview and Guide Info */}
              <div className="xl:col-span-5 space-y-6 animate-fade-in">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <h3 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <MapPin className="h-4 w-4 text-blue-600" /> GCC GIS Coordination Grid
                  </h3>
                  <div className="w-full h-[250px] rounded-lg overflow-hidden border">
                    <MapComponent
                      isEditable={false}
                      proposals={proposals}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl border p-6 shadow-sm space-y-4 font-sans">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-amber-500" /> Administrative Console Guidelines
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Select any pending excavation clearance request from the list to open its dedicated AI-assisted compliance review page.
                  </p>
                  <div className="text-[11px] bg-blue-50 border border-blue-100 text-blue-800 p-3 rounded-lg leading-normal font-semibold">
                    <strong>Note:</strong> Dedicated review workspaces allow you to approve, reject, or request revisions on proposals with full-screen GIS visualizers, RAG circular search, and traffic disruption reports.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PLANNER ONLY: Create Proposal Wizard */}
          {activeTab === "create_proposal" && currentRole === "planner" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full items-start animate-fade-in">
              {/* Left Column: Form Wizard */}
              <div className="xl:col-span-7 flex flex-col gap-6">
                <ProposalForm
                  formData={formData}
                  setFormData={setFormData}
                  formStep={formStep}
                  setFormStep={setFormStep}
                  roads={roads}
                  proposals={proposals}
                  plannerDept={plannerDept}
                  loading={loading}
                  handleFormSubmit={handleFormSubmit}
                  handleMapShapeDrawn={handleMapShapeDrawn}
                  editingProposalId={editingProposalId}
                />
              </div>

              {/* Right Column: Guide Info */}
              <div className="xl:col-span-5 space-y-6 animate-fade-in font-sans">
                <div className="bg-white rounded-xl border p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-emerald-600" /> Drawing Guide
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Before submitting, you must plot the trench alignment coordinates on the GIS segment map in **Step 2** of the wizard.
                  </p>
                  <div className="text-[11px] bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-lg leading-normal font-semibold">
                    <strong>Note:</strong> Overlap coordinates are automatically correlated against active works in the region to block duplicate road cuts.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PLANNER ONLY: Submissions History */}
          {activeTab === "submissions" && currentRole === "planner" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full items-start animate-fade-in">
              {/* Left Column: Proposals List */}
              <div className="xl:col-span-7 flex flex-col gap-6">
                <ProposalList
                  currentRole={currentRole}
                  proposals={proposals}
                  plannerDept={plannerDept}
                  selectedProposal={selectedProposal}
                  handleSelectProposal={handleSelectProposal}
                  getFilteredProposals={getFilteredProposals}
                  filterDept={filterDept}
                  setFilterDept={setFilterDept}
                  filterPriority={filterPriority}
                  setFilterPriority={setFilterPriority}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  searchRoad={searchRoad}
                  setSearchRoad={setSearchRoad}
                  handleDeleteProposal={handleDeleteProposal}
                />
              </div>

              {/* Right Column: GIS Preview and Guide Info */}
              <div className="xl:col-span-5 space-y-6 animate-fade-in">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <h3 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <MapPin className="h-4 w-4 text-blue-600" /> GCC GIS Coordination Grid
                  </h3>
                  <div className="w-full h-[250px] rounded-lg overflow-hidden border">
                    <MapComponent
                      isEditable={false}
                      proposals={proposals}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl border p-6 shadow-sm space-y-4 font-sans">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-emerald-500" /> Department Submission Log
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Select one of your submitted excavation permits from the queue to view its dedicated AI compliance review feedback and clearance logs.
                  </p>
                  <div className="text-[11px] bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-lg leading-normal font-semibold">
                    <strong>Note:</strong> Real-time status updates are logged under the GCC Digital Audit Trail. In case of revisions, click "Back to Edit" on the proposal details page to submit changes.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GIS Monitoring Radar */}
          {activeTab === "gis" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-xl border p-4 flex items-center justify-between shadow-sm">
                <div>
                  <h2 className="text-md font-bold text-slate-800 font-sans">GCC GIS Monitoring Radar</h2>
                  <p className="text-xs text-slate-500 font-medium font-sans">Real-time overlay of all utility excavations across Chennai Metropolitan Area</p>
                </div>
                <div className="flex gap-4 text-xs font-semibold font-sans">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-amber-500" /> Pending
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-blue-500" /> Approved
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" /> Completed
                  </span>
                </div>
              </div>

              <div className="w-full h-[550px] rounded-xl overflow-hidden border shadow-md">
                <MapComponent isEditable={false} proposals={proposals} />
              </div>
            </div>
          )}

          {/* TAB 3: Policy Knowledge Base */}
          {activeTab === "policies" && currentRole === "admin" && (
            <PoliciesTab
              currentRole={currentRole}
              policies={policies}
              chatHistory={chatHistory}
              chatLoading={chatLoading}
              chatQuestion={chatQuestion}
              setChatQuestion={setChatQuestion}
              handleChatSubmit={handleChatSubmit}
              fetchPolicies={fetchPolicies}
              BACKEND_URL={BACKEND_URL}
            />
          )}

          {/* TAB 4: Digital Audit Logs */}
          {activeTab === "audit" && currentRole === "admin" && (
            <AuditLogsTab auditLogs={auditLogs} />
          )}

          {/* TAB 5: AI Analytics */}
          {activeTab === "analytics" && currentRole === "admin" && (
            <AnalyticsTab proposals={proposals} />
          )}

          {/* TAB 6: Planner Profiles (Admin Only) */}
          {activeTab === "users" && currentRole === "admin" && (
            <UsersTab BACKEND_URL={BACKEND_URL} />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-500 text-center py-3 text-[10px] border-t border-slate-900 font-sans">
        © 2026 Greater Chennai Corporation. All rights reserved. Managed by GCC Digital Services Division & Zonal GIS Coordination Committee.
      </footer>
    </div>
  );
}
