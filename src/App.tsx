/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Building, Map, ShieldAlert, HeartPulse, ShieldCheck, 
  RefreshCw, Sparkles, Layers, LogOut
} from 'lucide-react';
import { WardRiskSummary, Complaint, PatientRecord, HEALTH_INSPECTORS } from './types';
import MapGISViewer from './components/MapGISViewer';
import PublicPortal from './components/PublicPortal';
import InspectorPortal from './components/InspectorPortal';
import HospitalAnalytics from './components/HospitalAnalytics';
import AIExplanationView from './components/AIExplanationView';

export default function App() {
  // Global Shared States synced with REST Backend
  const [wardRisks, setWardRisks] = useState<WardRiskSummary[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [predictions, setPredictions] = useState<any>(null);

  // Layout navigation states
  const [selectedRole, setSelectedRole] = useState<'public' | 'inspector' | null>(null);
  const [activePortal, setActivePortal] = useState<'zone-map' | 'complaints' | 'hospitals' | 'classification'>('zone-map');
  const [loading, setLoading] = useState(true);
  
  // No preloaded default inspector - force login gate every time
  const [loggedInInspector, setLoggedInInspector] = useState<any | null>(null);

  // Map selections synchronized across tab bars
  const [selectedWard, setSelectedWard] = useState<number | null>(null);
  const [selectedZone, setSelectedZone] = useState<any>(null);

  // Live Notification and pending state monitors
  const [lastComplaintsLength, setLastComplaintsLength] = useState<number>(0);
  const [newComplaintToast, setNewComplaintToast] = useState<Complaint | null>(null);
  const [globalToast, setGlobalToast] = useState<string | null>(null);

  useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const msg = (e as CustomEvent).detail?.message;
      if (msg) {
        setGlobalToast(msg);
      }
    };
    window.addEventListener('custom-toast', handleCustomToast);
    return () => window.removeEventListener('custom-toast', handleCustomToast);
  }, []);

  // Auto-dismiss custom toast of 6 seconds duration
  useEffect(() => {
    if (globalToast) {
      const t = setTimeout(() => {
        setGlobalToast(null);
      }, 6000);
      return () => clearTimeout(t);
    }
  }, [globalToast]);

  useEffect(() => {
    if (complaints.length > 0) {
      if (lastComplaintsLength > 0 && complaints.length > lastComplaintsLength) {
        // Find the newest complaint (since they are sorted with newest first)
        const newest = complaints[0];
        if (newest && newest.status === 'Pending') {
          // If inspector matches zone or is in admin mode
          if (!loggedInInspector || newest.zone === loggedInInspector.zone) {
            setNewComplaintToast(newest);
            // Hide after 8 seconds
            setTimeout(() => {
              setNewComplaintToast(null);
            }, 8000);
          }
        }
      }
      setLastComplaintsLength(complaints.length);
    }
  }, [complaints, loggedInInspector, lastComplaintsLength]);

  const pendingCount = complaints.filter(
    (c) => c.status === "Pending" && (!loggedInInspector || c.zone === loggedInInspector.zone)
  ).length;

  const fetchBackendData = async () => {
    try {
      const [risksRes, compRes, patientsRes, predRes] = await Promise.all([
        fetch('/api/dashboard/ward-risks'),
        fetch('/api/complaints'),
        fetch('/api/hospitals/patients'),
        fetch('/api/dashboard/predictions')
      ]);

      const [risksData, compData, patientsData, predData] = await Promise.all([
        risksRes.json(),
        compRes.json(),
        patientsRes.json(),
        predRes.json()
      ]);

      setWardRisks(risksData);
      setComplaints(compData);
      setPatients(patientsData);
      setPredictions(predData);
    } catch (err) {
      console.error("Link to full-stack Express backend currently stale, initializing fallback seed data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Pull initial reports on mount
  useEffect(() => {
    fetchBackendData();

    // Set up continuous synchronization polling loop (updates every 10 seconds representing actual live incoming medical logs)
    const interval = setInterval(fetchBackendData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sync callbacks triggered by child components changes
  const handleNewComplaintSubmitted = (newC: Complaint) => {
    setComplaints(prev => [newC, ...prev]);
    fetchBackendData(); // Refetch dashboard summaries to reflect new CV score & ward factors in risk indices
  };

  const handleCaseReported = async (payload: any) => {
    try {
      const response = await fetch('/api/hospitals/report-case', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        setPatients(prev => [data.patient, ...prev]);
        fetchBackendData(); // Recalculate risk scores
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInspectorAction = async (cId: string, action: 'start' | 'resolve' | 'reject', comment: string) => {
    try {
      const inspectorId = loggedInInspector ? loggedInInspector.id : 'HI-TN-2026-DEFAULT';

      const response = await fetch('/api/complaints/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          complaintId: cId,
          action,
          comment,
          inspectorId
        })
      });

      const data = await response.json();
      if (data.success) {
        setComplaints(prev => prev.map(c => c.id === cId ? data.complaint : c));
        fetchBackendData(); // Triggers risk update (e.g., resolving threat drops critical indicators)
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="madurai-applet-root" className="min-h-screen bg-[#0a0a0a] text-slate-100 flex flex-col selection:bg-[#3B82F6] selection:text-black">
      {/* 1. MUNICIPAL GOVERNMENT HEADER HUD */}
      <header className="h-16 bg-[#1a1a1a] border-b border-[#3B82F6]/35 flex items-center justify-between px-6 shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          {/* National Crest / Corp Emblem Placeholder */}
          <div className="w-10 h-10 bg-[#3B82F6] rounded flex items-center justify-center font-bold text-black font-display text-base">
            TN
          </div>
          <div>
            <h1 className="text-md sm:text-lg font-bold tracking-tight leading-none text-[#3B82F6] font-display">
              MADURAI CORPORATION
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mt-1">
              {selectedRole === 'inspector' && loggedInInspector 
                ? `AI Disease Control • Officer: ${loggedInInspector.name} (${loggedInInspector.id} • ${loggedInInspector.zone})` 
                : 'AI Disease Control & Epidemic Assistance System'}
            </p>
          </div>
        </div>

        {/* Removed cataloged cases and active hazards from the right corner of the web */}
        <div className="hidden sm:block font-mono text-[10px] text-slate-400 tracking-wider">
          MUNICIPAL SANITARY DIVISION
        </div>
      </header>

      {/* 2. CORE MASTER SECTIONS */}
      {selectedRole === null ? (
        /* FRONT PAGE / WELCOME HERO INTERFACE */
        <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 mt-12 pb-16 space-y-8 flex-grow">
          <div id="welcome-greetings" className="glass-panel p-8 rounded-2xl border border-[#3B82F6]/30 bg-gradient-to-br from-[#0c1f3d]/60 via-[#0a0a0a]/95 to-[#000000]/100 text-center relative overflow-hidden">
            {/* Ambient vector map backdrop of Madurai */}
            <div className="absolute inset-0 pointer-events-none select-none opacity-40 hover:opacity-50 transition-opacity duration-500 overflow-hidden">
              <svg 
                viewBox="0 0 800 640" 
                className="w-full h-full object-cover scale-105 sm:scale-100" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Subtle technical background grid */}
                  <pattern id="grid-pattern-hero" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(59, 130, 246, 0.04)" strokeWidth="0.75" />
                    <circle cx="50" cy="0" r="1.5" fill="rgba(59, 130, 246, 0.15)" />
                  </pattern>
                  {/* Glow filter for map elements */}
                  <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-pattern-hero)" />
                
                {/* 1. VAIGAI RIVER: Flows Northwest to Southeast right through Madurai */}
                <path 
                  d="M 120,280 C 250,270 380,310 490,260 C 580,220 670,240 760,210" 
                  fill="none" 
                  stroke="#3b82f6" 
                  strokeWidth="10" 
                  strokeOpacity="0.06"
                />
                <path 
                  d="M 120,280 C 250,270 380,310 490,260 C 580,220 670,240 760,210" 
                  fill="none" 
                  stroke="#06b6d4" 
                  strokeWidth="3" 
                  strokeOpacity="0.18"
                  strokeDasharray="500"
                  strokeDashoffset="0"
                  className="animate-[dash_15s_linear_infinite]"
                />

                {/* 2. CORPORATIONS/ZONES POLYGONS COMPARED TO REAL MAP BOUNDARIES */}
                {/* North Zone II (Light Cyan/Teal) */}
                <polygon 
                  points="280,30 520,30 520,180 430,220 280,180" 
                  fill="rgba(6, 182, 212, 0.04)" 
                  stroke="rgba(6, 182, 212, 0.25)" 
                  strokeWidth="1.2" 
                />
                
                {/* East Zone I (Yellow/Orange) */}
                <polygon 
                  points="520,30 740,110 770,220 650,380 500,280 520,180" 
                  fill="rgba(245, 158, 11, 0.03)" 
                  stroke="rgba(245, 158, 11, 0.2)" 
                  strokeWidth="1" 
                />

                {/* Central Zone III (Pinkish/Red core) */}
                <polygon 
                  points="280,180 430,220 500,280 440,380 320,360 250,270" 
                  fill="rgba(244, 63, 94, 0.06)" 
                  stroke="rgba(244, 63, 94, 0.3)" 
                  strokeWidth="1.5" 
                />

                {/* West Zone V (Aquamarine/Sage Green) */}
                <polygon 
                  points="140,190 280,180 250,270 320,360 210,480 80,380" 
                  fill="rgba(16, 185, 129, 0.04)" 
                  stroke="rgba(16, 185, 129, 0.2)" 
                  strokeWidth="1" 
                />

                {/* South Zone IV (Sky Blue) */}
                <polygon 
                  points="320,360 440,380 500,280 650,380 610,560 420,580 310,500" 
                  fill="rgba(59, 130, 246, 0.04)" 
                  stroke="rgba(59, 130, 246, 0.25)" 
                  strokeWidth="1.2" 
                />

                {/* The "Perungudi / Airport" narrow tail pointing south at the very bottom */}
                <polygon 
                  points="310,500 420,580 360,630 310,610" 
                  fill="rgba(59, 130, 246, 0.03)" 
                  stroke="rgba(59, 130, 246, 0.2)" 
                  strokeWidth="1" 
                  strokeDasharray="2 2"
                />

                {/* 3. SUBTLE WARD BOUNDARIES / SUB-BLOCK LINES */}
                {/* Add detailed inner geographic lines representing various ward clusters */}
                <polyline points="280,30 330,100 280,180" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                <polyline points="400,30 410,120 430,220" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                <polyline points="520,30 610,110 520,180" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                <polyline points="630,70 650,180 770,220" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                <polyline points="140,190 200,280 250,270" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                <polyline points="80,380 180,380 210,480" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                <polyline points="320,360 380,450 420,580" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                <polyline points="440,380 520,480 610,560" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />

                {/* 4. CLINICAL OUTBREAK DOTS & WARD IDENTIFIERS */}
                {/* East Zone Node */}
                <g filter="url(#glow-rose)">
                  <circle cx="610" cy="180" r="5" fill="#f59e0b" className="animate-ping" style={{ animationDuration: '3s' }} />
                  <circle cx="610" cy="180" r="3" fill="#f59e0b" />
                  <text x="610" y="172" fill="#f59e0b" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold" opacity="0.8">WARD 39</text>
                </g>

                {/* North Zone Node */}
                <g>
                  <circle cx="380" cy="110" r="3" fill="#06b6d4" />
                  <text x="380" y="102" fill="#06b6d4" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold" opacity="0.8">WARD 12</text>
                </g>

                {/* Central Zone Node */}
                <g filter="url(#glow-rose)">
                  <circle cx="360" cy="270" r="6" fill="#f43f5e" className="animate-ping" style={{ animationDuration: '2s' }} />
                  <circle cx="360" cy="270" r="3.5" fill="#f43f5e" />
                  <text x="360" y="260" fill="#f43f5e" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold" className="animate-pulse">WARD 50</text>
                </g>

                {/* West Zone Node */}
                <g>
                  <circle cx="180" cy="340" r="3" fill="#10b981" />
                  <text x="180" y="332" fill="#10b981" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold" opacity="0.8">WARD 74</text>
                </g>

                {/* South Zone Node */}
                <g>
                  <circle cx="480" cy="450" r="3" fill="#3b82f6" />
                  <text x="480" y="442" fill="#3b82f6" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold" opacity="0.8">WARD 89</text>
                </g>

                {/* Decorative scanning HUD ring around central hot-zone */}
                <circle cx="360" cy="270" r="45" fill="none" stroke="rgba(244,63,94,0.15)" strokeWidth="1" strokeDasharray="5 5" className="animate-[spin_20s_linear_infinite]" />
                <circle cx="360" cy="270" r="20" fill="none" stroke="rgba(244,63,94,0.2)" strokeWidth="0.5" />

                {/* Technical Coordinates overlay labels to ground branding */}
                <text x="40" y="50" fill="rgba(255,255,255,0.15)" fontSize="9" fontFamily="monospace">LAT: 9.9252° N</text>
                <text x="40" y="65" fill="rgba(255,255,255,0.15)" fontSize="9" fontFamily="monospace">LNG: 78.1197° E</text>
                <text x="40" y="80" fill="rgba(255,255,255,0.1)" fontSize="8" fontFamily="monospace">MUNICIPAL AREA: 147.9 km²</text>
              </svg>
            </div>

            <div className="relative z-10 py-3">
              <span className="text-[10px] tracking-[0.2em] text-[#3B82F6] font-mono font-bold uppercase block mb-3">
                Tamil Nadu Department of Municipal Administration
              </span>
              <h2 className="text-3xl sm:text-4.5xl font-extrabold tracking-tight text-white leading-none font-display uppercase">
                AI health inspector assistant
              </h2>
              <p className="text-xs text-slate-300 mt-4 leading-relaxed font-sans max-w-2xl mx-auto">
                A high-integrity sanitary response and clinical decision-support system designed to monitor reservoirs, analyze pooling vector hotspots, process computer-vision citizen complaints, and assist Health Inspectors in preventing water-borne pathogens (Dengue, Typhoid, Cholera) across Madurai's 100 municipal wards.
              </p>
            </div>
          </div>

          {/* Dynamic Two Action Tracks BELOW the Title */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Citizens Track Card */}
            <div className="glass-panel p-6 rounded-xl border border-white/5 bg-[#111111]/90 hover:border-[#3B82F6]/45 transition-all group duration-300 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-blue-950/50 border border-blue-500/20 flex items-center justify-center text-[#3B82F6] mb-4">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                  Public Citizen Portal
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Lodge water-borne disease alerts, standing water, and mosquito breeding locations directly with immediate automated computer-vision tagging.
                </p>
              </div>
              <button
                onClick={() => setSelectedRole('public')}
                className="mt-6 w-full bg-[#3B82F6] hover:bg-blue-600 text-black py-2.5 rounded text-xs font-mono font-bold transition-all cursor-pointer text-center block"
              >
                Access Citizen Portal →
              </button>
            </div>

            {/* Health Inspector Track Card */}
            <div className="glass-panel p-6 rounded-xl border border-white/5 bg-[#111111]/90 hover:border-[#3B82F6]/45 transition-all group duration-300 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-blue-950/50 border border-blue-500/20 flex items-center justify-center text-[#3B82F6] mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                  Corporate Health Inspector
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Authenticate your credentials to view allocated GIS boundaries, supervise active dengue hazard tickets, and audit water purification reports.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedRole('inspector');
                }}
                className="mt-6 w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded text-xs font-mono font-bold transition-all border border-white/10 cursor-pointer text-center block"
              >
                Access Inspector Panel →
              </button>
            </div>
          </div>
        </main>
      ) : selectedRole === 'public' ? (
        /* PUBLIC PORTAL WORKSPACE (NO MAPS, WIDE LAYOUT) */
        <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 mt-6 pb-20 flex-grow">
          <button
            onClick={() => setSelectedRole(null)}
            className="text-xs font-mono text-slate-300 hover:text-white bg-[#1a1a1a] hover:bg-white/5 border border-white/10 rounded px-3 py-1.5 transition-all cursor-pointer flex items-center gap-1.5 mb-6"
          >
            ← Back to Selection
          </button>

          <div className="space-y-6">
            {loading ? (
              <div className="glass-panel rounded-2xl p-16 text-center space-y-4 font-mono text-slate-400">
                <RefreshCw className="w-10 h-10 mx-auto text-[#3B82F6] animate-spin" />
                <p>Syncing data indices...</p>
              </div>
            ) : (
              <PublicPortal 
                wardRisks={wardRisks} 
                allComplaints={complaints}
                onNewComplaintSubmitted={handleNewComplaintSubmitted}
              />
            )}
          </div>
        </main>
      ) : loggedInInspector === null ? (
        /* FORCED HEALTH INSPECTOR LOGIN FLOW (Always clean state login screen) */
        <main className="max-w-md mx-auto w-full px-4 sm:px-6 mt-12 pb-20 flex-grow">
          <button
            onClick={() => setSelectedRole(null)}
            className="text-xs font-mono text-slate-300 hover:text-white bg-[#1a1a1a] hover:bg-white/5 border border-white/10 rounded px-3 py-1.5 transition-all cursor-pointer flex items-center gap-1.5 mb-6"
          >
            ← Back to Selection
          </button>
          <InspectorPortal 
            wardRisks={wardRisks}
            allComplaints={complaints}
            allPatients={patients}
            onActionTriggered={handleInspectorAction}
            loggedInInspector={loggedInInspector}
            onInspectorLogin={(info) => {
              setLoggedInInspector(info);
              setSelectedZone(info.zone);
              setActivePortal('zone-map');
            }}
            onInspectorLogout={() => {
              setLoggedInInspector(null);
              setSelectedZone(null);
              setSelectedWard(null);
            }}
          />
        </main>
      ) : (
        /* HEALTH INSPECTOR PORTAL WORKSPACE WITH MODERN PERSISTENT SIDEBAR */
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 mt-6 pb-20 flex-grow flex flex-col lg:flex-row gap-6">
          {/* PERSISTENT SIDE REVOLUTIONARY MENUBAR */}
          <aside className="w-full lg:w-64 shrink-0 space-y-4">
            {/* Header duty card */}
            <div className="glass-panel p-4 rounded-xl border border-blue-500/20 bg-[#111111]/90">
              <span className="text-[9px] uppercase tracking-wider text-[#3B82F6] font-mono font-bold block mb-1">
                Duty Health Officer
              </span>
              <p className="text-sm font-bold font-display text-white leading-tight">
                {loggedInInspector.name}
              </p>
              <p className="text-[10px] font-mono text-slate-400 mt-1">
                {loggedInInspector.id} ({loggedInInspector.zone})
              </p>
              <div className="mt-3 border-t border-white/10 pt-3">
                <button
                  onClick={() => {
                    setLoggedInInspector(null);
                    setSelectedZone(null);
                    setSelectedWard(null);
                    setSelectedRole(null);
                  }}
                  className="w-full bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-500/20 rounded px-2.5 py-1.5 text-xs font-mono transition-all flex items-center justify-center gap-2 cursor-pointer font-bold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out Session
                </button>
              </div>
            </div>

            {/* Menubar selections */}
            <div className="glass-panel rounded-xl border border-white/5 bg-[#111111]/90 p-2 space-y-1">
              <div className="px-3 py-2 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1.5">
                Surveillance Menu
              </div>

              <button
                onClick={() => setActivePortal('zone-map')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all text-left ${
                  activePortal === 'zone-map'
                    ? 'bg-blue-600/25 border border-blue-500/50 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Map className="w-4 h-4 text-[#3B82F6]" />
                <span>Zone GIS Map</span>
              </button>

              <button
                onClick={() => setActivePortal('complaints')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono transition-all text-left ${
                  activePortal === 'complaints'
                    ? 'bg-blue-600/25 border border-blue-500/50 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-4 h-4 text-[#3B82F6]" />
                  <span>Citizen Complaints</span>
                </div>
                {pendingCount > 0 && (
                  <span className="bg-red-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full animate-pulse shadow-md flex items-center gap-1 shrink-0">
                    <span className="w-1 h-1 rounded-full bg-white block animate-ping" />
                    {pendingCount} new
                  </span>
                )}
              </button>

              <button
                onClick={() => setActivePortal('hospitals')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all text-left ${
                  activePortal === 'hospitals'
                    ? 'bg-blue-600/25 border border-blue-500/50 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <HeartPulse className="w-4 h-4 text-[#3B82F6]" />
                <span>Hospital Database</span>
              </button>

              <button
                onClick={() => setActivePortal('classification')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all text-left ${
                  activePortal === 'classification'
                    ? 'bg-blue-600/25 border border-blue-500/50 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#3B82F6]" />
                <span>Classification of Wards</span>
              </button>
            </div>
          </aside>

          {/* MAIN SECURE CONSOLE INNER HUB PANEL */}
          <section className="flex-1 min-w-0 space-y-6">
            <button
              onClick={() => setSelectedRole(null)}
              className="text-xs font-mono text-slate-300 hover:text-white bg-[#1a1a1a] hover:bg-white/5 border border-white/10 rounded px-3 py-1.5 transition-all cursor-pointer flex items-center gap-1.5 mb-2"
            >
              ← Back to Main Menu
            </button>

            {loading ? (
              <div className="glass-panel rounded-2xl p-16 text-center space-y-4 font-mono text-slate-400 shadow-xl">
                <RefreshCw className="w-10 h-10 mx-auto text-[#3B82F6] animate-spin" />
                <p>Syncing municipal database scales...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activePortal === 'zone-map' && (
                  /* RENDERS ZONE GIS MAP IN WORKSPACE */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="col-span-1 lg:col-span-8 space-y-4">
                      <div className="bg-[#1a1a1a] p-3 rounded-lg border border-blue-500/15 text-[#3B82F6] font-mono text-[11px] text-center">
                        LOCALIZED GIS SURVEILLANCE: {loggedInInspector.zone.toUpperCase()}
                      </div>
                      <MapGISViewer 
                        wardRisks={wardRisks}
                        complaints={complaints}
                        selectedWard={selectedWard}
                        onSelectWard={setSelectedWard}
                        selectedZone={selectedZone}
                        onSelectZone={setSelectedZone}
                        inspectorZone={loggedInInspector.zone}
                      />
                    </div>
                    <div className="col-span-1 lg:col-span-4 space-y-4">
                      <div className="glass-panel p-4 rounded-xl space-y-3 bg-[#111111]/90 border border-white/5">
                        <h4 className="text-xs font-bold font-mono text-[#3B82F6] uppercase tracking-wide">
                          How to Navigate Zone Map
                        </h4>
                        <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                          The GIS layer is interactive. Click on any ward node inside the visual vector chart to extract real-time water quality indicators, mosquito larvae counts, and historical disease outbreaks.
                        </p>
                      </div>

                      {selectedWard ? (
                        <div className="glass-panel p-4 rounded-xl space-y-3 bg-[#111111]/90 border border-white/5 active-scale-in">
                          {(() => {
                            const wardMetrics = wardRisks.find(w => w.ward === selectedWard);
                            if (!wardMetrics) return null;
                            return (
                              <>
                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                  <span className="text-xs font-bold text-white font-display">
                                    Ward {selectedWard} ({wardMetrics.zone})
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                    wardMetrics.riskCategory === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                                    wardMetrics.riskCategory === 'HIGH' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-green-500/20 text-green-400'
                                  }`}>
                                    {wardMetrics.riskCategory} RISK
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                                  <div className="bg-[#0a0a0a] p-2.5 rounded border border-white/5">
                                    <span className="text-[9px] text-slate-500 block font-bold">WQI Water Index:</span>
                                    <p className="text-sm font-bold text-white mt-0.5">{wardMetrics.waterQualityScore}/100</p>
                                  </div>
                                  <div className="bg-[#0a0a0a] p-2.5 rounded border border-white/5">
                                    <span className="text-[9px] text-slate-500 block font-bold">Outbreak Risk:</span>
                                    <p className="text-sm font-bold text-white mt-0.5">{wardMetrics.riskScore}%</p>
                                  </div>
                                </div>

                                <div className="text-[11px] leading-relaxed text-[#3B82F6]/90 font-mono text-[10.5px]">
                                  {wardMetrics.riskCategory === 'CRITICAL' 
                                    ? 'Immediate Danger: Double alarm limits exceeded. Vector insect chemical sprays scheduled for this municipal node.'
                                    : 'No active alarms. Standard water flushing procedures running routinely.'
                                  }
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="glass-panel p-6 text-center rounded-xl border border-white/5 bg-[#111111]/90 text-xs font-mono text-slate-400">
                          <p>No ward selected</p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            Click on any interactive ward node on the map to display detail telemetry.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activePortal === 'complaints' && (
                  /* CITIZEN COMPLAINTS & ACTION RESOLUTION SHEETS */
                  <InspectorPortal 
                    wardRisks={wardRisks}
                    allComplaints={complaints}
                    allPatients={patients}
                    onActionTriggered={handleInspectorAction}
                    loggedInInspector={loggedInInspector}
                    onInspectorLogin={(info) => {
                      setLoggedInInspector(info);
                      setSelectedZone(info.zone);
                    }}
                    onInspectorLogout={() => {
                      setLoggedInInspector(null);
                      setSelectedZone(null);
                      setSelectedWard(null);
                    }}
                  />
                )}

                {activePortal === 'hospitals' && (
                  /* CLINICAL ILLNESS DIRECTORY & PATIENT CASES */
                  <HospitalAnalytics 
                    patients={patients}
                    onReportCaseTriggered={handleCaseReported}
                    loggedInInspector={loggedInInspector}
                  />
                )}

                {activePortal === 'classification' && (
                  /* WARD RISK RANKINGS & EXPLAINABLE AI DRIVERS */
                  <AIExplanationView 
                    predictionData={predictions}
                    onRefresh={fetchBackendData}
                    wardRisks={wardRisks}
                    setActivePortal={setActivePortal}
                    loggedInInspector={loggedInInspector}
                  />
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* REAL-TIME INCOMING COMPLAINT ALERT FLUID TOAST */}
      {loggedInInspector && newComplaintToast && (
        <div className="fixed bottom-10 right-6 z-50 max-w-sm w-full bg-[#1c0803] border border-red-500/40 p-4 rounded-xl shadow-2xl flex flex-col gap-3 glow-red animate-pulse">
          <div className="flex items-start gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping shrink-0 mt-1.5" />
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono font-bold text-red-400 block tracking-wider">
                🚨 Immediate Alert: New Complaint Box Filed!
              </span>
              <h4 className="text-xs font-bold text-white font-sans leading-tight">
                {newComplaintToast.title}
              </h4>
              <p className="text-[10px] text-slate-350 font-sans leading-relaxed">
                A new water safety threat was logged in <strong>Ward {newComplaintToast.ward} ({newComplaintToast.zone})</strong>.
              </p>
              {newComplaintToast.aiDetection && (
                <div className="bg-red-950/40 border border-red-500/25 p-2 rounded mt-2 text-[10px] font-mono text-red-300">
                  AI Computer Vision Risk Score: {newComplaintToast.aiDetection.overallRiskScore}% ({newComplaintToast.aiDetection.detectedClogConfidence}% stagnant pooling detected)
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-red-500/10">
            <button
              onClick={() => setNewComplaintToast(null)}
              className="text-[10px] font-mono text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                setActivePortal('complaints');
                setNewComplaintToast(null);
              }}
              className="bg-red-650 hover:bg-red-600 text-white px-3 py-1.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer"
            >
              Inspect Complaints Box
            </button>
          </div>
        </div>
      )}

      {/* GLOBAL NOTIFICATION SYSTEM (Safer replacement for blocked window.alert) */}
      {globalToast && (
        <div className="fixed top-20 right-6 z-50 max-w-sm w-full bg-[#111111]/95 border border-[#3B82F6]/55 p-4 rounded-xl shadow-2xl backdrop-blur-md flex flex-col gap-3.5 animate-fadeIn glow-indigo">
          <div className="flex items-start gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping shrink-0 mt-1.5" />
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono font-bold text-[#3B82F6] block tracking-wider">
                📢 SYSTEM NOTIFICATION
              </span>
              <p className="text-xs text-slate-100 font-sans leading-relaxed whitespace-pre-line">
                {globalToast}
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-1.5 border-t border-white/5">
            <button
              onClick={() => setGlobalToast(null)}
              className="bg-blue-600 hover:bg-blue-500 text-black px-4 py-1.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* 3. STATUS FOOTER */}
      {selectedRole !== null && (
        <footer className="h-6 bg-black border-t border-white/5 px-6 flex items-center justify-between shrink-0 fixed bottom-0 left-0 w-full z-40 bg-opacity-90 backdrop-blur-md">
          <div className="flex items-center gap-4 text-[9px] text-slate-500 font-mono">
            <span className="flex items-center gap-1.5 font-bold text-[#3B82F6]">
              <span className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full animate-pulse"></span> SYSTEM ONLINE
            </span>
            <span className="hidden sm:inline">|</span>
            <span>YOLOv8 ENGINE ACTIVE</span>
            <span className="hidden sm:inline">|</span>
            <span>GIS DATASOURCE: OSM_MADURAI_LATEST</span>
          </div>
          <div className="text-[9px] text-slate-500 font-mono">
            Uptime: 99.98% | API Latency: 42ms | V: 2.5.0-REL-BLUE
          </div>
        </footer>
      )}
    </div>
  );
}
