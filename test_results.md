# Integration Test Results Mapping

This document maps the automated integration test execution run to formal test cases, verifying the Role-Based Access Control (RBAC), data validations, and lifecycle operations implemented for the Greater Chennai Corporation (GCC) Road Excavation Coordination & Planning Platform.

---

## 1. Test Environment Summary
- **Execution Date:** July 7, 2026
- **Target Backend URL:** `http://localhost:8000`
- **Target Database Engine:** PostgreSQL 15 + PostGIS Spatial Engine
- **Auth Mode:** Suppressed via Development Auth Bypass (`mock-token-*`)

---

## 2. Test Execution Mapping Matrix

| Test ID | Test Name | Request Method / Path | Authentication Mock | Expected Status | Actual Status | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Road Name Registry Validation | `POST /api/proposals` | Water Planner | `400 Bad Request` | `400 Bad Request` | **PASSED** |
| **TC-02** | Valid Permit Submission | `POST /api/proposals` | Water Planner | `201 Created` | `201 Created` | **PASSED** |
| **TC-03** | Edit Restriction on Pending Proposal | `PUT /api/proposals/{id}` | Water Planner | `403 Forbidden` | `403 Forbidden` | **PASSED** |
| **TC-04** | Admin Status Transition to Revision | `POST /api/admin/proposals/{id}/decision` | Super Admin | `200 OK` | `200 OK` | **PASSED** |
| **TC-05** | Authorized Owner Planner Resubmission | `PUT /api/proposals/{id}` | Water Planner | `200 OK` | `200 OK` | **PASSED** |
| **TC-06** | Unauthorized Cross-Dept Planner Edit | `PUT /api/proposals/{id}` | Electricity Planner | `403 Forbidden` | `403 Forbidden` | **PASSED** |
| **TC-07** | Delete Restriction on Non-Rejected Proposal | `DELETE /api/proposals/{id}` | Water Planner | `403 Forbidden` | `403 Forbidden` | **PASSED** |
| **TC-08** | Admin Status Transition to Rejected | `POST /api/admin/proposals/{id}/decision` | Super Admin | `200 OK` | `200 OK` | **PASSED** |
| **TC-09** | Unauthorized Cross-Dept Planner Delete | `DELETE /api/proposals/{id}` | Electricity Planner | `403 Forbidden` | `403 Forbidden` | **PASSED** |
| **TC-10** | Authorized Owner Planner Deletion | `DELETE /api/proposals/{id}` | Water Planner | `204 No Content` | `204 No Content` | **PASSED** |
| **TC-11** | Post-Deletion Retrieval Verification | `GET /api/proposals/{id}` | Super Admin | `404 Not Found` | `404 Not Found` | **PASSED** |

---

## 3. Detailed Test Case Specifications

### TC-01: Road Name Registry Validation
- **Goal:** Verify that permit requests targeting road names not pre-registered in the Chennai Municipal GIS database are blocked.
- **Request Details:**
  - **Method:** `POST`
  - **Path:** `/api/proposals`
  - **Header:** `Authorization: Bearer mock-token-water`
  - **Key Payload Parameter:** `"road_name": "Fake Nonexistent Street"`
- **Response Validation:**
  - **HTTP Status:** `400 Bad Request`
  - **Assertion:** Returns detail warning `Invalid Road Name: 'Fake Nonexistent Street'. Must select a valid Chennai road.`

### TC-02: Valid Permit Submission
- **Goal:** Verify that permit requests targeting valid Chennai road names are correctly registered, PostGIS spatial geometries are parsed, and audit log records are written.
- **Request Details:**
  - **Method:** `POST`
  - **Path:** `/api/proposals`
  - **Header:** `Authorization: Bearer mock-token-water`
  - **Key Payload Parameter:** `"road_name": "Inner Ring Road"`, `"geom": {"type": "LineString", "coordinates": [[80.2707, 13.0827], [80.2717, 13.0837]]}`
- **Response Validation:**
  - **HTTP Status:** `201 Created`
  - **Assertion:** Database row is committed with `status="pending"`.

### TC-03: Edit Restriction on Pending Proposal
- **Goal:** Enforce that planners cannot modify metadata or geometries of a permit request while it is actively awaiting administrative review.
- **Request Details:**
  - **Method:** `PUT`
  - **Path:** `/api/proposals/{id}`
  - **Header:** `Authorization: Bearer mock-token-water`
- **Response Validation:**
  - **HTTP Status:** `403 Forbidden`
  - **Assertion:** Returns detail error `Forbidden: Planners can only update proposals marked for revision.`

### TC-04: Admin Status Transition to Revision
- **Goal:** Verify that administrators can issue revision requests with comments, notifying the planner.
- **Request Details:**
  - **Method:** `POST`
  - **Path:** `/api/admin/proposals/{id}/decision`
  - **Header:** `Authorization: Bearer mock-token-admin`
  - **Payload:** `{"status": "revision", "remarks": "Fix timeline to avoid Northeast Monsoon."}`
- **Response Validation:**
  - **HTTP Status:** `200 OK`
  - **Assertion:** DB updates proposal status to `"revision"` and logs the administrative action.

### TC-05: Authorized Owner Planner Resubmission
- **Goal:** Verify that planners can edit and resubmit proposals marked for revision.
- **Request Details:**
  - **Method:** `PUT`
  - **Path:** `/api/proposals/{id}`
  - **Header:** `Authorization: Bearer mock-token-water`
  - **Payload:** Updated proposal data with `"purpose": "Water Pipeline Leak Repair - APPROVED REVISION"`
- **Response Validation:**
  - **HTTP Status:** `200 OK`
  - **Assertion:** Proposal status resets back to `"pending"` and a new AI scan begins.

### TC-06: Unauthorized Cross-Dept Planner Edit
- **Goal:** Enforce that planners from other departments cannot hijack or edit revision-marked proposals.
- **Request Details:**
  - **Method:** `PUT`
  - **Path:** `/api/proposals/{id}`
  - **Header:** `Authorization: Bearer mock-token-electricity`
- **Response Validation:**
  - **HTTP Status:** `403 Forbidden`
  - **Assertion:** Blocks the request and returns `Forbidden: Planners can only update proposals matching their department.`

### TC-07: Delete Restriction on Non-Rejected Proposal
- **Goal:** Enforce that planners cannot delete a proposal if it is in pending, approved, or revision status.
- **Request Details:**
  - **Method:** `DELETE`
  - **Path:** `/api/proposals/{id}`
  - **Header:** `Authorization: Bearer mock-token-water`
- **Response Validation:**
  - **HTTP Status:** `403 Forbidden`
  - **Assertion:** Blocks deletion and returns `Forbidden: Planners can only delete proposals that are rejected.`

### TC-08: Admin Status Transition to Rejected
- **Goal:** Verify that administrators can reject proposals.
- **Request Details:**
  - **Method:** `POST`
  - **Path:** `/api/admin/proposals/{id}/decision`
  - **Header:** `Authorization: Bearer mock-token-admin`
  - **Payload:** `{"status": "rejected", "remarks": "Project completely overlaps with major Metro Rail works."}`
- **Response Validation:**
  - **HTTP Status:** `200 OK`
  - **Assertion:** DB updates proposal status to `"rejected"`.

### TC-09: Unauthorized Cross-Dept Planner Delete
- **Goal:** Enforce that planners cannot delete proposals belonging to other departments.
- **Request Details:**
  - **Method:** `DELETE`
  - **Path:** `/api/proposals/{id}`
  - **Header:** `Authorization: Bearer mock-token-electricity`
- **Response Validation:**
  - **HTTP Status:** `403 Forbidden`
  - **Assertion:** Blocks deletion and returns `Forbidden: Planners can only delete proposals matching their department.`

### TC-10: Authorized Owner Planner Deletion
- **Goal:** Verify that planners can delete proposals belonging to their department if the status is `"rejected"`.
- **Request Details:**
  - **Method:** `DELETE`
  - **Path:** `/api/proposals/{id}`
  - **Header:** `Authorization: Bearer mock-token-water`
- **Response Validation:**
  - **HTTP Status:** `204 No Content`
  - **Assertion:** Deletes the row from Postgres.

### TC-11: Post-Deletion Retrieval Verification
- **Goal:** Verify that the deleted proposal is no longer queryable.
- **Request Details:**
  - **Method:** `GET`
  - **Path:** `/api/proposals/{id}`
  - **Header:** `Authorization: Bearer mock-token-admin`
- **Response Validation:**
  - **HTTP Status:** `404 Not Found`
  - **Assertion:** Confirms successful purge from DB.
