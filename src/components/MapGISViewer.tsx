/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { MapPin, ShieldAlert, Waves, RefreshCw, Layers, TrendingUp } from 'lucide-react';
import { ZoneName, WardRiskSummary, Complaint, MADURAI_ZONES } from '../types';

interface MapGISViewerProps {
  wardRisks: WardRiskSummary[];
  complaints: Complaint[];
  selectedWard: number | null;
  onSelectWard: (ward: number | null) => void;
  selectedZone: ZoneName | null;
  onSelectZone: (zone: ZoneName | null) => void;
  inspectorZone?: ZoneName | null;
}

export default function MapGISViewer({
  wardRisks,
  complaints,
  selectedWard,
  onSelectWard,
  selectedZone,
  onSelectZone,
  inspectorZone = null
}: MapGISViewerProps) {
  const [viewMode, setViewMode] = useState<'risk' | 'water' | 'disease'>('risk');
  const [hoveredWard, setHoveredWard] = useState<WardRiskSummary | null>(null);

  const activeZone = inspectorZone || selectedZone;
  const selectedWardDetails = wardRisks.find(w => w.ward === selectedWard);
  const activeWardDetails = selectedWardDetails || hoveredWard;

  // Layout boundaries for the 5 Zones in a 600x480 coordinate system matching the corporation design map
  const zoneSVGBoundaries = {
    'North Zone': {
      polygon: "60,40 280,40 280,180 140,180",
      center: { x: 170, y: 110 },
      fill: "rgba(6, 182, 212, 0.12)",
      stroke: "#06b6d4"
    },
    'East Zone': {
      polygon: "280,40 540,40 500,220 280,180",
      center: { x: 410, y: 110 },
      fill: "rgba(245, 158, 11, 0.12)",
      stroke: "#f59e0b"
    },
    'Central Zone': {
      polygon: "140,180 280,180 340,250 160,250",
      center: { x: 230, y: 215 },
      fill: "rgba(244, 63, 94, 0.12)",
      stroke: "#f43f5e"
    },
    'South Zone': {
      polygon: "280,180 500,220 460,420 260,350",
      center: { x: 370, y: 290 },
      fill: "rgba(59, 130, 246, 0.12)",
      stroke: "#3b82f6"
    },
    'West Zone': {
      polygon: "30,180 160,250 260,350 150,420 30,340",
      center: { x: 110, y: 290 },
      fill: "rgba(16, 185, 129, 0.12)",
      stroke: "#10b981"
    }
  };

  // Pre-calculate coordinates for all 100 wards across the zones so we can do direct lookups easily!
  const wardCoordinates: Record<number, { x: number; y: number; r: number }> = {};
  
  Object.entries(MADURAI_ZONES).forEach(([zoneName, wards]) => {
    const zone = zoneName as ZoneName;
    wards.forEach((ward, idx) => {
      // Overrides for principal risk hotspots so they align beautifully under their correct zones
      const overrides: Record<number, { x: number; y: number; r: number }> = {
        3: { x: 400, y: 110, r: 13 },   // East Zone main trigger (Ward 3)
        22: { x: 190, y: 105, r: 13 },  // North Zone main trigger (Ward 22)
        34: { x: 140, y: 125, r: 13 },  // North Zone secondary trigger (Ward 34)
        45: { x: 370, y: 290, r: 13 }   // South Zone trigger (Ward 45)
      };

      if (overrides[ward]) {
        wardCoordinates[ward] = overrides[ward];
        return;
      }

      // Default smart distribute in bounding boxes strictly within diagram zone boundaries
      const total = wards.length;
      let startX = 200, endX = 400, startY = 100, endY = 200;
      if (zone === 'North Zone') {
        startX = 95; endX = 230; startY = 70; endY = 145;
      } else if (zone === 'East Zone') {
        startX = 310; endX = 480; startY = 70; endY = 150;
      } else if (zone === 'Central Zone') {
        startX = 175; endX = 295; startY = 195; endY = 235;
      } else if (zone === 'South Zone') {
        startX = 295; endX = 425; startY = 240; endY = 365;
      } else if (zone === 'West Zone') {
        startX = 65; endX = 185; startY = 220; endY = 350;
      }

      const cols = Math.ceil(Math.sqrt(total * 1.3));
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const numRows = Math.ceil(total / cols);

      const xGap = (endX - startX) / Math.max(1, cols - 1 || 1);
      const yGap = (endY - startY) / Math.max(1, numRows - 1 || 1);

      const x = Math.round(startX + col * xGap);
      const y = Math.round(startY + row * yGap);
      const r = 10; // Standard compact size for readability

      wardCoordinates[ward] = { x, y, r };
    });
  });

  // Determine ward fill colors based on current mode
  const getWardColor = (summary: WardRiskSummary) => {
    const isSelected = selectedWard === summary.ward;

    if (viewMode === 'risk') {
      switch (summary.riskCategory) {
        case 'CRITICAL':
          return isSelected ? '#ef4444' : '#b91c1c'; // Bright red vs Dark red
        case 'HIGH':
          return isSelected ? '#eab308' : '#ca8a04'; // Bright yellow vs Dark yellow
        case 'MODERATE':
        default:
          return isSelected ? '#22c55e' : '#15803d'; // Bright green vs Dark green
      }
    } else if (viewMode === 'water') {
      const wqi = summary.waterQualityScore;
      if (wqi < 55) return isSelected ? '#dc2626' : '#991b1b'; // Bleak contaminated water
      if (wqi < 75) return isSelected ? '#f59e0b' : '#b45309'; // Moderate risk water
      return isSelected ? '#06b6d4' : '#0369a1'; // Clean pure water index (Cyan-blue)
    } else {
      // Disease Cases count
      const cases = summary.hospitalCases;
      if (cases >= 8) return isSelected ? '#ef4444' : '#991b1b';
      if (cases >= 4) return isSelected ? '#f57c00' : '#b25300';
      return isSelected ? '#a855f7' : '#6b21a8'; // Safe disease profile (Muted Purple)
    }
  };

  return (
    <div id="gis-portal-map" className="glass-panel p-6 relative overflow-hidden flex flex-col h-[530px] border border-white/5">
      {/* Dynamic Overlay HUD Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 z-10 relative">
        <div>
          <h2 className="text-xl font-display font-bold text-[#3B82F6] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#3B82F6] animate-pulse" />
            GIS Command Portal (Satellite Overlay Mapping)
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Corporation Boundary Scale: 1:5,000 | Active GPS Tracking Refreshed
          </p>
        </div>

        {/* HUD Theme Switcher */}
        <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 text-xs font-mono">
          <button
            onClick={() => setViewMode('risk')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              viewMode === 'risk' 
                ? 'bg-[#3B82F6] text-black font-bold shadow' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            AI Risk Heatmap
          </button>
          <button
            onClick={() => setViewMode('water')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              viewMode === 'water' 
                ? 'bg-[#3B82F6] text-black font-bold shadow' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Water Contaminants
          </button>
          <button
            onClick={() => setViewMode('disease')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              viewMode === 'disease' 
                ? 'bg-[#3B82F6] text-black font-bold shadow' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Clinical Outbreaks
          </button>
        </div>
      </div>

      {/* Main Vector SVG Stage with map overlay styling */}
      <div className="relative flex-1 bg-black/40 rounded-xl overflow-hidden min-h-[400px] border border-white/5 flex items-center justify-center">
        {/* Abstract satellite background map grid */}
        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
          backgroundImage: `
            radial-gradient(circle at 100px 100px, rgba(59, 130, 246, 0.15) 1px, transparent 1px),
            linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px, 20px 20px, 20px 20px'
        }} />

        {/* Real-time map rendering canvas */}
        <svg
          viewBox="0 0 600 480"
          className="w-full h-full max-h-[440px] select-none text-white font-mono"
        >
          {/* Transparent interactive background rect to stably clear ward selection on click/touch */}
          <rect 
            width="100%" 
            height="100%" 
            fill="transparent" 
            onClick={() => onSelectWard(null)} 
            className="cursor-default"
          />

          {/* 1. Zone polygon layers - Filtered by activeZone */}
          {Object.entries(zoneSVGBoundaries)
            .filter(([zoneName]) => !activeZone || zoneName === activeZone)
            .map(([zoneName, z]) => {
              const isSelected = selectedZone === zoneName;
              return (
                <g key={zoneName} className="transition-all duration-300">
                  <polygon
                    points={z.polygon}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (inspectorZone) return; // Prevent changing zones if inspector is locked to a zone!
                      onSelectZone(isSelected ? null : (zoneName as ZoneName));
                      onSelectWard(null); // Clear selected ward on zone change
                    }}
                    style={{
                      fill: isSelected ? z.fill.replace('0.12', '0.30') : z.fill,
                      stroke: z.stroke,
                      strokeWidth: isSelected ? 3 : 1.5,
                    }}
                    className="cursor-pointer transition-all duration-300 hover:opacity-90"
                  />
                  <text
                    x={z.center.x}
                    y={z.center.y}
                    textAnchor="middle"
                    className="fill-slate-400/40 text-[10px] uppercase tracking-wider font-bold pointer-events-none font-sans"
                  >
                    {zoneName}
                  </text>
                </g>
              );
            })}

          {/* 2. Ward interactive bubbles mapping - Filtered by activeZone */}
          {wardRisks
            .filter((w) => !activeZone || w.zone === activeZone)
            .map((w) => {
            const coords = wardCoordinates[w.ward];
            if (!coords) return null;
            const isSelected = selectedWard === w.ward;
            const isHovered = hoveredWard?.ward === w.ward;
            const fillCol = getWardColor(w);

            return (
              <g 
                key={w.ward}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectWard(isSelected ? null : w.ward);
                }}
                onMouseEnter={() => setHoveredWard(w)}
                onMouseLeave={() => setHoveredWard(null)}
              >
                {/* Outbreak glow indicator around critical wards */}
                {w.riskCategory === 'CRITICAL' && (
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r={coords.r + 6}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    className="animate-pulse"
                  />
                )}

                {/* Ward Center Circle */}
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r={isSelected ? coords.r + 2.5 : isHovered ? coords.r + 1.2 : coords.r}
                  fill={fillCol}
                  stroke={isSelected || isHovered ? '#ffffff' : 'rgba(0,0,0,0.5)'}
                  strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                  className="transition-all duration-200 shadow-lg"
                />

                {/* Ward ID textual overlay */}
                <text
                  x={coords.x}
                  y={coords.y + 3}
                  textAnchor="middle"
                  fontSize="8px"
                  fontWeight="bold"
                  fill="#ffffff"
                  pointerEvents="none"
                >
                  W{w.ward}
                </text>
                
                {/* Show values if hovered/selected */}
                {(isHovered || isSelected) && (
                  <line
                    x1={coords.x}
                    y1={coords.y - coords.r}
                    x2={coords.x}
                    y2={coords.y - coords.r - 8}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}

          {/* 3. Citizen complaints real-time GPS coordinates markers - Filtered by activeZone */}
          {complaints
            .filter((c) => !activeZone || c.zone === activeZone)
            .map((c) => {
            // Find coordinates of containing ward to make marker align beautifully inside ward circles
            const wardCoords = wardCoordinates[c.ward];
            if (!wardCoords) return null;
            
            // Sub-offset pins slightly so they don't cover ward number
            const pinX = wardCoords.x + 8;
            const pinY = wardCoords.y - 10;

            return (
              <g key={c.id}>
                {/* Radar pulse ripples in orange */}
                <circle
                  cx={pinX}
                  cy={pinY}
                  r="12"
                  fill="none"
                  stroke={c.status === 'Resolved' ? '#22c55e' : '#3B82F6'}
                  strokeWidth="1"
                  className="animate-ping"
                  opacity="0.35"
                />

                {/* Actual Pin map marker */}
                <circle
                  cx={pinX}
                  cy={pinY}
                  r="4"
                  fill={c.status === 'Resolved' ? '#10b981' : '#3B82F6'}
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              </g>
            );
          })}
        </svg>

        {/* Stable Interactive Overlay Details Box on Click/Touch or Hover */}
        {activeWardDetails && (
          <div 
            className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 bg-[#111111]/95 border-2 border-[#3b82f6]/40 p-4 rounded-xl text-xs w-auto sm:w-64 backdrop-blur-md shadow-2xl scale-in-center font-mono z-30 transition-all text-left"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-1.5 mb-2">
              <span className="font-bold text-[#3B82F6] flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#3B82F6] animate-pulse"></span>
                Ward {activeWardDetails.ward} ({activeWardDetails.zone})
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                  activeWardDetails.riskCategory === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                  activeWardDetails.riskCategory === 'HIGH' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {activeWardDetails.riskCategory}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hoveredWard?.ward === activeWardDetails.ward) {
                      setHoveredWard(null);
                    }
                    if (selectedWard === activeWardDetails.ward) {
                      onSelectWard(null);
                    }
                  }}
                  className="text-slate-400 hover:text-white transition-colors px-1 rounded bg-white/5 hover:bg-white/15 text-[10px] font-bold"
                  title="Close Details"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 text-slate-300">
              <span className="text-slate-500 font-bold">Risk Score:</span>
              <span className="font-bold text-right text-white">{activeWardDetails.riskScore}%</span>
              <span className="text-slate-500 font-bold">Hospital Cases:</span>
              <span className="font-bold text-right text-rose-400">{activeWardDetails.hospitalCases} cases</span>
              <span className="text-slate-500 font-bold">WQI Level:</span>
              <span className="font-bold text-right text-cyan-400">{activeWardDetails.waterQualityScore}/100</span>
              <span className="text-slate-500 font-bold">Hazards Pending:</span>
              <span className="font-bold text-right text-amber-500">{activeWardDetails.complaintCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* Map Interactive Legend Subbar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-y-2 border-t border-white/5 pt-4 text-xs font-mono">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-red-700 border border-white/10"></span>
            <span className="text-slate-300">Critical Risk (&gt;=70)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-yellow-650 border border-white/10"></span>
            <span className="text-slate-300">Moderate (35-69)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-green-700 border border-white/10"></span>
            <span className="text-slate-300">Low/Potable (&lt;35)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[#3B82F6]">
          <ShieldAlert className="w-4 h-4 text-slate-500 animate-bounce" />
          <span className="text-[11px]">Touch or Hover over wards for stable real-time indicators</span>
        </div>
      </div>
    </div>
  );
}
