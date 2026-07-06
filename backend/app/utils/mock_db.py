import uuid
from datetime import date, datetime
from typing import Dict, Any, List

# In-memory arrays to mirror DB tables during fallback
MOCK_PROPOSALS: List[Dict[str, Any]] = [
  {
    "id": uuid.UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b33"),
    "road_name": "Anna Salai (Mount Road)",
    "purpose": "Metro Phase 2 Water Pipe Relocation",
    "description": "Shifting CMWSSB trunk water lines away from the main Metro Rail corridor to allow foundation bore piling.",
    "start_date": date(2026, 10, 15),
    "end_date": date(2026, 11, 20),
    "priority": "high",
    "status": "pending",
    "department": "water",
    "contact_name": "Mr. Rajendran Pillai",
    "contact_mobile": "9444012345",
    "contact_email": "rajendran@cmwssb.gov.in",
    "estimated_budget": 450000.0,
    "contractor": "L&T Infrastructure",
    "excavation_method": "Drilling (HDD)",
    "utility_type": "Water Trunk Lines",
    "expected_traffic_diversion": "major",
    "risk_level": "high",
    "geom": {
      "type": "Polygon",
      "coordinates": [
        [
          [80.2707, 13.0827],
          [80.2725, 13.0832],
          [80.2730, 13.0815],
          [80.2712, 13.0810],
          [80.2707, 13.0827]
        ]
      ]
    },
    "length_m": 350.0,
    "width_m": 1.2,
    "area_sqm": 420.0,
    "created_at": datetime.now(),
    "updated_at": datetime.now()
  },
  {
    "id": uuid.UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b44"),
    "road_name": "Rajiv Gandhi Salai (OMR)",
    "purpose": "Telecom underground fiber ducting",
    "description": "Laying fresh optical fiber lines under Chennai OMR tech corridor for IT hub upgrades.",
    "start_date": date(2026, 7, 20),
    "end_date": date(2026, 8, 5),
    "priority": "medium",
    "status": "approved",
    "department": "telecom",
    "contact_name": "Ms. Kavitha Ram",
    "contact_mobile": "9840198765",
    "contact_email": "kavitha.ram@jio.com",
    "estimated_budget": 220000.0,
    "contractor": "GCC Telecom Contractors",
    "excavation_method": "Trenching",
    "utility_type": "Optical Fiber Microducts",
    "expected_traffic_diversion": "none",
    "risk_level": "low",
    "geom": {
      "type": "Polygon",
      "coordinates": [
        [
          [80.2458, 12.9815],
          [80.2468, 12.9825],
          [80.2475, 12.9808],
          [80.2462, 12.9798],
          [80.2458, 12.9815]
        ]
      ]
    },
    "length_m": 120.0,
    "width_m": 0.5,
    "area_sqm": 60.0,
    "created_at": datetime.now(),
    "updated_at": datetime.now()
  }
]

MOCK_ANALYSES: Dict[str, Dict[str, Any]] = {
  "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b33": {
    "id": uuid.UUID("b0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11"),
    "proposal_id": uuid.UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b33"),
    "compliance_report": {
      "compliant": False,
      "violations": ["VIOLATION: GCC Policy bans regular road-cuts during Northeast Monsoon (Oct 1 - Dec 31)."]
    },
    "duplicate_conflicts": {
      "conflict_detected": False,
      "conflicts": []
    },
    "coordination_opportunities": {
      "coordination_possible": True,
      "suggestions": [
        {
          "department": "electricity",
          "road_name": "Anna Salai (Mount Road)",
          "estimated_savings_percentage": 30.0,
          "rationale": "TNEB plans grid cabling in same sector. Joint scheduling prevents double paving costs."
        }
      ]
    },
    "weather_analysis": {
      "risk_level": "high",
      "description": "High precipitation risk. Northeast Monsoon overlaps excavation dates."
    },
    "traffic_analysis": {
      "disruption_level": "high",
      "congestion_coefficient_pct": 75,
      "suggested_hours": "11:00 PM - 05:00 AM"
    },
    "public_impact_score": 75,
    "risk_predicted": "high",
    "explanation": "AI Pipeline completed: Proposed excavation conflicts with Northeast monsoon ban restrictions. Traffic congestion on Anna Salai is projected to increase by 75%. Suggesting nighttime shifts (11 PM - 5 AM) and coordination with TNEB to save up to 30% budget.",
    "confidence_score": 92.5,
    "recommendation": "manual_review",
    "executed_at": datetime.now()
  },
  "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b44": {
    "id": uuid.UUID("b0eebc99-9c0b-4ef8-bb6d-6bb9bd380c22"),
    "proposal_id": uuid.UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b44"),
    "compliance_report": {
      "compliant": True,
      "violations": []
    },
    "duplicate_conflicts": {
      "conflict_detected": False,
      "conflicts": []
    },
    "coordination_opportunities": {
      "coordination_possible": False,
      "suggestions": []
    },
    "weather_analysis": {
      "risk_level": "low",
      "description": "Favorable dry weather conditions expected."
    },
    "traffic_analysis": {
      "disruption_level": "low",
      "congestion_coefficient_pct": 20,
      "suggested_hours": "Anytime"
    },
    "public_impact_score": 20,
    "risk_predicted": "low",
    "explanation": "AI Pipeline completed: No active conflicts, recent duplicates, or weather hazards detected. Normal trenching clearance recommended.",
    "confidence_score": 96.0,
    "recommendation": "approve",
    "executed_at": datetime.now()
  }
}

MOCK_POLICIES: List[Dict[str, Any]] = [
  {
    "id": uuid.UUID("c0eebc99-9c0b-4ef8-bb6d-6bb9bd380d11"),
    "file_name": "Greater_Chennai_Corporation_Road_Cut_SOP_2024.pdf",
    "file_path": "./storage/policies/GCC_SOP_2024.pdf",
    "version": "1.0",
    "uploaded_at": datetime.now(),
    "active": True
  },
  {
    "id": uuid.UUID("c0eebc99-9c0b-4ef8-bb6d-6bb9bd380d22"),
    "file_name": "Tamil_Nadu_Urban_Road_Excavation_Regulations_2023.pdf",
    "file_path": "./storage/policies/TN_Regulations_2023.pdf",
    "version": "2.1",
    "uploaded_at": datetime.now(),
    "active": True
  }
]
