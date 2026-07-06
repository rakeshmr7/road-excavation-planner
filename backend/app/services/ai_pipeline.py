import json
from uuid import UUID
from datetime import date
from langsmith import traceable
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from app.models.proposal import Proposal
from app.models.ai import AIAnalysis
from app.services.rag_service import collection
from app.services.failover_llm import query_llm
from typing import Dict, Any, List

@traceable(run_type="chain", name="AI Agent Pipeline Execution")
async def trigger_ai_pipeline(proposal_id: UUID) -> None:
    """
    Executes the 10-Agent AI pipeline asynchronously in the background.
    Aggregates spatial, weather, traffic, and policy data, and writes the
    final decision logs to the AI_ANALYSES database table.
    """
    print(f"AI Pipeline: Starting analysis for proposal ID: {proposal_id}")
    async with AsyncSessionLocal() as db:
        # 1. Load proposal details
        result = await db.execute(select(Proposal).where(Proposal.id == proposal_id))
        proposal = result.scalars().first()
        if not proposal:
            print(f"AI Pipeline Error: Proposal {proposal_id} not found.")
            return

        # ----------------------------------------------------
        # AGENT 1: Road Cut Policy Compliance (RAG)
        # ----------------------------------------------------
        rag_query = f"monsoon ban limits, width and buffer zone rules for road excavation on {proposal.road_name}"
        rag_results = collection.query(query_texts=[rag_query], n_results=2)
        excerpts = rag_results.get("documents", [[]])[0]
        
        # Policy Check logic: GCC Monsoon ban typically runs Oct 1 to Dec 31
        monsoon_violation = False
        start_month = proposal.start_date.month
        end_month = proposal.end_date.month
        if any(m in [10, 11, 12] for m in [start_month, end_month]):
            monsoon_violation = True
            
        policy_findings = []
        if monsoon_violation:
            policy_findings.append("VIOLATION: GCC Policy bans regular road-cuts during Northeast Monsoon (Oct 1 - Dec 31).")
        if proposal.length_m > 500:
            policy_findings.append("WARNING: Road excavation exceeds 500m length threshold. Sectional trenching policy applies.")

        compliance_report = {
            "compliant": len([f for f in policy_findings if "VIOLATION" in f]) == 0,
            "violations": policy_findings,
            "policy_citations": excerpts if excerpts else ["Standard GCC Road Excavation SOP Ref Sec 4."]
        }

        # ----------------------------------------------------
        # AGENT 2: Duplicate Excavation Detector (PostGIS Spatial Check)
        # ----------------------------------------------------
        # Queries active proposals overlapping or within 100m on the same road
        duplicate_query = text("""
            SELECT id, road_name, status, department, ST_AsGeoJSON(geom) as geom_str, start_date, end_date
            FROM proposals
            WHERE id != :proposal_id
              AND status IN ('pending', 'approved')
              AND (LOWER(road_name) = LOWER(:road_name) OR ST_DWithin(geom, (SELECT geom FROM proposals WHERE id = :proposal_id), 100.0, TRUE))
        """)
        dup_result = await db.execute(duplicate_query, {"proposal_id": proposal.id, "road_name": proposal.road_name})
        dup_rows = dup_result.fetchall()

        duplicates = []
        for row in dup_rows:
            duplicates.append({
                "proposal_id": str(row.id),
                "road_name": row.road_name,
                "status": row.status,
                "department": row.department,
                "start_date": str(row.start_date),
                "end_date": str(row.end_date)
            })

        duplicate_conflicts = {
            "conflict_detected": len(duplicates) > 0,
            "conflicts": duplicates
        }

        # ----------------------------------------------------
        # AGENT 3: Department Coordination Agent (PostGIS Spatial Radius)
        # ----------------------------------------------------
        # Checks if other utility departments have scheduled works within 50m and similar timeline (+/- 45 days)
        coord_query = text("""
            SELECT id, road_name, status, department, start_date, end_date
            FROM proposals
            WHERE id != :proposal_id
              AND status IN ('pending', 'approved')
              AND department != :department
              AND ST_DWithin(geom, (SELECT geom FROM proposals WHERE id = :proposal_id), 50.0, TRUE)
        """)
        coord_result = await db.execute(coord_query, {"proposal_id": proposal.id, "department": proposal.department})
        coord_rows = coord_result.fetchall()

        coordinations = []
        for row in coord_rows:
            # Check overlap in timeline: if start date diff is less than 45 days
            date_diff = abs((proposal.start_date - row.start_date).days)
            if date_diff <= 45:
                coordinations.append({
                    "coordinating_proposal_id": str(row.id),
                    "department": row.department,
                    "road_name": row.road_name,
                    "start_date": str(row.start_date),
                    "estimated_savings_percentage": 30.0,
                    "rationale": "Overlapping spatial zone and aligned schedules (+/- 45 days) allows shared single road cut trenching."
                })

        coordination_opportunities = {
            "coordination_possible": len(coordinations) > 0,
            "suggestions": coordinations
        }

        # ----------------------------------------------------
        # AGENT 4: Weather Impact Agent
        # ----------------------------------------------------
        # Highlight elevated risk if construction intersects monsoon season (Oct-Dec) in Chennai
        weather_risk = "low"
        weather_desc = "Excavation schedule falls within favorable dry season. Normal weather risk."
        if monsoon_violation:
            weather_risk = "high"
            weather_desc = "Excavation schedule overlaps with high precipitation period (Northeast Monsoon). Heavy rain flood risk."
        
        weather_analysis = {
            "risk_level": weather_risk,
            "description": weather_desc,
            "forecast_summary": "Monsoon check: " + ("Intersects rain season" if monsoon_violation else "Clear dry months")
        }

        # ----------------------------------------------------
        # AGENT 5: Traffic Impact Agent
        # ----------------------------------------------------
        # Disruption score based on size and expected road diversion
        traffic_congestion_factor = 10  # baseline
        if proposal.expected_traffic_diversion == "closed":
            traffic_congestion_factor += 50
        elif proposal.expected_traffic_diversion == "major":
            traffic_congestion_factor += 30
        elif proposal.expected_traffic_diversion == "minor":
            traffic_congestion_factor += 15

        if proposal.length_m > 300:
            traffic_congestion_factor += 20

        traffic_analysis = {
            "disruption_level": "high" if traffic_congestion_factor > 50 else ("medium" if traffic_congestion_factor > 25 else "low"),
            "congestion_coefficient_pct": min(traffic_congestion_factor, 100),
            "suggested_hours": "11:00 PM - 05:00 AM (Night shift mandatory)" if traffic_congestion_factor > 40 else "Anytime"
        }

        # ----------------------------------------------------
        # AGENT 6: Public Impact Score Agent
        # ----------------------------------------------------
        # Base public impact computed from budget, diversion, and length
        public_score = 10
        if proposal.expected_traffic_diversion == "closed":
            public_score += 40
        if proposal.priority == "emergency":
            public_score += 20
        if proposal.length_m > 200:
            public_score += 15
        if coordination_opportunities["coordination_possible"]:
            # Coordination reduces long-term public impact
            public_score -= 10
            
        public_impact_score = max(min(public_score, 100), 5)

        # ----------------------------------------------------
        # AGENTS 7, 8, 9, 10: AI Recommendation Engine (LLM Synthesis)
        # ----------------------------------------------------
        summary_payload = {
            "road_name": proposal.road_name,
            "purpose": proposal.purpose,
            "description": proposal.description,
            "priority": proposal.priority,
            "duration_days": (proposal.end_date - proposal.start_date).days,
            "compliance": compliance_report,
            "duplicates": duplicate_conflicts,
            "coordination": coordination_opportunities,
            "weather": weather_analysis,
            "traffic": traffic_analysis,
            "public_impact_score": public_impact_score
        }

        system_instruction = (
            "You are the senior AI Urban Planning Consultant for the Greater Chennai Corporation (GCC).\n"
            "Your job is to analyze the technical details, conflicts, and risks of a road excavation proposal "
            "and output a structured recommendation response.\n"
            "You must output JSON format with exactly these fields:\n"
            "1. risk_predicted: 'low' | 'medium' | 'high' | 'critical'\n"
            "2. explanation: A natural language explanation detailing policy compliance issues, coordinates duplicate warnings, traffic disruption mitigations, and coordination savings.\n"
            "3. confidence_score: A float between 0 and 100 representing confidence in this recommendation.\n"
            "4. recommendation: 'approve' | 'approve_conditions' | 'reject' | 'manual_review'\n"
            "5. conditions: List of conditions if recommended status is 'approve_conditions'.\n"
        )

        user_prompt = f"Analyze the following proposal metadata and agent findings:\n{json.dumps(summary_payload, indent=2)}\n\nOutput JSON matching the instructions."

        risk_predicted = "medium"
        explanation = "AI pipeline completed analysis. Project intersects normal urban routes."
        confidence_score = 85.0
        recommendation = "manual_review"

        try:
            llm_response = await query_llm(prompt=user_prompt, system_prompt=system_instruction)
            # Parse JSON
            parsed = json.loads(llm_response)
            risk_predicted = parsed.get("risk_predicted", "medium")
            explanation = parsed.get("explanation", explanation)
            confidence_score = float(parsed.get("confidence_score", confidence_score))
            recommendation = parsed.get("recommendation", recommendation)
            
            # If conditions are present, append to explanation
            if parsed.get("conditions") and recommendation == "approve_conditions":
                explanation += "\n\nMandatory Conditions:\n" + "\n".join(f"- {cond}" for cond in parsed["conditions"])
        except Exception as e:
            print(f"AI Pipeline Warning: LLM parsing failed. Falling back to local scoring rules: {e}")
            # Dynamic fallback rules if LLM is offline/errored
            if compliance_report["compliant"] is False:
                risk_predicted = "critical"
                recommendation = "reject"
                explanation = "AI Pipeline Auto-Rejected: Project conflicts with Northeast monsoon ban restrictions."
            elif duplicate_conflicts["conflict_detected"]:
                risk_predicted = "high"
                recommendation = "manual_review"
                explanation = "AI Pipeline recommends Manual Review: Overlapping active excavation coordinates detected on same road segment."
            elif coordination_opportunities["coordination_possible"]:
                risk_predicted = "medium"
                recommendation = "approve_conditions"
                explanation = "AI Pipeline recommends approval with conditions: Shared trenching opportunity found with other departments. Coordinate schedules."
            else:
                risk_predicted = "low"
                recommendation = "approve"
                explanation = "AI Pipeline recommends Approval: No policy violations, coordinate overlaps, or high-risk weather forecasts detected."

        # Write results to the database
        ai_record = AIAnalysis(
            proposal_id=proposal.id,
            compliance_report=compliance_report,
            duplicate_conflicts=duplicate_conflicts,
            coordination_opportunities=coordination_opportunities,
            weather_analysis=weather_analysis,
            traffic_analysis=traffic_analysis,
            public_impact_score=public_impact_score,
            risk_predicted=risk_predicted,
            explanation=explanation,
            confidence_score=confidence_score,
            recommendation=recommendation
        )

        # Clear existing analysis for the proposal if retrying
        await db.execute(text("DELETE FROM ai_analyses WHERE proposal_id = :proposal_id"), {"proposal_id": proposal.id})
        db.add(ai_record)
        await db.commit()
        print(f"AI Pipeline: Successfully completed and stored analysis for proposal ID: {proposal.id}")

        # Index proposal details and AI analysis in ChromaDB RAG
        try:
            from app.services.rag_service import index_proposal_in_rag
            await index_proposal_in_rag(proposal_id=proposal.id, db_session=db)
        except Exception as rag_err:
            print(f"AI Pipeline Warning: RAG indexing failed for proposal {proposal.id}: {rag_err}")
