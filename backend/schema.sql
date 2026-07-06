-- Enable PostGIS extension for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create Roles Enum or role checks
-- We will use strings with checks for easy integration with ORMs
-- Roles: 'admin', 'planner'
-- Departments: 'water', 'electricity', 'gas', 'telecom', 'admin'

-- 1. Users Table (synchronized with Supabase Auth users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY, -- matches auth.users.id from Supabase
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'planner')),
    department VARCHAR(100) NOT NULL CHECK (department IN ('water', 'electricity', 'gas', 'telecom', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Proposals Table (holds road excavation details and GeoJSON spatial geometries)
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    road_name VARCHAR(255) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled', 'revision')),
    department VARCHAR(100) NOT NULL CHECK (department IN ('water', 'electricity', 'gas', 'telecom')),
    contact_name VARCHAR(255) NOT NULL,
    contact_mobile VARCHAR(50) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    estimated_budget NUMERIC(15, 2) NOT NULL,
    contractor VARCHAR(255) NOT NULL,
    excavation_method VARCHAR(100) NOT NULL,
    utility_type VARCHAR(100) NOT NULL,
    expected_traffic_diversion VARCHAR(50) NOT NULL CHECK (expected_traffic_diversion IN ('none', 'minor', 'major', 'closed')),
    risk_level VARCHAR(50) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    geom GEOMETRY(Geometry, 4326) NOT NULL, -- Supports Point, Polyline, Polygon in EPSG:4326
    length_m NUMERIC(10, 2) NOT NULL,
    width_m NUMERIC(10, 2) NOT NULL,
    area_sqm NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial index on proposals geometry
CREATE INDEX IF NOT EXISTS proposals_geom_gist ON proposals USING gist (geom);

-- 3. Proposal Documents Table for attachments (PDF, DOCX, CAD drawings, etc.)
CREATE TABLE IF NOT EXISTS proposal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL, -- points to Supabase Storage bucket path
    file_type VARCHAR(100) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. AI Analysis Table for outputs from the 10 pipeline components
CREATE TABLE IF NOT EXISTS ai_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID UNIQUE NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    compliance_report JSONB NOT NULL, -- Road Cut Policy Compliance Agent
    duplicate_conflicts JSONB NOT NULL, -- Duplicate Excavation Detector
    coordination_opportunities JSONB NOT NULL, -- Department Coordination Agent
    weather_analysis JSONB NOT NULL, -- Weather Impact Agent
    traffic_analysis JSONB NOT NULL, -- Traffic Impact Agent
    public_impact_score INTEGER NOT NULL, -- Public Impact Score Agent (0-100)
    risk_predicted VARCHAR(50) NOT NULL CHECK (risk_predicted IN ('low', 'medium', 'high', 'critical')), -- AI Risk Prediction Agent
    explanation TEXT NOT NULL, -- Explainable AI Module
    confidence_score NUMERIC(5, 2) NOT NULL, -- Recommendation Confidence Score
    recommendation VARCHAR(50) NOT NULL CHECK (recommendation IN ('approve', 'approve_conditions', 'reject', 'manual_review')), -- Approval Recommendation Engine
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Audit Logs Table for digital tracing
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45) NOT NULL
);

-- 6. Policies Table for RAG knowledge documents
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    version VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE
);

-- 7. Notifications Table for real-time app events
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'status_change', 'new_proposal', 'conflict_detected'
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS proposals_status_idx ON proposals(status);
CREATE INDEX IF NOT EXISTS proposals_department_idx ON proposals(department);
CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications(user_id, read);

-- ==========================================
-- PREPOPULATED REAL DATA
-- ==========================================

-- Default Chennai Roads Reference List (For input validation)
CREATE TABLE IF NOT EXISTS chennai_roads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

INSERT INTO chennai_roads (name) VALUES 
('Anna Salai (Mount Road)'),
('Poonamallee High Road'),
('Rajiv Gandhi Salai (OMR)'),
('East Coast Road (ECR)'),
('Jawaharlal Nehru Road (100 Feet Road)'),
('Grand Southern Trunk Road (GST Road)'),
('Velachery Main Road'),
('Sardar Patel Road'),
('Arcot Road'),
('Dr. Radhakrishnan Salai'),
('Nungambakkam High Road'),
('MTH Road (Madras Thiruvallur High Road)'),
('Inner Ring Road'),
('G.N. Chetty Road'),
('Usman Road'),
('Cathedral Road'),
('Wallajah Road'),
('San Thome High Road'),
('Royapettah High Road'),
('Murasoli Maran Flyover Road');

-- Prepopulated real government road-cut policy metadata (default set)
INSERT INTO policies (id, file_name, file_path, version, active) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Greater_Chennai_Corporation_Road_Cut_SOP_2024.pdf', 'policies/GCC_SOP_2024.pdf', '1.0', TRUE),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Tamil_Nadu_Urban_Road_Excavation_Regulations_2023.pdf', 'policies/TN_Regulations_2023.pdf', '1.0', TRUE);
