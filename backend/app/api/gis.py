import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, text
from app.core.database import get_db
from app.core.security import require_any_user
from app.models.user import User
from app.models.proposal import Proposal
from typing import Dict, Any, List, Optional

router = APIRouter(tags=["GIS Data Layer"])

@router.get("/geojson", response_model=Dict[str, Any])
async def get_proposals_geojson(
    status_filter: Optional[str] = None,
    department_filter: Optional[str] = None,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve all excavation proposals formatted as a standard GeoJSON FeatureCollection.
    Useful for rendering directly in Leaflet.js map layers.
    """
    # Build dynamic query conditions
    query = select(
        Proposal.id,
        Proposal.road_name,
        Proposal.department,
        Proposal.status,
        Proposal.priority,
        Proposal.purpose,
        func.ST_AsGeoJSON(Proposal.geom).label("geojson")
    )
    
    conditions = []
    if status_filter:
        conditions.append(Proposal.status == status_filter)
    if department_filter:
        conditions.append(Proposal.department == department_filter)
        
    if conditions:
        from sqlalchemy import and_
        query = query.where(and_(*conditions))
        
    result = await db.execute(query)
    rows = result.all()

    features = []
    for row in rows:
        if row.geojson:
            geom_dict = json.loads(row.geojson)
            features.append({
                "type": "Feature",
                "geometry": geom_dict,
                "properties": {
                    "id": str(row.id),
                    "road_name": row.road_name,
                    "department": row.department,
                    "status": row.status,
                    "priority": row.priority,
                    "purpose": row.purpose
                }
            })

    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.get("/analytics", response_model=Dict[str, Any])
async def get_gis_analytics(
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns aggregated heatmaps coordinates (centroids) and spatial clustering details.
    """
    # 1. Fetch project centroids for heatmap plots
    centroid_query = text("""
        SELECT id, road_name, status, department, ST_AsGeoJSON(ST_Centroid(geom)) as centroid
        FROM proposals
        WHERE status IN ('pending', 'approved', 'completed')
    """)
    result = await db.execute(centroid_query)
    rows = result.fetchall()

    heatmap_points = []
    for row in rows:
        if row.centroid:
            geom = json.loads(row.centroid)
            coords = geom.get("coordinates", [0, 0])
            heatmap_points.append({
                "id": str(row.id),
                "lat": coords[1],
                "lng": coords[0],
                "road_name": row.road_name,
                "department": row.department,
                "status": row.status
            })

    # 2. Count overlaps using PostGIS spatial intersection
    overlap_query = text("""
        SELECT COUNT(*) 
        FROM proposals p1, proposals p2 
        WHERE p1.id < p2.id 
          AND ST_Overlaps(p1.geom, p2.geom) 
          AND p1.status != 'completed' 
          AND p2.status != 'completed'
    """)
    overlap_result = await db.execute(overlap_query)
    overlapping_count = overlap_result.scalar() or 0

    return {
        "heatmap": heatmap_points,
        "overlapping_conflicts_count": overlapping_count
    }
