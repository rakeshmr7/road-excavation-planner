"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";

// Leaflet default marker icon fix
const fixLeafletIcon = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
};

interface MapComponentProps {
  isEditable?: boolean;
  proposals?: any[];
  onShapeDrawn?: (geometry: any, length: number, area: number) => void;
  selectedProposalId?: string | null;
  drawType?: "point" | "polyline" | "polygon";
}

export default function MapComponent({
  isEditable = false,
  proposals = [],
  onShapeDrawn,
  selectedProposalId = null,
  drawType = "polygon",
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const drawLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const overlaysLayerGroupRef = useRef<L.LayerGroup | null>(null);
  
  // Custom drawing nodes
  const [clickPoints, setClickPoints] = useState<L.LatLng[]>([]);

  useEffect(() => {
    fixLeafletIcon();

    if (!mapContainerRef.current || mapRef.current) return;

    // Center on Chennai: [13.0827, 80.2707]
    const map = L.map(mapContainerRef.current).setView([13.0827, 80.2707], 12);
    mapRef.current = map;

    // Load OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Initialize layer groups
    drawLayerGroupRef.current = L.layerGroup().addTo(map);
    overlaysLayerGroupRef.current = L.layerGroup().addTo(map);

    // Click handler for custom drawing
    if (isEditable) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        setClickPoints((prev) => {
          const newPoints = [...prev, e.latlng];
          return newPoints;
        });
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isEditable]);

  // Keep callback reference updated to avoid infinite loops
  const onShapeDrawnRef = useRef(onShapeDrawn);
  useEffect(() => {
    onShapeDrawnRef.current = onShapeDrawn;
  }, [onShapeDrawn]);

  // Update drawing shapes whenever clicked nodes change
  useEffect(() => {
    if (!isEditable || !drawLayerGroupRef.current || !mapRef.current) return;

    // Clear previous drawing
    drawLayerGroupRef.current.clearLayers();

    if (clickPoints.length === 0) return;

    // Render individual nodes (markers)
    clickPoints.forEach((pt, idx) => {
      const marker = L.circleMarker(pt, {
        radius: 6,
        color: "#1e3a8a",
        fillColor: "#60a5fa",
        fillOpacity: 1,
      }).addTo(drawLayerGroupRef.current!);
      
      marker.bindTooltip(`Node ${idx + 1}`, { permanent: false, direction: "top" });
    });

    // Calculate length, area, and construct GeoJSON
    let geom: any = null;
    let length = 0;
    let area = 0;

    if (drawType === "point" && clickPoints.length > 0) {
      const pt = clickPoints[0];
      geom = {
        type: "Point",
        coordinates: [pt.lng, pt.lat],
      };
      // Length and area for a single point is 0
      length = 0;
      area = 0;
    } else if (drawType === "polyline" && clickPoints.length > 1) {
      // Render polyline path
      const polyline = L.polyline(clickPoints, {
        color: "#2563eb",
        weight: 4,
        dashArray: "5, 5",
      }).addTo(drawLayerGroupRef.current);

      geom = {
        type: "LineString",
        coordinates: clickPoints.map((p) => [p.lng, p.lat]),
      };

      // Sum segment distances
      for (let i = 0; i < clickPoints.length - 1; i++) {
        length += clickPoints[i].distanceTo(clickPoints[i + 1]);
      }
      area = 0;
    } else if (drawType === "polygon" && clickPoints.length > 2) {
      // Render polygon shape
      const polygon = L.polygon(clickPoints, {
        color: "#1e3a8a",
        fillColor: "#3b82f6",
        fillOpacity: 0.35,
        weight: 3,
      }).addTo(drawLayerGroupRef.current);

      geom = {
        type: "Polygon",
        coordinates: [[...clickPoints.map((p) => [p.lng, p.lat]), [clickPoints[0].lng, clickPoints[0].lat]]],
      };

      // Sum perimeter segments for approximate length of work
      for (let i = 0; i < clickPoints.length; i++) {
        const nextIdx = (i + 1) % clickPoints.length;
        length += clickPoints[i].distanceTo(clickPoints[nextIdx]);
      }

      // Compute area using Spherical Area helper formula
      area = calculatePolygonArea(clickPoints);
    }

    if (geom && onShapeDrawnRef.current) {
      // Round to 2 decimal places
      onShapeDrawnRef.current(geom, Math.round(length * 100) / 100, Math.round(area * 100) / 100);
    }
  }, [clickPoints, isEditable, drawType]);

  // Render existing project overlays on map
  useEffect(() => {
    if (!overlaysLayerGroupRef.current || !mapRef.current) return;

    overlaysLayerGroupRef.current.clearLayers();

    proposals.forEach((prop) => {
      if (!prop.geom) return;

      const geom = prop.geom;
      let statusColor = "#eab308"; // pending -> yellow
      if (prop.status === "approved") statusColor = "#3b82f6"; // approved -> blue
      if (prop.status === "completed") statusColor = "#22c55e"; // completed -> green
      if (prop.status === "rejected") statusColor = "#ef4444"; // rejected -> red
      if (prop.status === "revision") statusColor = "#a855f7"; // revision -> purple

      // Highlight selected project on map
      const isSelected = selectedProposalId === prop.id;
      const weight = isSelected ? 6 : 2;
      const fillOpacity = isSelected ? 0.6 : 0.25;

      let leafletLayer: any = null;

      if (geom.type === "Point") {
        leafletLayer = L.circleMarker([geom.coordinates[1], geom.coordinates[0]], {
          radius: isSelected ? 12 : 8,
          color: statusColor,
          fillColor: statusColor,
          fillOpacity: 0.8,
          weight: 2,
        });
      } else if (geom.type === "LineString") {
        const latlngs = geom.coordinates.map((c: any) => [c[1], c[0]]);
        leafletLayer = L.polyline(latlngs, {
          color: statusColor,
          weight: weight,
        });
      } else if (geom.type === "Polygon") {
        const latlngs = geom.coordinates[0].map((c: any) => [c[1], c[0]]);
        leafletLayer = L.polygon(latlngs, {
          color: statusColor,
          fillColor: statusColor,
          fillOpacity: fillOpacity,
          weight: weight,
        });
      }

      if (leafletLayer) {
        leafletLayer.addTo(overlaysLayerGroupRef.current!);
        
        // Tooltip description
        leafletLayer.bindTooltip(
          `<strong>${prop.road_name}</strong><br>Dept: ${prop.department.toUpperCase()}<br>Status: ${prop.status.toUpperCase()}`,
          { direction: "top", sticky: true }
        );

        if (isSelected) {
          // Pan map to highlight selected geometry
          if (geom.type === "Point") {
            mapRef.current?.setView([geom.coordinates[1], geom.coordinates[0]], 14);
          } else {
            const bounds = leafletLayer.getBounds();
            mapRef.current?.fitBounds(bounds, { padding: [50, 50] });
          }
        }
      }
    });
  }, [proposals, selectedProposalId]);

  // Polygon area calculation in square meters (spherical earth approximation)
  const calculatePolygonArea = (latlngs: L.LatLng[]): number => {
    const radius = 6378137; // Earth radius in meters
    let total = 0;
    const len = latlngs.length;

    if (len < 3) return 0;

    for (let i = 0; i < len; i++) {
      const p1 = latlngs[i];
      const p2 = latlngs[(i + 1) % len];

      // Convert coordinates to radians
      const lat1 = (p1.lat * Math.PI) / 180;
      const lat2 = (p2.lat * Math.PI) / 180;
      const lon1 = (p1.lng * Math.PI) / 180;
      const lon2 = (p2.lng * Math.PI) / 180;

      total += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }

    return Math.abs((total * radius * radius) / 2);
  };

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={mapContainerRef} className="w-full h-full rounded-lg border shadow-sm min-h-[400px]" />
      
      {isEditable && (
        <div className="absolute top-2 right-2 z-[1000] bg-white/95 px-2.5 py-1.5 rounded-lg border shadow-md flex items-center gap-3 text-[10px] font-sans">
          <div className="font-bold text-slate-800 border-r pr-2 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
            <span>Draw Mode</span>
          </div>
          
          <div className="text-slate-600 font-semibold">
            Plotted Nodes: <strong className="text-blue-900">{clickPoints.length}</strong>
          </div>
          
          <div className="flex items-center gap-1.5 pl-1.5 border-l">
            {clickPoints.length > 0 && (
              <button
                type="button"
                onClick={() => setClickPoints((prev) => prev.slice(0, -1))}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition font-bold cursor-pointer"
              >
                Undo
              </button>
            )}
            <button
              type="button"
              onClick={() => setClickPoints([])}
              className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded transition font-bold cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
