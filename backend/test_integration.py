import requests
import sys

BASE_URL = "http://localhost:8000"

def get_headers(token: str):
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def test_integration():
    print("--- STARTING WORKFLOW INTEGRATION TESTS ---")
    
    # Check if server is running
    try:
        res = requests.get(BASE_URL)
        print(f"Server check: {res.status_code} - online")
    except Exception as e:
        print(f"Error: Backend server is not running on {BASE_URL}. Run it first to perform testing: {e}")
        sys.exit(1)

    # 1. TEST: Invalid Road Name Validation
    print("\n1. Testing Road Name Validation...")
    payload_invalid_road = {
        "road_name": "Fake Nonexistent Street",
        "purpose": "Water Pipeline Leak Repair",
        "description": "Repairing a broken water main pipeline under the pavement.",
        "start_date": "2026-08-01",
        "end_date": "2026-08-05",
        "priority": "medium",
        "contact_name": "Rajesh Kumar",
        "contact_mobile": "9876543210",
        "contact_email": "rajesh@cmwssb.gov.in",
        "estimated_budget": 50000,
        "contractor": "Chennai Construction Ltd",
        "excavation_method": "Trenching",
        "utility_type": "Water Main",
        "expected_traffic_diversion": "minor",
        "risk_level": "medium",
        "geom": {
            "type": "LineString",
            "coordinates": [[80.2707, 13.0827], [80.2717, 13.0837]]
        },
        "length_m": 120.0,
        "width_m": 0.8,
        "area_sqm": 96.0
    }
    
    res = requests.post(
        f"{BASE_URL}/api/proposals",
        json=payload_invalid_road,
        headers=get_headers("mock-token-water")
    )
    print(f"Submit invalid road (expect 400): {res.status_code}")
    assert res.status_code == 400
    print("  -> Details:", res.json().get("detail"))

    # 2. TEST: Submit valid proposal
    print("\n2. Submitting a valid Water Board proposal...")
    payload_valid = payload_invalid_road.copy()
    payload_valid["road_name"] = "Inner Ring Road" # A valid road from reference table
    
    res = requests.post(
        f"{BASE_URL}/api/proposals",
        json=payload_valid,
        headers=get_headers("mock-token-water")
    )
    print(f"Submit valid road (expect 201): {res.status_code}")
    assert res.status_code == 201
    proposal = res.json()
    proposal_id = proposal["id"]
    print(f"  -> Created proposal ID: {proposal_id} | Status: {proposal['status']}")

    # 3. TEST: Planner Edit Restrictions on Pending Status
    print("\n3. Testing Planner Edit Restrictions on Pending Proposal...")
    res = requests.put(
        f"{BASE_URL}/api/proposals/{proposal_id}",
        json=payload_valid,
        headers=get_headers("mock-token-water")
    )
    print(f"Edit pending proposal as Planner (expect 403): {res.status_code}")
    assert res.status_code == 403
    print("  -> Details:", res.json().get("detail"))

    # 4. TEST: Admin updates status to Revision
    print("\n4. Changing status to Revision via Admin...")
    res = requests.post(
        f"{BASE_URL}/api/admin/proposals/{proposal_id}/decision",
        json={"status": "revision", "remarks": "Fix timeline to avoid Northeast Monsoon."},
        headers=get_headers("mock-token-admin")
    )
    print(f"Set status to revision as Admin (expect 200): {res.status_code}")
    assert res.status_code == 200

    # 5. TEST: Planner from same department (Water) edits proposal
    print("\n5. Editing Revision proposal as correct Planner...")
    payload_edited = payload_valid.copy()
    payload_edited["purpose"] = "Water Pipeline Leak Repair - APPROVED REVISION"
    
    res = requests.put(
        f"{BASE_URL}/api/proposals/{proposal_id}",
        json=payload_edited,
        headers=get_headers("mock-token-water")
    )
    print(f"Edit revision proposal as same Planner (expect 200): {res.status_code}")
    assert res.status_code == 200
    updated_prop = res.json()
    print(f"  -> Updated Purpose: {updated_prop['purpose']} | Reset Status: {updated_prop['status']}")

    # 6. TEST: Planner from different department (Electricity) tries to edit proposal
    print("\n6. Testing Planner edits another department's proposal...")
    # Admin resets status back to revision to allow testing edits again
    requests.post(
        f"{BASE_URL}/api/admin/proposals/{proposal_id}/decision",
        json={"status": "revision", "remarks": "Needs revision loop 2."},
        headers=get_headers("mock-token-admin")
    )
    
    res = requests.put(
        f"{BASE_URL}/api/proposals/{proposal_id}",
        json=payload_edited,
        headers=get_headers("mock-token-electricity")
    )
    print(f"Edit revision proposal as different Planner (expect 403): {res.status_code}")
    assert res.status_code == 403
    print("  -> Details:", res.json().get("detail"))

    # 7. TEST: Planner Delete Restrictions on non-rejected status
    print("\n7. Testing Planner Delete Restrictions on non-rejected Proposal...")
    res = requests.delete(
        f"{BASE_URL}/api/proposals/{proposal_id}",
        headers=get_headers("mock-token-water")
    )
    print(f"Delete non-rejected proposal as Planner (expect 403): {res.status_code}")
    assert res.status_code == 403
    print("  -> Details:", res.json().get("detail"))

    # 8. TEST: Admin updates status to Rejected
    print("\n8. Changing status to Rejected via Admin...")
    res = requests.post(
        f"{BASE_URL}/api/admin/proposals/{proposal_id}/decision",
        json={"status": "rejected", "remarks": "Project completely overlaps with major Metro Rail works."},
        headers=get_headers("mock-token-admin")
    )
    print(f"Set status to rejected as Admin (expect 200): {res.status_code}")
    assert res.status_code == 200

    # 9. TEST: Planner from different department tries to delete proposal
    print("\n9. Testing different Planner deleting proposal...")
    res = requests.delete(
        f"{BASE_URL}/api/proposals/{proposal_id}",
        headers=get_headers("mock-token-electricity")
    )
    print(f"Delete rejected proposal as different Planner (expect 403): {res.status_code}")
    assert res.status_code == 403
    print("  -> Details:", res.json().get("detail"))

    # 10. TEST: Planner from same department (Water) deletes rejected proposal
    print("\n10. Deleting Rejected proposal as correct Planner...")
    res = requests.delete(
        f"{BASE_URL}/api/proposals/{proposal_id}",
        headers=get_headers("mock-token-water")
    )
    print(f"Delete rejected proposal as same Planner (expect 204): {res.status_code}")
    assert res.status_code == 204

    # 11. Verify proposal is deleted
    res = requests.get(
        f"{BASE_URL}/api/proposals/{proposal_id}",
        headers=get_headers("mock-token-admin")
    )
    print(f"Verify proposal is removed (expect 404): {res.status_code}")
    assert res.status_code == 404

    print("\n--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ---")

if __name__ == "__main__":
    test_integration()
