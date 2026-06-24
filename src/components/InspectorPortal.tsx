/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, useEffect } from 'react';
import { 
  Lock, Search, CheckCircle, Clock, AlertOctagon, Zap, Filter, 
  MapPin, Check, Image, Download, FileSpreadsheet, Eye, MessageSquare,
  RefreshCw
} from 'lucide-react';
import { HEALTH_INSPECTORS, ZoneName, Complaint, PatientRecord, WardRiskSummary } from '../types';

// Safe non-blocking custom notification dispatcher to avoid iframe sandbox alert blocks (Script error)
const alert = (message: string) => {
  window.dispatchEvent(new CustomEvent('custom-toast', { detail: { message } }));
};

interface InspectorPortalProps {
  wardRisks: WardRiskSummary[];
  allComplaints: Complaint[];
  allPatients: PatientRecord[];
  onActionTriggered: (complaintId: string, action: 'start' | 'resolve' | 'reject', comment: string) => void;
  onInspectorLogin?: (inspector: any) => void;
  onInspectorLogout?: () => void;
  loggedInInspector?: any;
}

export default function InspectorPortal({
  wardRisks,
  allComplaints,
  allPatients,
  onActionTriggered,
  onInspectorLogin,
  onInspectorLogout,
  loggedInInspector
}: InspectorPortalProps) {
  const [inspector, setInspector] = useState<any | null>(loggedInInspector || null);

  useEffect(() => {
    setInspector(loggedInInspector || null);
  }, [loggedInInspector]);

  // Auth States
  const [inspName, setInspName] = useState('');
  const [govId, setGovId] = useState('');
  const [allocatedZone, setAllocatedZone] = useState<ZoneName>('East Zone');
  const [authError, setAuthError] = useState('');

  // Workspace Filter constraints
  const [activeTab, setActiveTab] = useState<'triage' | 'hospitals' | 'reports'>('triage');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Inspection Started' | 'Resolved'>('All');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [matrixScope, setMatrixScope] = useState<'all' | 'zone'>('all');

  // Analytical dates filters for generating report
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [generatingReport, setGeneratingReport] = useState(false);

  // Explainable AI (XAI) State variables
  const [selectedExplainerWard, setSelectedExplainerWard] = useState<WardRiskSummary | null>(null);
  const [aiExplanationText, setAiExplanationText] = useState('');
  const [explainerLoading, setExplainerLoading] = useState(false);

  // Real-time notification toast stack
  const [lastComplaintLength, setLastComplaintLength] = useState(0);
  const [newComplaintNotification, setNewComplaintNotification] = useState<string | null>(null);

  // Poll complaints list to issue visual alerts on incoming citizen tickets
  useEffect(() => {
    if (!inspector) return;
    const currentZoneComplaints = allComplaints.filter(c => c.zone === inspector.zone);
    if (lastComplaintLength > 0 && currentZoneComplaints.length > lastComplaintLength) {
      const newGrievance = currentZoneComplaints[0];
      if (newGrievance) {
        setNewComplaintNotification(`ALERT: New water contamination ticket registered: ${newGrievance.id} in Ward ${newGrievance.ward}! AI Model: ${newGrievance.aiDetection?.detectedObjects.map(o => o.className).join(', ') || 'Larvae detected'}`);
        // Auto dismiss after 7s representing professional dispatch toaster
        setTimeout(() => {
          setNewComplaintNotification(null);
        }, 7000);
      }
    }
    setLastComplaintLength(currentZoneComplaints.length);
  }, [allComplaints, inspector]);

  // Click handler to trigger explainable AI call safely proxying server.ts secret keys
  const handleCriticalWardClick = async (wardInfo: WardRiskSummary) => {
    setSelectedExplainerWard(wardInfo);
    setExplainerLoading(true);
    try {
      const res = await fetch(`/api/explain-critical-ward?ward=${wardInfo.ward}&zone=${encodeURIComponent(wardInfo.zone)}`);
      const data = await res.json();
      if (data.success && data.explanation) {
        setAiExplanationText(data.explanation);
      } else {
        setAiExplanationText("Failed to retrieve administrative explainable analysis.");
      }
    } catch (err) {
      console.error(err);
      setAiExplanationText("Service connection timed out. Potter safety threshold active.");
    } finally {
      setExplainerLoading(false);
    }
  };

  // Inspector Auth Action Handler
  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanId = govId.trim().toUpperCase();
    const cleanName = inspName.trim();
    
    if (!cleanId) {
      setAuthError("Please input your Government Inspector ID.");
      return;
    }

    if (!cleanName) {
      setAuthError("Please input your registered Health Inspector Name.");
      return;
    }

    // Strict validation check against official sanitary inspectors
    const matchedInspector = HEALTH_INSPECTORS.find(hi => hi.id === cleanId);
    if (!matchedInspector) {
      setAuthError("❌ Invalid Health Inspector ID");
      return;
    }

    // Secure verification that the entered inspector name corresponds to the matching ID key register
    const isNameMatch = matchedInspector.name.toLowerCase().includes(cleanName.toLowerCase()) || 
                        cleanName.toLowerCase().includes(matchedInspector.name.toLowerCase());
    if (!isNameMatch) {
      setAuthError(`❌ Registered health inspector name for ID "${cleanId}" does not match "${cleanName}".`);
      return;
    }

    const payload = {
      id: matchedInspector.id,
      name: matchedInspector.name,
      zone: matchedInspector.zone,
      phone: matchedInspector.phone,
      loginTime: new Date().toISOString()
    };

    setInspector(payload);
    setAuthError('');
    if (onInspectorLogin) {
      onInspectorLogin(payload);
    }
  };

  if (!inspector) {
    return (
      <div id="inspector-login-page" className="glass-panel border border-white/10 rounded-2xl p-6 max-w-sm mx-auto shadow-2xl relative bg-[#111111]/90 text-left">
        <div className="text-center mb-6">
          <Lock className="w-12 h-12 text-[#3B82F6] mx-auto mb-3 animate-pulse" />
          <h2 className="text-lg font-display font-medium text-white">
            Corporation Health Inspector Portal
          </h2>
          <p className="text-[11px] text-slate-500 font-sans mt-1 leading-relaxed">
            Secure Government Authorization Panel • Tamil Nadu Health Dept
          </p>
        </div>

        {authError && (
          <div className="bg-red-500/10 border border-red-500/35 text-red-400 rounded-lg p-3 text-xs mb-4 font-mono text-left">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4 font-mono text-xs text-left">
          <div>
            <label className="block text-[9px] uppercase text-slate-400 font-bold mb-1">Government ID</label>
            <input
              type="text"
              required
              placeholder="Ex: HI-TN-2026-1001"
              value={govId}
              onChange={(e) => setGovId(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 rounded py-2.5 px-4 text-xs text-slate-200 outline-none focus:border-[#3B82F6] transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase text-slate-400 font-bold mb-1">Health Inspector Name</label>
            <input
              type="text"
              required
              placeholder="Ex: Arun Kumar"
              value={inspName}
              onChange={(e) => setInspName(e.target.value)}
              className="w-full bg-[#111111] border border-white/10 rounded py-2.5 px-4 text-xs text-slate-200 outline-none focus:border-[#3B82F6] transition-all font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#3B82F6] hover:bg-blue-600 text-black py-2.5 rounded text-xs font-bold tracking-wider transition-all cursor-pointer mt-2"
          >
            Authenticate & Log In
          </button>
        </form>


      </div>
    );
  }

  // Authentication is fully bypassed - active workspace always loaded

  // Filter complaints and patients for THIS inspector's Zone
  const zoneComplaints = allComplaints.filter(c => c.zone === inspector.zone);
  const zonePatients = allPatients.filter(p => p.zone === inspector.zone);
  const zoneWardsInfo = wardRisks.filter(w => w.zone === inspector.zone);

  // Group wards in the inspector's zone into risk classifications
  const zoneCriticalWards = zoneWardsInfo.filter(w => w.riskCategory === 'CRITICAL');
  const zoneModerateWards = zoneWardsInfo.filter(w => w.riskCategory === 'HIGH');
  const zoneLowWards = zoneWardsInfo.filter(w => w.riskCategory === 'MODERATE');

  // Group ALL municipal wards of Madurai into risk classifications
  const allCriticalWards = wardRisks.filter(w => w.riskCategory === 'CRITICAL');
  const allModerateWards = wardRisks.filter(w => w.riskCategory === 'HIGH');
  const allLowWards = wardRisks.filter(w => w.riskCategory === 'MODERATE');

  // Dynamic selection displayed based on scope toggle
  const activeCriticalWards = matrixScope === 'all' ? allCriticalWards : zoneCriticalWards;
  const activeModerateWards = matrixScope === 'all' ? allModerateWards : zoneModerateWards;
  const activeLowWards = matrixScope === 'all' ? allLowWards : zoneLowWards;

  // Counters for inspector KPI HUD
  const pendingCount = zoneComplaints.filter(c => c.status === 'Pending').length;
  const activeInspectionCount = zoneComplaints.filter(c => c.status === 'Inspection Started').length;
  const resolvedCount = zoneComplaints.filter(c => c.status === 'Resolved').length;

  // Filtered Complains by status selection
  const filteredComplaints = zoneComplaints.filter(c => {
    if (statusFilter === 'All') return true;
    return c.status === statusFilter;
  });

  const selectedComplaint = zoneComplaints.find(c => c.id === selectedComplaintId);

  // Submit decision action to backend
  const handleResolutionAction = (action: 'start' | 'resolve' | 'reject') => {
    if (!selectedComplaintId) return;
    if (action !== 'start' && !commentInput.trim()) {
      alert("Please provide inspector comments detailing corrective field actions before continuing.");
      return;
    }

    onActionTriggered(selectedComplaintId, action, commentInput);
    setCommentInput('');
    alert(`Success: Grievance action successfully committed.`);
  };

  // --- CSV / Excel Downloader Generator module ---
  const handleCSVDownload = () => {
    setGeneratingReport(true);
    setTimeout(() => {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "ID,Title,Zone,Ward,Status,Date,Reporter Name,Reporter Phone,Lat,Lng,AI Score\n";
      
      zoneComplaints.forEach(c => {
        const titleSafe = c.title.replace(/,/g, " ");
        const row = [
          c.id, titleSafe, c.zone, c.ward, c.status, c.date, 
          c.citizenName, c.citizenPhone, c.latitude, c.longitude, 
          c.aiDetection?.overallRiskScore || ""
        ].join(",");
        csvContent += row + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Madurai_Corp_Report_${inspector.zone.replace(" ", "_")}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setGeneratingReport(false);
    }, 800);
  };

  // --- Local printable summary sheet mock (Simulated PDF download) ---
  const handlePDFDownload = () => {
    setGeneratingReport(true);
    setTimeout(() => {
      let printContent = `
        ============================================================
           MADURAI CORPORATION HEALTH & FIELD SANITATION REPORT
        ============================================================
        Zone: ${inspector.zone}
        Date: ${new Date().toISOString().split('T')[0]}
        Inspector: ${inspector.name} (${inspector.id})
        ------------------------------------------------------------
        ZONE OVERVIEW:
        - Outbreak Risk level: ${zoneWardsInfo.some(w => w.riskCategory === 'CRITICAL') ? 'CRITICAL WARDS IDENTIFIED' : 'STABLE'}
        - Total Registered Complaints: ${zoneComplaints.length}
        - Total Epidemiological Patient Records: ${zonePatients.length}
        ------------------------------------------------------------
        DETAILED COMPLAINTS STATUS:
        Pending: ${pendingCount}
        In Progress/Inspection: ${activeInspectionCount}
        Resolved: ${resolvedCount}
        ============================================================
      `;

      const blob = new Blob([printContent], { type: 'text/plain' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Madurai_Sanitation_Doc_${inspector.id}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setGeneratingReport(false);
    }, 1000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Inspector Profile Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 border border-white/5 bg-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-900/20 border border-blue-500/30 flex items-center justify-center font-bold text-[#3B82F6]">
            HI
          </div>
          <div>
            <span className="text-[10px] text-[#3B82F6] font-mono block">Authorized Duty Officer</span>
            <span className="text-md font-bold text-white">{inspector.name} ({inspector.id})</span>
            <span className="text-xs text-slate-400 block font-mono">Assigned Zone Boundary: {inspector.zone}</span>
          </div>
        </div>
      </div>

      {/* Real-time incoming complaint warning banner */}
      {newComplaintNotification && (
        <div className="bg-[#3B82F6] text-white px-4 py-3 rounded-xl font-mono text-xs font-bold flex items-center justify-between gap-4 shadow-xl animate-pulse">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-white shrink-0 animate-bounce" />
            <span>{newComplaintNotification}</span>
          </div>
          <button 
            onClick={() => setNewComplaintNotification(null)}
            className="text-white hover:text-black font-bold text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Workspace KPI Counters Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl text-center space-y-1 bg-[#1a1a1a] border border-white/5">
          <span className="text-xs font-mono text-slate-400 block">Today's Complaints</span>
          <span className="text-2xl font-display font-bold text-white">{zoneComplaints.length}</span>
        </div>

        <div className="glass-panel p-4 rounded-xl text-center space-y-1 bg-[#1a1a1a] border border-red-500/20">
          <span className="text-xs font-mono text-red-400 block">Pending Red Alerts</span>
          <span className="text-2xl font-display font-bold text-red-450">{pendingCount}</span>
        </div>

        <div className="glass-panel p-4 rounded-xl text-center space-y-1 bg-[#1a1a1a] border border-yellow-500/20">
          <span className="text-xs font-mono text-yellow-400 block">Under Inspection</span>
          <span className="text-2xl font-display font-bold text-yellow-450">{activeInspectionCount}</span>
        </div>

        <div className="glass-panel p-4 rounded-xl text-center space-y-1 bg-[#1a1a1a] border border-green-500/20">
          <span className="text-xs font-mono text-green-400 block">Resolved / Chlorinated</span>
          <span className="text-2xl font-display font-bold text-green-450">{resolvedCount}</span>
        </div>
      </div>

      {/* Main Subnavigation Tabs */}
      <div className="flex border-b border-white/5 text-sm font-mono gap-1">
        <button
          onClick={() => setActiveTab('triage')}
          className={`pb-2.5 px-4 transition-all border-b-2 hover:text-white ${
            activeTab === 'triage' 
              ? 'border-[#3B82F6] text-[#3B82F6] font-semibold' 
              : 'border-transparent text-slate-400'
          }`}
        >
          Zone Triage Terminal ({zoneComplaints.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-2.5 px-4 transition-all border-b-2 hover:text-white ${
            activeTab === 'reports' 
              ? 'border-[#3B82F6] text-[#3B82F6] font-semibold' 
              : 'border-transparent text-slate-400'
          }`}
        >
          Compliance Reporting & Exports
        </button>
      </div>

      {/* TAB CONTENT 1: HAZARDS TRIAGE WORKSPACE */}
      {activeTab === 'triage' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Complaints list column */}
          <div className="lg:col-span-5 space-y-4">
            {/* Filters */}
            <div className="bg-[#111111]/70 p-3 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-300 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filters
              </span>
              <div className="flex gap-1 text-[10px] font-mono">
                {(['All', 'Pending', 'Inspection Started', 'Resolved'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => { setStatusFilter(f); setSelectedComplaintId(null); }}
                    className={`px-2 py-1 rounded transition-all cursor-pointer ${
                      statusFilter === f 
                        ? 'bg-blue-600 border border-blue-500 text-white font-bold' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredComplaints.length === 0 ? (
                <div className="glass-panel p-8 text-center text-xs text-slate-500 font-mono border border-white/5">
                  No complaints filed matching this status criteria.
                </div>
              ) : (
                filteredComplaints.map(c => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedComplaintId(c.id)}
                    className={`glass-panel p-3.5 rounded-lg cursor-pointer transition-all border text-left space-y-1.5 ${
                      selectedComplaintId === c.id 
                        ? 'border-[#3B82F6] bg-[#1a1a1a]' 
                        : 'border-white/5 bg-[#111111]/60 hover:border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="font-bold text-[#3B82F6]">{c.id} (W{c.ward})</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        c.status === 'Resolved' ? 'bg-green-500/20 text-green-400' :
                        c.status === 'Inspection Started' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <span className="font-bold text-white text-xs block truncate">{c.title}</span>
                    <span className="text-[10.5px] text-slate-300 block truncate">{c.description}</span>
                    <div className="flex justify-between text-[9.5px] text-slate-550 font-mono pt-1">
                      <span>By: {c.citizenName}</span>
                      <span>{c.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detailed Selected Grievance inspect Workspace panel */}
          <div className="lg:col-span-7">
            {selectedComplaint ? (
              <div className="glass-panel p-5 rounded-xl space-y-4">
                <div className="border-b border-blue-500/15 pb-2.5 flex justify-between items-start">
                  <div>
                    <span className="text-xs text-blue-400 font-mono block">Grievance Ticket: {selectedComplaint.id}</span>
                    <h3 className="text-md font-bold text-white">{selectedComplaint.title}</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
                    selectedComplaint.status === 'Resolved' ? 'bg-green-950 text-green-400' :
                    selectedComplaint.status === 'Inspection Started' ? 'bg-yellow-950 text-yellow-400' :
                    'bg-blue-950 text-blue-300'
                  }`}>
                    {selectedComplaint.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-orange-200">
                  <div className="bg-[#1e0702]/45 p-2.5 rounded border border-orange-500/10 space-y-1">
                    <span className="text-[10px] text-orange-400 font-bold block uppercase">Reporter:</span>
                    <p className="font-sans text-white text-xs font-bold">{selectedComplaint.citizenName}</p>
                    <p>Phone: {selectedComplaint.citizenPhone}</p>
                    <p>Address: <span className="font-sans">{selectedComplaint.address}</span></p>
                  </div>

                  <div className="bg-[#1e0702]/45 p-2.5 rounded border border-orange-500/10 space-y-1">
                    <span className="text-[10px] text-orange-400 font-bold block uppercase">Geographics:</span>
                    <p>Ward: {selectedComplaint.ward}</p>
                    <p>Zone: {selectedComplaint.zone}</p>
                    <p className="text-orange-400">Coords: {selectedComplaint.latitude.toFixed(4)}, {selectedComplaint.longitude.toFixed(4)}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10.5px] uppercase font-mono text-blue-400 font-bold">Citizen Description:</span>
                  <p className="text-xs leading-relaxed text-slate-200 bg-black/25 p-3 rounded border border-blue-500/10">
                    {selectedComplaint.description}
                  </p>
                </div>

                {/* Computer Vision inference models outputs */}
                <div className="bg-blue-950/10 p-4 rounded-lg border border-blue-500/15 space-y-3">
                  <span className="text-xs uppercase font-mono text-blue-400 font-bold block">
                    ⚡ Integrated Computer Vision Inference (YOLOv8 + OpenCV Output)
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                      {selectedComplaint.imageUrl ? (
                        <div className="relative border border-blue-500/30 rounded overflow-hidden max-h-[160px] flex items-center justify-center">
                          <img 
                            src={selectedComplaint.imageUrl} 
                            alt="Inspect element" 
                            referrerPolicy="no-referrer"
                            className="w-full h-auto max-h-[158px] object-cover" 
                          />
                          {/* YOLO box */}
                          {selectedComplaint.aiDetection?.detectedObjects.map((obj, i) => (
                            <div 
                              key={i}
                              className="absolute border-2 border-red-500 bg-red-500/10"
                              style={{
                                left: `${obj.boundingBox ? obj.boundingBox[0] : 15}%`,
                                top: `${obj.boundingBox ? obj.boundingBox[1] : 20}%`,
                                width: `${obj.boundingBox ? (obj.boundingBox[2] - obj.boundingBox[0]) : 60}%`,
                                height: `${obj.boundingBox ? (obj.boundingBox[3] - obj.boundingBox[1]) : 55}%`
                              }}
                            >
                              <span className="absolute -top-5 left-0 bg-red-600 text-[8px] text-white px-1 rounded">
                                {obj.className}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-black/40 text-[10px] font-mono text-slate-500 p-6 rounded text-center border border-dashed border-blue-500/10">
                          No visual data available.
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10.5px] text-blue-400 font-mono font-bold block">Detected Hazard Factors:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selectedComplaint.aiDetection?.detectedObjects.map((obj, i) => (
                            <span key={i} className="bg-red-950/80 border border-red-500/20 text-red-300 px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
                              {obj.className} ({(obj.confidence * 100).toFixed(0)}%)
                            </span>
                          )) || <span className="text-slate-500 text-[11px]">None Detected</span>}
                        </div>
                      </div>

                      <div className="text-[11px] leading-relaxed text-slate-350 font-sans italic">
                        {selectedComplaint.aiDetection?.explanation}
                      </div>
                    </div>
                  </div>
                </div>

                {/* INSPECTOR DECISION ACTION HUB */}
                <div className="space-y-3.5 border-t border-blue-500/15 pt-4">
                  <span className="text-xs uppercase font-mono text-blue-400 font-bold block">
                    Field Action Decision & Remedial Protocol
                  </span>

                  {selectedComplaint.status !== 'Resolved' ? (
                    <div className="space-y-3">
                      <textarea
                        rows={2}
                        placeholder="Input corrective sanitation remarks (Ex: Deployed 15L corporate bleaching powder, flushed blocked canal block water flowing into Ward main sewage line)"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        className="w-full bg-[#111111] border border-blue-500/20 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-blue-500 font-mono"
                      />

                      <div className="flex flex-wrap gap-2 justify-end">
                        {selectedComplaint.status === 'Pending' && (
                          <button
                            onClick={() => handleResolutionAction('start')}
                            className="bg-yellow-700 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all"
                          >
                            Dispatch Inspection Party
                          </button>
                        )}
                        <button
                          onClick={() => handleResolutionAction('resolve')}
                          className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all"
                        >
                          Mark RESOLVED & Sanitized
                        </button>
                        <button
                          onClick={() => handleResolutionAction('reject')}
                          className="bg-red-950/80 hover:bg-red-900 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg text-xs font-mono transition-all"
                        >
                          Reject Grievance
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-950/20 border border-green-500/20 p-3 rounded text-xs text-green-300 font-mono flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      <span>remittance protocol completed: This water contamination hazard is resolved and sanitization vectors have been applied close out.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-panel text-center p-16 text-slate-500 text-xs font-mono border-dashed">
                <Search className="w-12 h-12 text-blue-500/30 mx-auto mb-2.5" />
                Select a grievance ticket from the sidebar to view details.
              </div>
            )}
          </div>
        </div>

      </>
    )}

      {/* TAB CONTENT 2: CLINICAL CASES DIRECTORY */}
      {activeTab === 'hospitals' && (
        <div className="glass-panel p-5 rounded-xl space-y-4">
          <div className="flex justify-between items-center border-b border-blue-500/15 pb-2.5">
            <div>
              <h3 className="text-md font-bold text-white">Active Epidemiological Records ({inspector.zone})</h3>
              <p className="text-xs text-slate-400">Clinically identified disease incidents flagged in zone medical camps.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#111111] text-blue-400">
                <tr>
                  <th className="p-2.5">UID</th>
                  <th className="p-2.5">Name</th>
                  <th className="p-2.5">Age/Sex</th>
                  <th className="p-2.5">Hospital Facility</th>
                  <th className="p-2.5">Infection Type</th>
                  <th className="p-2.5">Severity</th>
                  <th className="p-2.5">Admission Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-500/10 text-slate-300">
                {zonePatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-slate-500">No clinical incidents registered.</td>
                  </tr>
                ) : (
                  zonePatients.map(p => (
                    <tr key={p.id} className="hover:bg-blue-950/15 text-slate-300">
                      <td className="p-2.5 text-blue-400 font-bold">{p.id}</td>
                      <td className="p-2.5 font-sans font-semibold text-white">{p.name}</td>
                      <td className="p-2.5">{p.age} / {p.gender.charAt(0)}</td>
                      <td className="p-2.5 font-sans">{p.hospital}</td>
                      <td className="p-2.5 font-sans font-bold text-red-300">{p.disease}</td>
                      <td className="p-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          p.severity === 'Critical' ? 'bg-red-950 text-red-400' :
                          p.severity === 'Moderate' ? 'bg-yellow-950 text-yellow-400' :
                          'bg-green-950 text-green-400'
                        }`}>
                          {p.severity}
                        </span>
                      </td>
                      <td className="p-2.5">{p.admissionDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: REPORT COMPILER ENGINE */}
      {activeTab === 'reports' && (
        <div className="glass-panel p-6 rounded-xl space-y-4">
          <div className="border-b border-blue-500/15 pb-2.5">
            <h3 className="text-md font-bold text-white">Compliance Reporting & Core Exports Engine</h3>
            <p className="text-xs text-slate-400">Compile regulatory reports validating field sanitation variables matching Tamil Nadu Epidemic Disease Regulations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-xs uppercase font-mono text-blue-400 font-bold block">Temporal Range selector:</span>
                <select
                  value={reportType}
                  onChange={(e: any) => setReportType(e.target.value)}
                  className="w-full bg-[#111111] border border-blue-500/20 p-2.5 rounded-lg text-xs text-slate-200 outline-none focus:border-blue-500 font-mono"
                >
                  <option value="daily">Daily Epidemic Briefing (Last 24 Hours)</option>
                  <option value="weekly">Weekly Epidemiological Review (Trailing 7 Days)</option>
                  <option value="monthly">Monthly Corp Water Health Review</option>
                  <option value="custom">Combined Inspection Summary Log</option>
                </select>
              </div>

              <div className="space-y-2 text-xs text-slate-300 font-sans">
                <span className="font-bold text-blue-400 block font-mono">The synthesized report compiles:</span>
                <ul className="list-disc leading-relaxed pl-4 font-mono space-y-1 text-[11px] text-slate-400">
                  <li>YOLOv8 visual model hazard extractions</li>
                  <li>WQI municipal chemical index variables</li>
                  <li>Dengue/Cholera localized hospital caseload metrics</li>
                  <li>Resolution timeline delay intervals</li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={handleCSVDownload}
                  disabled={generatingReport}
                  className="bg-blue-600 hover:bg-blue-550 disabled:bg-blue-900 text-white px-4 py-2.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {generatingReport ? 'Compiling...' : <><FileSpreadsheet className="w-4 h-4" /> Export Excel CSV</>}
                </button>

                <button
                  onClick={handlePDFDownload}
                  disabled={generatingReport}
                  className="bg-blue-950/40 hover:bg-blue-900 duration-200 border border-blue-500/25 text-blue-300 px-4 py-2.5 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                >
                  {generatingReport ? 'Generating...' : <><Download className="w-4 h-4" /> Export PDF Summary</>}
                </button>
              </div>
            </div>

            {/* Simulated Live Printout review */}
            <div className="bg-black/60 border border-blue-500/15 rounded-lg p-4 font-mono text-[10px] space-y-3 max-h-[220px] overflow-y-auto">
              <span className="pb-1 border-b border-blue-500/20 block text-blue-400 uppercase text-center font-bold tracking-wider">
                LIVE REPORT VIEW: {reportType.toUpperCase()}_REPORT.CONF
              </span>
              <p className="text-blue-300">
                [SYSTEM DIRECTIVE] Compiling Madurai Sanitation indicators for {inspector.zone}...
              </p>
              <div className="grid grid-cols-2 gap-y-1 text-slate-300">
                <span>Analysis Ward Nodes:</span>
                <span className="text-right">{zoneWardsInfo.length} nodes verified</span>
                <span>Active Breeding Swamps:</span>
                <span className="text-right text-red-400">{pendingCount} hazards flag font</span>
                <span>Water Integrity Mean:</span>
                <span className="text-right text-blue-400">
                  {Math.round(zoneWardsInfo.reduce((acc, c) => acc + c.waterQualityScore, 0) / zoneWardsInfo.length)}/100 WQI
                </span>
                <span>Outbreak Hotspots:</span>
                <span className="text-right text-red-500">{zoneWardsInfo.filter(w => w.riskCategory === 'CRITICAL').length} wards RED</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
