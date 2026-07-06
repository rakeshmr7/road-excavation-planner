"use client";

import React, { useState } from "react";
import { FileText, Sparkles, HelpCircle, Send, RefreshCw, Plus, Trash2, X, UploadCloud, AlertCircle } from "lucide-react";

interface PoliciesTabProps {
  currentRole: "admin" | "planner";
  policies: any[];
  chatHistory: Array<{ q: string; a: string; sources?: any[] }>;
  chatLoading: boolean;
  chatQuestion: string;
  setChatQuestion: (val: string) => void;
  handleChatSubmit: (e: React.FormEvent) => void;
  fetchPolicies: () => void;
  BACKEND_URL: string;
}

export const PoliciesTab: React.FC<PoliciesTabProps> = ({
  currentRole,
  policies,
  chatHistory,
  chatLoading,
  chatQuestion,
  setChatQuestion,
  handleChatSubmit,
  fetchPolicies,
  BACKEND_URL,
}) => {
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("1.0");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Visual processing states
  const [uploadStep, setUploadStep] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);

  // Deletion visualization states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState(0);

  // Drive chunking visualization
  React.useEffect(() => {
    let stepInterval: any;
    let chunkInterval: any;

    if (uploading) {
      setUploadStep(0);
      setChunkCount(0);

      // Step transition
      stepInterval = setInterval(() => {
        setUploadStep((prev) => {
          if (prev < 3) return prev + 1;
          return prev;
        });
      }, 2500);

      // Increment chunk count
      chunkInterval = setInterval(() => {
        setChunkCount((prev) => {
          if (prev < 32) return prev + Math.floor(Math.random() * 3) + 1;
          return prev;
        });
      }, 400);
    } else {
      setUploadStep(0);
      setChunkCount(0);
    }

    return () => {
      clearInterval(stepInterval);
      clearInterval(chunkInterval);
    };
  }, [uploading]);

  const getAuthHeader = () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("supabase_token");
      if (token) return `Bearer ${token}`;
    }
    return "Bearer mock-token-superadmin";
  };

  const getFileUrl = (filePath: string) => {
    let path = filePath.replace(/^\.\//, ''); // remove leading ./
    if (!path.startsWith('storage/')) {
      path = `storage/${path}`;
    }
    return `${BACKEND_URL}/${path}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      if (ext !== "pdf" && ext !== "docx") {
        setUploadError("Only PDF and DOCX circular documents are supported.");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setUploadError("");
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError("Please select a policy circular file.");
      return;
    }

    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/policies?version=${version}`, {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(),
        },
        body: formData,
      });

      if (res.ok) {
        alert(`Successfully uploaded and vector-indexed: ${file.name}`);
        setFile(null);
        setVersion("1.0");
        setShowModal(false);
        fetchPolicies();
      } else {
        const err = await res.json();
        setUploadError(err.detail || "Failed to index policy document.");
      }
    } catch (err) {
      setUploadError("Server communication error.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePolicy = async (policyId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will permanently purge its vector chunks from the ChromaDB knowledge base.`)) {
      return;
    }

    setDeletingId(policyId);
    setDeleteStep(0);

    // Simulate steps for UI animation
    const stepInterval = setInterval(() => {
      setDeleteStep((prev) => {
        if (prev < 2) return prev + 1;
        return prev;
      });
    }, 1200);

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/policies/${policyId}`, {
        method: "DELETE",
        headers: {
          Authorization: getAuthHeader(),
        },
      });

      if (res.ok) {
        setTimeout(() => {
          clearInterval(stepInterval);
          setDeletingId(null);
          alert("Policy deleted and vectors purged successfully.");
          fetchPolicies();
        }, 800);
      } else {
        clearInterval(stepInterval);
        setDeletingId(null);
        alert("Failed to delete policy circular.");
      }
    } catch (e) {
      clearInterval(stepInterval);
      setDeletingId(null);
      alert("Server communication error.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in font-sans">
      {/* Left Side: Upload list */}
      <div className="lg:col-span-7 bg-white rounded-xl border p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-3 border-b">
          <div>
            <h2 className="text-md font-bold text-slate-800">Indexed Government Circulars</h2>
            <p className="text-xs text-slate-500 font-medium">RAG indexed policy database</p>
          </div>

          {currentRole === "admin" && (
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 bg-blue-900 text-white rounded text-xs font-bold hover:bg-blue-800 transition flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Upload circular
            </button>
          )}
        </div>

        <div className="space-y-3">
          {policies.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 font-medium bg-slate-50/50 rounded-lg border border-dashed">
              No government circulars indexed.
            </div>
          ) : (
            policies.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center p-3.5 border rounded-xl hover:bg-slate-50/55 transition shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-amber-500 flex-shrink-0" />
                  <div>
                    <a
                      href={getFileUrl(p.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-blue-900 hover:underline cursor-pointer block"
                    >
                      {p.file_name}
                    </a>
                    <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">
                      Version: {p.version} | Uploaded: {p.uploaded_at?.split("T")[0] || "2026-07-06"}
                    </div>
                  </div>
                </div>
                {currentRole === "admin" && (
                  <button
                    onClick={() => handleDeletePolicy(p.id, p.file_name)}
                    className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition cursor-pointer"
                    title="Purge Embeddings"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Side: RAG Chat Assistant */}
      <div className="lg:col-span-5 bg-white rounded-xl border shadow-sm flex flex-col h-[520px] overflow-hidden">
        <div className="bg-slate-900 text-white p-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
          <div>
            <h3 className="text-xs font-bold">GCC Policy RAG Chat Assistant</h3>
            <p className="text-[10px] text-slate-400 font-medium">Ask official road cutting rules (no hallucinations)</p>
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {chatHistory.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-xs space-y-2">
              <HelpCircle className="h-8 w-8 mx-auto text-slate-300 animate-bounce" />
              <p className="font-medium text-slate-500">
                Ask a policy query like:
                <br />
                <em className="text-blue-900 block mt-1">"Can we excavate during monsoon season?"</em>
              </p>
            </div>
          )}
          {chatHistory.map((chat, idx) => (
            <div key={idx} className="space-y-3">
              {/* Question */}
              <div className="flex justify-end">
                <div className="bg-blue-900 text-white p-2.5 rounded-lg text-xs max-w-[80%] shadow-sm font-medium">
                  {chat.q}
                </div>
              </div>

              {/* Answer */}
              <div className="flex justify-start">
                <div className="bg-slate-50 text-slate-800 p-2.5 rounded-lg text-xs max-w-[85%] border shadow-sm space-y-2 leading-relaxed">
                  <p className="font-medium">{chat.a}</p>

                  {/* Citations */}
                  {chat.sources && chat.sources.length > 0 && (
                    <div className="pt-1.5 border-t border-slate-200 flex flex-wrap gap-1 items-center">
                      <span className="text-[9px] font-bold text-slate-400 mr-1">Citations:</span>
                      {chat.sources.map((s, sidx) => (
                        <span
                          key={sidx}
                          className="text-[9px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-semibold"
                        >
                          {s.document_name} (Page {s.page})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {chatLoading && (
            <div className="flex justify-start items-center gap-2 text-xs text-slate-500 font-medium">
              <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
              Consulting GCC policy documents...
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleChatSubmit} className="p-3 border-t bg-slate-50 flex gap-2">
          <input
            type="text"
            value={chatQuestion}
            onChange={(e) => setChatQuestion(e.target.value)}
            placeholder="Ask policy rules..."
            className="flex-1 bg-white border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-900 font-medium"
          />
          <button
            type="submit"
            disabled={chatLoading}
            className="bg-blue-900 hover:bg-blue-800 text-white p-2 rounded-xl transition cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Policy Upload Modal (Admin Only) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-55 animate-fade-in p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border shadow-2xl p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">
              Index Regulation Circular
            </h3>

            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800 flex items-center gap-2 mb-4 font-semibold">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploading ? (
              <div className="space-y-6 py-4 animate-fade-in font-sans text-slate-800">
                {/* Header status */}
                <div className="text-center space-y-2">
                  <div className="inline-flex p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-900 animate-pulse">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">RAG Ingestion Active</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Processing: <span className="font-bold text-slate-600">{file?.name}</span></p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>Overall Progress</span>
                    <span>{Math.round(((uploadStep + 1) / 4) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-900 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${((uploadStep + 1) / 4) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Stepper list */}
                <div className="space-y-3 bg-slate-50/50 p-4 border rounded-xl">
                  {/* Step 0 */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {uploadStep > 0 ? (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">✓</span>
                      ) : uploadStep === 0 ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-slate-200" />
                      )}
                    </div>
                    <div>
                      <span className={`block text-xs font-bold ${uploadStep >= 0 ? "text-slate-800" : "text-slate-400"}`}>
                        1. Extracting Document Content
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium leading-normal">
                        Parsing text layouts, sections, and policy paragraphs.
                      </span>
                    </div>
                  </div>

                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {uploadStep > 1 ? (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">✓</span>
                      ) : uploadStep === 1 ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-slate-200" />
                      )}
                    </div>
                    <div>
                      <span className={`block text-xs font-bold ${uploadStep >= 1 ? "text-slate-800" : "text-slate-400"}`}>
                        2. Text Chunking & Segmentation
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium leading-normal">
                        Segmented <span className="font-bold text-blue-900">{chunkCount}</span> text blocks with 150-char redundancy.
                      </span>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {uploadStep > 2 ? (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">✓</span>
                      ) : uploadStep === 2 ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-slate-200" />
                      )}
                    </div>
                    <div>
                      <span className={`block text-xs font-bold ${uploadStep >= 2 ? "text-slate-800" : "text-slate-400"}`}>
                        3. Vector Embeddings Generation
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium leading-normal">
                        Calculating spatial vector positions via Gemini/Ollama.
                      </span>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {uploadStep > 3 ? (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">✓</span>
                      ) : uploadStep === 3 ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-slate-200" />
                      )}
                    </div>
                    <div>
                      <span className={`block text-xs font-bold ${uploadStep >= 3 ? "text-slate-800" : "text-slate-400"}`}>
                        4. Storing in Vector Database
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium leading-normal">
                        Writing indexed embeddings into ChromaDB collection.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-sans">
                {/* File Drop Area */}
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-900/40 rounded-xl p-6 text-center transition bg-slate-50/50">
                  <input
                    type="file"
                    id="policy-file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="policy-file" className="cursor-pointer space-y-2 block">
                    <UploadCloud className="h-8 w-8 text-blue-900 mx-auto opacity-70" />
                    {file ? (
                      <div>
                        <span className="block font-bold text-slate-800">{file.name}</span>
                        <span className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    ) : (
                      <div>
                        <span className="block font-bold text-slate-700">Click to upload policy document</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Supports PDF and DOCX files</span>
                      </div>
                    )}
                  </label>
                </div>

                {/* Version Input */}
                <div className="space-y-1.5">
                  <label className="block text-slate-500 font-bold uppercase tracking-wider">Circular Version</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1.0 or 2024-V2"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full bg-slate-50 border rounded-lg p-2 focus:bg-white focus:outline-none font-semibold text-slate-700"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  Parse & Inject Vectors
                </button>

                <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                  * Uploaded circulars will be split, embedded into vector shapes, and stored in ChromaDB for instant compliance checks.
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Vector Purge Modal (Admin Only) */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-55 animate-fade-in p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border shadow-2xl p-6 text-center space-y-4">
            <div className="inline-flex p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 animate-bounce">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              ChromaDB Vector Purge In Progress
            </h3>

            {/* Stepper */}
            <div className="space-y-3 bg-slate-50/50 p-4 border rounded-xl text-left">
              {/* Step 0 */}
              <div className="flex items-center gap-3 text-xs">
                {deleteStep > 0 ? (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">✓</span>
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-600" />
                )}
                <span className={`font-bold ${deleteStep >= 0 ? "text-slate-800" : "text-slate-400"}`}>
                  1. Locating Vector Collection Segment
                </span>
              </div>

              {/* Step 1 */}
              <div className="flex items-center gap-3 text-xs">
                {deleteStep > 1 ? (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">✓</span>
                ) : deleteStep === 1 ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-600" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-slate-200" />
                )}
                <span className={`font-bold ${deleteStep >= 1 ? "text-slate-800" : "text-slate-400"}`}>
                  2. Purging high-dimensional coordinates
                </span>
              </div>

              {/* Step 2 */}
              <div className="flex items-center gap-3 text-xs">
                {deleteStep === 2 ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-600" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-slate-200" />
                )}
                <span className={`font-bold ${deleteStep >= 2 ? "text-slate-800" : "text-slate-400"}`}>
                  3. Deleting metadata rows & storage files
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              * Removing document chunks from vector index to prevent RAG semantic collisions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
