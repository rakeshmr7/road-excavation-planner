export const FALLBACK_ROADS = [
  "Anna Salai (Mount Road)",
  "Poonamallee High Road",
  "Rajiv Gandhi Salai (OMR)",
  "East Coast Road (ECR)",
  "Jawaharlal Nehru Road (100 Feet Road)",
  "Grand Southern Trunk Road (GST Road)",
  "Velachery Main Road",
  "Sardar Patel Road",
  "Arcot Road",
  "Dr. Radhakrishnan Salai",
];

export const FALLBACK_PROPOSALS = [
  {
    id: "prop-1",
    road_name: "Anna Salai (Mount Road)",
    purpose: "Metro Phase 2 Water Pipe Relocation",
    description: "Shifting GCC water mains away from the proposed Metro Corridor 4 line coordinates.",
    start_date: "2026-10-15",
    end_date: "2026-11-20",
    priority: "high",
    status: "pending",
    department: "water",
    contact_name: "Mr. Rajendran Pillai",
    contact_mobile: "9444012345",
    contact_email: "rajendran@cmwssb.gov.in",
    estimated_budget: 450000,
    contractor: "L&T Infrastructure",
    excavation_method: "Drilling (HDD)",
    utility_type: "Water Trunk Lines",
    expected_traffic_diversion: "major",
    risk_level: "high",
    length_m: 350.0,
    width_m: 1.2,
    area_sqm: 420.0,
    geom: {
      type: "Polygon",
      coordinates: [
        [
          [80.2707, 13.0827],
          [80.2725, 13.0832],
          [80.2730, 13.0815],
          [80.2712, 13.0810],
          [80.2707, 13.0827],
        ],
      ],
    },
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "prop-2",
    road_name: "Rajiv Gandhi Salai (OMR)",
    purpose: "Telecom underground fiber ducting",
    description: "Laying fresh optical fiber lines under Chennai OMR tech corridor for IT hub upgrades.",
    start_date: "2026-07-20",
    end_date: "2026-08-05",
    priority: "medium",
    status: "approved",
    department: "telecom",
    contact_name: "Ms. Kavitha Ram",
    contact_mobile: "9840198765",
    contact_email: "kavitha.ram@jio.com",
    estimated_budget: 220000,
    contractor: "GCC Telecom Contractors",
    excavation_method: "Trenching",
    utility_type: "Optical Fiber Microducts",
    expected_traffic_diversion: "none",
    risk_level: "low",
    length_m: 120.0,
    width_m: 0.8,
    area_sqm: 96.0,
    geom: {
      type: "LineString",
      coordinates: [
        [80.2458, 12.9815],
        [80.2465, 12.9830],
        [80.2472, 12.9845],
      ],
    },
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "prop-3",
    road_name: "Poonamallee High Road",
    purpose: "High-voltage grid cable laying",
    description: "Trenching and laying auxiliary electrical transmission conduits for substation feed.",
    start_date: "2026-09-01",
    end_date: "2026-09-25",
    priority: "emergency",
    status: "revision",
    department: "electricity",
    contact_name: "Mr. S. Kumar",
    contact_mobile: "9740156789",
    contact_email: "kumar.s@tneb.gov.in",
    estimated_budget: 850000,
    contractor: "TNEB Infrastructure Wing",
    excavation_method: "Trenching",
    utility_type: "HT Electrical Conduits",
    expected_traffic_diversion: "closed",
    risk_level: "critical",
    length_m: 540.0,
    width_m: 1.5,
    area_sqm: 810.0,
    geom: {
      type: "LineString",
      coordinates: [
        [80.2105, 13.0782],
        [80.2135, 13.0790],
      ],
    },
    created_at: new Date(Date.now() - 14400000).toISOString(),
  },
];

export const getMockAnalysis = (prop: any) => {
  return {
    proposal_id: prop.id,
    public_impact_score: prop.priority === "high" || prop.priority === "emergency" ? 75 : 30,
    risk_predicted: prop.priority === "high" || prop.priority === "emergency" ? "high" : "low",
    confidence_score: 92.5,
    recommendation: prop.priority === "high" || prop.priority === "emergency" ? "manual_review" : "approve",
    explanation: `**GCC AI Platform Findings:**\n- **Policy Compliance:** Approved timeline overlaps with ${
      prop.priority === "high" || prop.priority === "emergency"
        ? "Monsoon calendar restrictions (Northeast Monsoon)"
        : "favorable dry seasons"
    }.\n- **Duplicates:** No overlapping geometries on ${prop.road_name} in last 6 months.\n- **Coordination:** Potential shared trenching opportunity discovered within 50m with TNEB Electricity Board. Consolidating work schedules would save estimated 30% on road-cutting restoration fees.`,
    compliance_report: {
      compliant: prop.priority !== "high" && prop.priority !== "emergency",
      violations:
        prop.priority === "high" || prop.priority === "emergency"
          ? ["VIOLATION: GCC bans excavation work during Northeast Monsoon (Oct 1 - Dec 31)."]
          : [],
    },
    duplicate_conflicts: {
      conflict_detected: false,
      conflicts: [],
    },
    coordination_opportunities: {
      coordination_possible: true,
      suggestions: [
        {
          department: "electricity",
          road_name: prop.road_name,
          estimated_savings_percentage: 30,
          rationale: "TNEB plans grid wiring in same street. Aligning timelines prevents double road cuts.",
        },
      ],
    },
    weather_analysis: {
      risk_level: prop.priority === "high" || prop.priority === "emergency" ? "high" : "low",
      description:
        prop.priority === "high" || prop.priority === "emergency"
          ? "High precipitation risk. Northeast Monsoon overlaps excavation dates."
          : "Low weather risk.",
    },
    traffic_analysis: {
      disruption_level: prop.expected_traffic_diversion === "major" || prop.expected_traffic_diversion === "closed" ? "high" : "low",
      congestion_coefficient_pct: prop.expected_traffic_diversion === "closed" ? 85 : prop.expected_traffic_diversion === "major" ? 65 : 20,
      suggested_hours: "11:00 PM - 05:00 AM",
    },
  };
};

export const MOCK_SIMILAR = (prop: any) => [
  {
    similarity_score: 88.4,
    road_name: prop.road_name,
    purpose: "Trenching Pipeline Repair",
    outcome: "Completed. Suffered 2 days delay due to traffic peak congestion hours.",
    lessons_learned: "Mandate night-shifts for all trenches longer than 100 meters on arterial roads.",
  },
];
