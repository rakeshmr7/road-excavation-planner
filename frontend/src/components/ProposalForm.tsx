import React, { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2, Circle, AlertTriangle, Sparkles, HelpCircle, ShieldCheck, FileEdit } from "lucide-react";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });

interface ProposalFormProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  formStep: number;
  setFormStep: (step: number) => void;
  roads: string[];
  proposals: any[];
  plannerDept: string;
  loading: boolean;
  handleFormSubmit: (e: React.FormEvent) => void;
  handleMapShapeDrawn: (geometry: any, length: number, area: number) => void;
  editingProposalId?: string | null;
}

export const ProposalForm: React.FC<ProposalFormProps> = ({
  formData,
  setFormData,
  formStep,
  setFormStep,
  roads,
  proposals,
  plannerDept,
  loading,
  handleFormSubmit,
  handleMapShapeDrawn,
  editingProposalId = null,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    const today = new Date().toISOString().split("T")[0];

    if (step === 1) {
      if (!formData.road_name) {
        newErrors.road_name = "Road name is required.";
      }
      if (!formData.purpose || formData.purpose.trim().length < 5) {
        newErrors.purpose = "Excavation purpose is required (minimum 5 characters).";
      }
      if (!formData.description || formData.description.trim().length < 10) {
        newErrors.description = "Technical description is required (minimum 10 characters).";
      }
      if (!formData.start_date) {
        newErrors.start_date = "Start date is required.";
      } else if (formData.start_date < today) {
        newErrors.start_date = "Start date cannot be in the past.";
      }
      if (!formData.end_date) {
        newErrors.end_date = "End date is required.";
      } else if (formData.start_date && formData.end_date < formData.start_date) {
        newErrors.end_date = "End date must be equal to or after the start date.";
      }
    } else if (step === 2) {
      if (!formData.geom) {
        newErrors.geom = "You must plot coordinates on the GIS Chennai Map before proceeding.";
      }
    } else if (step === 3) {
      if (!formData.estimated_budget || Number(formData.estimated_budget) <= 0) {
        newErrors.estimated_budget = "Estimated budget must be a positive number.";
      }
      if (!formData.excavation_method) {
        newErrors.excavation_method = "Excavation method is required.";
      }
      if (!formData.utility_type || formData.utility_type.trim().length === 0) {
        newErrors.utility_type = "Utility type is required.";
      }
      if (!formData.contact_email) {
        newErrors.contact_email = "Contact email is required.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
        newErrors.contact_email = "Please enter a valid email address.";
      }
      if (!formData.contact_mobile) {
        newErrors.contact_mobile = "Contact mobile number is required.";
      } else if (!/^\d{10}$/.test(formData.contact_mobile)) {
        newErrors.contact_mobile = "Please enter a valid 10-digit mobile number.";
      }
      if (!formData.contact_name || formData.contact_name.trim().length === 0) {
        newErrors.contact_name = "Primary engineer name is required.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };



  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-md font-bold text-slate-800">New Excavation Permit Request</h2>
          <p className="text-xs text-slate-500 font-medium">GCC Digital Form wizard workflow</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded">
          Step {formStep} of 3
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4 font-sans">
        {editingProposalId && (
          <div className="p-3.5 bg-purple-50 border border-purple-200 text-purple-800 rounded-xl text-xs font-semibold flex items-center gap-2 mb-4 animate-fade-in font-sans shadow-2xs">
            <FileEdit className="h-4.5 w-4.5 text-purple-600 flex-shrink-0 animate-pulse" />
            <div>
              <span className="block font-bold">Proposal Revision Edit Mode</span>
              <span className="text-[10px] text-purple-600 font-medium">Re-submitting this form will overwrite the existing permit request and restart the AI agent compliance checks.</span>
            </div>
          </div>
        )}

        {/* Step 1: Basic Info */}
        {formStep === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Road Name *</label>
                <select
                  value={formData.road_name}
                  onChange={(e) => setFormData({ ...formData, road_name: e.target.value })}
                  className={`w-full border rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                    errors.road_name ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                  }`}
                >
                  <option value="">-- Select Chennai Road --</option>
                  {roads.map((r, i) => (
                    <option key={i} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {errors.road_name && (
                  <span className="text-[10px] text-rose-500 font-semibold mt-1 block">{errors.road_name}</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority *</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Excavation Purpose *</label>
              <input
                type="text"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="e.g. Laying sewer connections to newly constructed block"
                className={`w-full border rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                  errors.purpose ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                }`}
              />
              {errors.purpose && (
                <span className="text-[10px] text-rose-500 font-semibold mt-1 block">{errors.purpose}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Technical Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe depth, restoration timeline, trenching machinery utilized..."
                className={`w-full border rounded px-2.5 py-2 text-xs h-24 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                  errors.description ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                }`}
              />
              {errors.description && (
                <span className="text-[10px] text-rose-500 font-semibold mt-1 block">{errors.description}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className={`w-full border rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                    errors.start_date ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                  }`}
                />
                {errors.start_date && (
                  <span className="text-[10px] text-rose-500 font-semibold mt-1 block">{errors.start_date}</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Date *</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className={`w-full border rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                    errors.end_date ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                  }`}
                />
                {errors.end_date && (
                  <span className="text-[10px] text-rose-500 font-semibold mt-1 block">{errors.end_date}</span>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  if (validateStep(1)) setFormStep(2);
                }}
                className="px-4 py-2 bg-blue-900 text-white rounded text-xs font-semibold hover:bg-blue-800 transition cursor-pointer"
              >
                Next: Draw Coordinates
              </button>
            </div>
          </div>
        )}

        {/* Step 2: GIS Map Drawing */}
        {formStep === 2 && (
          <div className="space-y-4">
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              Draw excavation geometry on the Chennai Map below:
            </span>

            <div className="w-full h-[320px] rounded-lg overflow-hidden border">
              <MapComponent isEditable={true} proposals={proposals} onShapeDrawn={handleMapShapeDrawn} />
            </div>

            {/* Coordinate outputs */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-3 gap-2">
              <div>
                <span className="block text-[9px] uppercase font-bold text-slate-500">Trench Length</span>
                <span className="text-xs font-bold text-slate-800">{formData.length_m} meters</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-slate-500">Trench Area</span>
                <span className="text-xs font-bold text-slate-800">{formData.area_sqm} sq.m</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-slate-500">Geometry Status</span>
                <span className={`text-xs font-bold ${formData.geom ? "text-emerald-600" : "text-amber-500"}`}>
                  {formData.geom ? "Coordinates Saved" : "No Shape Drawn"}
                </span>
              </div>
            </div>

            {errors.geom && (
              <span className="text-[10px] text-rose-500 font-semibold mt-1 block text-center p-2 bg-rose-50 border border-rose-100 rounded-lg">{errors.geom}</span>
            )}

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setFormStep(1)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateStep(2)) setFormStep(3);
                }}
                className="px-4 py-2 bg-blue-900 text-white rounded text-xs font-semibold hover:bg-blue-800 transition cursor-pointer"
              >
                Next: Utility Details
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Contacts & Budget */}
        {formStep === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contractor Company Name</label>
                <input
                  type="text"
                  value={formData.contractor}
                  onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
                  placeholder="e.g. Larsen & Toubro"
                  className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Budget (Rs.) *</label>
                <input
                  type="number"
                  value={formData.estimated_budget}
                  onChange={(e) => setFormData({ ...formData, estimated_budget: e.target.value ? parseInt(e.target.value) : "" })}
                  placeholder="e.g. 250000"
                  className={`w-full border rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                    errors.estimated_budget ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                  }`}
                />
                {errors.estimated_budget && (
                  <span className="text-[10px] text-rose-500 font-semibold mt-1 block">{errors.estimated_budget}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Excavation Method *</label>
                <select
                  value={formData.excavation_method}
                  onChange={(e) => setFormData({ ...formData, excavation_method: e.target.value })}
                  className={`w-full border rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                    errors.excavation_method ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                  }`}
                >
                  <option value="">Select Method...</option>
                  <option value="Trenching">Open Trenching</option>
                  <option value="Drilling (HDD)">Horizontal Directional Drilling (HDD)</option>
                  <option value="Microtunnelling">Microtunnelling</option>
                </select>
                {errors.excavation_method && (
                  <span className="text-[10px] text-rose-500 font-semibold mt-1 block">{errors.excavation_method}</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Utility Type *</label>
                <input
                  type="text"
                  value={formData.utility_type}
                  onChange={(e) => setFormData({ ...formData, utility_type: e.target.value })}
                  placeholder="e.g. Water Main, Sewer, Power Cable"
                  className={`w-full border rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                    errors.utility_type ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                  }`}
                />
                {errors.utility_type && (
                  <span className="text-[10px] text-rose-500 font-semibold mt-1 block">{errors.utility_type}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Engineer Email *</label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="engineer@cmwssb.gov.in"
                  className={`w-full border rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                    errors.contact_email ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                  }`}
                />
                {errors.contact_email && (
                  <span className="text-[10px] text-rose-500 font-semibold mt-1 block">{errors.contact_email}</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Mobile *</label>
                <input
                  type="tel"
                  value={formData.contact_mobile}
                  onChange={(e) => setFormData({ ...formData, contact_mobile: e.target.value })}
                  placeholder="94440XXXXX"
                  className={`w-full border rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                    errors.contact_mobile ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                  }`}
                />
                {errors.contact_mobile && (
                  <span className="text-[10px] text-rose-500 font-semibold mt-1 block">{errors.contact_mobile}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Traffic Diversion</label>
                <select
                  value={formData.expected_traffic_diversion}
                  onChange={(e) => setFormData({ ...formData, expected_traffic_diversion: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="none">None (Side footpaths only)</option>
                  <option value="minor">Minor (Single lane narrows)</option>
                  <option value="major">Major (Heavy bottleneck detour)</option>
                  <option value="closed">Closed (Complete street detour)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Engineer Name *</label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className={`w-full border rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                    errors.contact_name ? "border-rose-400 bg-rose-50/20" : "border-slate-300"
                  }`}
                />
                {errors.contact_name && (
                  <span className="text-[10px] text-rose-500 font-semibold mt-1 block">{errors.contact_name}</span>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setFormStep(2)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={async (e) => {
                  if (validateStep(3)) {
                    await handleFormSubmit(e);
                  }
                }}
                className="px-6 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  "Submit Clearance Request"
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
