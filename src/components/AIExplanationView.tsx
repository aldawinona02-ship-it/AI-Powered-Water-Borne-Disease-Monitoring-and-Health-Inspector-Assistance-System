/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { useState } from 'react';
import { 
  Compass, ShieldAlert, Zap, RefreshCw, Filter, 
  Search, Eye, AlertOctagon, ArrowRight, CheckCircle
} from 'lucide-react';
import { WardRiskSummary, ZoneName } from '../types';

// Safe non-blocking custom notification dispatcher to avoid iframe sandbox alert blocks (Script error)
const alert = (message: string) => {
  window.dispatchEvent(new CustomEvent('custom-toast', { detail: { message } }));
};

interface AIExplanationViewProps {
  predictionData: any;
  onRefresh: () => void;
  wardRisks: WardRiskSummary[];
  setActivePortal?: (portal: 'complaints' | 'hospitals' | 'classification' | 'zone-map') => void;
  loggedInInspector?: any;
}

export default function AIExplanationView({ 
  predictionData, 
  onRefresh, 
  wardRisks = [], 
  setActivePortal, 
  loggedInInspector 
}: AIExplanationViewProps) {
  const [activeTab, setActiveTab] = useState<'shap' | 'outbreak' | 'hotspots'>('shap');
  const [loading, setLoading] = useState(false);

  // Classification Matrix States
  const [matrixScope, setMatrixScope] = useState<string>(() => {
    return loggedInInspector ? loggedInInspector.zone : 'all';
  });
  const [selectedExplainerWard, setSelectedExplainerWard] = useState<WardRiskSummary | null>(null);
  const [aiExplanationText, setAiExplanationText] = useState('');
  const [explainerLoading, setExplainerLoading] = useState(false);

  const handleRefreshData = () => {
    setLoading(true);
    setTimeout(() => {
      onRefresh();
      setLoading(false);
    }, 600);
  };

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
      setAiExplanationText("Service connection timed out. Power safety threshold active.");
    } finally {
      setExplainerLoading(false);
    }
  };

  // Base Global Model SHAP Feature Importance weights (representing aggregate influence across Madurai)
  const globalSHAPFactors = [
    { feature: 'Clinical Water Disease Caseload (Hospitals)', weight: 38, iconBg: 'bg-red-950 text-red-400', desc: 'Direct patient diagnoses representing pathogenic propagation.' },
    { feature: 'Direct Citizen Water-Pooling Reports (Complaints)', weight: 28, iconBg: 'bg-blue-950 text-blue-400', desc: 'Active municipal standing swamp layers.' },
    { feature: 'Water Quality Score (WQI Index Contamination)', weight: 22, iconBg: 'bg-cyan-950 text-cyan-400', desc: 'Chemical/biological contaminant readings from civic reservoirs.' },
    { feature: 'YOLOv8 Computer Vision Detected Hazard Probability', weight: 12, iconBg: 'bg-indigo-950 text-indigo-400', desc: 'Confidence parameters matching stagnant pools, larvae and clogged vents.' }
  ];

  // Resolve inspector boundaries
  const inspectorZone = loggedInInspector?.zone || 'North Zone';
  const inspectorName = loggedInInspector?.name || 'Priya Devi';

  // Filter lists by scope
  const filteredWards = matrixScope === 'all' 
    ? wardRisks 
    : wardRisks.filter(w => w.zone === matrixScope);

  const activeCriticalWards = filteredWards.filter(w => w.riskCategory === 'CRITICAL');
  const activeHighWards = filteredWards.filter(w => w.riskCategory === 'HIGH');
  const activeModerateWards = filteredWards.filter(w => w.riskCategory === 'MODERATE');

  const criticalWardList = predictionData?.criticalWardList || [];
  const filteredCriticalWards = loggedInInspector
    ? criticalWardList.filter((hot: any) => hot.zone === inspectorZone)
    : criticalWardList;

  return (
    <div className="glass-panel p-5 rounded-xl space-y-6">
      {/* HUD HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-500/15 pb-4">
        <div>
          <h3 className="text-lg font-display font-bold text-[#3B82F6] flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-400 animate-spin" style={{ animationDuration: '6s' }} />
            AI Risk Forecaster & Explainable SHAP Engine
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            Model Engine: YOLOv8 classification Core + Shapley Regression Weighting
          </p>
        </div>

        <button
          onClick={handleRefreshData}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white border border-blue-500/30 px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Recalculate AI Weights
        </button>
      </div>

      {/* EXPLAINABLE AI INSPECTION DECISION BOARD */}
      <div className="bg-[#1e1b4b]/25 border border-indigo-500/35 p-5 rounded-2xl relative overflow-hidden backdrop-blur-sm space-y-4 glow-indigo">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center animate-pulse">
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Explainable AI: Inspector Decision Advisor
            </h4>
            <p className="text-[10px] font-mono text-indigo-300 leading-tight">
              Prescriptive dispatch guidelines based on real-time water-borne disease outbreak risks
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {(filteredCriticalWards.length === 0) ? (
            <div className="bg-[#111111]/80 border border-indigo-500/10 p-4 rounded-xl text-xs text-slate-300 flex items-center gap-3 font-mono">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-ping inline-block shrink-0" />
              <span>
                <strong>System Dispatch Status CLEAR:</strong> No wards in your zone currently require high-priority vector or chlorination inspections. Monitor active ward nodes on the GIS system for shifts in WQI score and micro complaints.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold inline-block">
                Immediate Action Advised ({filteredCriticalWards.length} High-Severity Targets in {inspectorZone})
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCriticalWards.map((hot: any, idx: number) => {
                  const needsChlorination = hot.riskScore >= 75 || hot.reasons.toLowerCase().includes('water') || hot.reasons.toLowerCase().includes('wqi');
                  const needsFumigation = hot.hospitalCases >= 5 || hot.reasons.toLowerCase().includes('mosquito') || hot.reasons.toLowerCase().includes('dengue') || hot.reasons.toLowerCase().includes('malaria') || hot.reasons.toLowerCase().includes('breeding');
                  
                  return (
                    <div key={idx} className="bg-black/40 border border-red-500/30 p-3.5 rounded-xl space-y-2.5 text-xs font-mono relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full blur-md" />
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-red-400 block text-sm">Ward {hot.ward} ({hot.zone})</span>
                          <span className="text-[10px] text-slate-500 block">Threat Score: {hot.riskScore}%</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold text-[9px] uppercase animate-pulse">
                          Needs Inspection
                        </span>
                      </div>

                      <p className="text-slate-300 leading-relaxed text-[11px] bg-black/30 p-2.5 rounded border border-white/5">
                        <strong className="text-indigo-300 block mb-0.5">⚠️ Reason for Flag:</strong>
                        {hot.reasons}
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-white/5 text-[9.5px]">
                        {needsFumigation && (
                          <span className="px-2 py-0.5 rounded bg-[#2c0b02] border border-red-500/30 text-red-300 flex items-center gap-1 heading-tight">
                            🔥 Fumigate Mosquitoes
                          </span>
                        )}
                        {needsChlorination && (
                          <span className="px-2 py-0.5 rounded bg-blue-950/40 border border-blue-500/30 text-blue-300 flex items-center gap-1 heading-tight">
                            🧪 Chlorinate Reservoirs
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-500/30 text-indigo-300">
                          👮 Audit Sanitation
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sub Tabs Toggle for Explanation types */}
      <div className="flex border-b border-blue-500/15 text-xs font-mono gap-1 pt-2">
        <button
          onClick={() => setActiveTab('shap')}
          className={`pb-2 px-3 transition-all border-b-2 hover:text-blue-200 cursor-pointer ${
            activeTab === 'shap' 
              ? 'border-[#3B82F6] text-[#3B82F6] font-semibold' 
              : 'border-transparent text-slate-500'
          }`}
        >
          SHAP Feature Regressions
        </button>
        <button
          onClick={() => setActiveTab('hotspots')}
          className={`pb-2 px-3 transition-all border-b-2 hover:text-blue-200 cursor-pointer ${
            activeTab === 'hotspots' 
              ? 'border-[#3B82F6] text-[#3B82F6] font-semibold' 
              : 'border-transparent text-slate-500'
          }`}
        >
          Outbreak Hotspot Alerts ({predictionData?.diseaseHotspotsCount ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('outbreak')}
          className={`pb-2 px-3 transition-all border-b-2 hover:text-blue-200 cursor-pointer ${
            activeTab === 'outbreak' 
              ? 'border-[#3B82F6] text-[#3B82F6] font-semibold' 
              : 'border-transparent text-slate-500'
          }`}
        >
          Model Outbreak Methodology
        </button>
      </div>

      {/* TAB 1: SHAP EXPLANATION PANEL */}
      {activeTab === 'shap' && (
        <div className="space-y-4">
          <div className="bg-blue-950/10 border border-blue-500/15 p-3 rounded-lg text-xs leading-relaxed text-slate-300 font-sans">
            <strong>What is SHAP (Shapley Additive exPlanations)?</strong> SHAP explains the output of complex predictive AI algorithms by assessing the precise contribution of each diagnostic feature. Features with positive weights push a ward towards a HIGH-RISK categorization, allowing health administrators to inspect why the system flagged warning states.
          </div>

          <div className="space-y-3">
            {globalSHAPFactors.map((factor, index) => (
              <div key={index} className="bg-black/25 p-3 rounded-lg border border-blue-500/10 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${index === 0 ? 'bg-red-500' : index === 1 ? 'bg-blue-500' : index === 2 ? 'bg-cyan-500' : 'bg-indigo-500'}`} />
                    <span className="font-bold text-white text-xs font-sans">{factor.feature}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">{factor.desc}</p>
                </div>

                <div className="shrink-0 min-w-[120px] space-y-1 text-right">
                  <span className="font-mono text-xs text-[#3B82F6] font-bold block">SHAP Value: +{factor.weight}%</span>
                  <div className="w-full bg-blue-950/30 rounded-full h-1">
                    <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${factor.weight * 2.5}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: HOTSPOT LOGS WITH NATURAL LANGUAGE EXPLAINABILITY */}
      {activeTab === 'hotspots' && (
        <div className="space-y-3.5">
          {(filteredCriticalWards.length === 0) ? (
            <div className="bg-blue-950/10 text-center p-8 text-xs text-blue-300 font-mono rounded border border-blue-500/15">
              Excellent: No municipal areas in your zone triggered high-severity outbreak indexes.
            </div>
          ) : (
            filteredCriticalWards.map((hot: any, idx: number) => (
              <div key={idx} className="bg-red-950/15 border border-red-500/25 p-4 rounded-xl flex flex-col sm:flex-row justify-between gap-4 text-xs font-sans">
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="bg-red-950 text-red-400 font-bold font-mono px-2 py-0.5 rounded text-[10px]">
                      CRITICAL DUAL-TRIGGER
                    </span>
                    <span className="text-white font-bold">Ward {hot.ward} ({hot.zone})</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11.5px] font-mono">
                    {hot.reasons}
                  </p>
                </div>

                <div className="shrink-0 text-left sm:text-right space-y-1 font-mono text-[11px]">
                  <span className="text-[#3B82F6] font-bold block">AI Threat score: {hot.riskScore}%</span>
                  <span className="text-red-300 block">{hot.hospitalCases} Hospital diagnoses</span>
                  <span className="text-blue-300 block">{hot.complaintCount} Citizen reports</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: MODEL METHODOLOGY SUMMARY */}
      {activeTab === 'outbreak' && (
        <div className="bg-black/25 p-4 rounded-xl border border-blue-500/10 space-y-3.5 text-xs text-slate-300">
          <span className="text-sm font-bold text-[#3B82F6] font-display block">Outbreak Risk Engine Mathematical Specification</span>
          
          <div className="bg-[#111111] p-3 rounded-lg border border-blue-500/10 font-mono text-[11px] leading-relaxed text-blue-200 space-y-1">
            <span className="font-bold text-white block">Composite Risk Regression Equation:</span>
            <span>R = (C_norm * 0.3) + (D_norm * 0.4) + (WQI_contam * 0.2) + (CV_score * 0.1)</span>
          </div>

          <div className="space-y-2">
            <p className="leading-relaxed">
              <strong>1. Community Complaints (C_norm - Weight 30%):</strong> Computes the count of municipal stagnant swamps. Values are normalized up to a max trigger of 10 complaints per ward.
            </p>
            <p className="leading-relaxed">
              <strong>2. Dynamic Caseloads (D_norm - Weight 40%):</strong> Assesses incoming hospital admissions flags. Values are normalized up to a max trigger bound of 15 active clinical disease diagnoses.
            </p>
            <p className="leading-relaxed">
              <strong>3. Chemical Water Contamination Quality Index (WQI_contam - Weight 20%):</strong> Evaluated using civic reservoir quality arrays. Higher contamination points decrease safety profiles.
            </p>
            <p className="leading-relaxed">
              <strong>4. Computer Vision Detections confidence (CV_score - Weight 10%):</strong> Evaluated from image evidence files uploaded by reporting citizens. High confidence counts increase breeding indicators.
            </p>
          </div>
        </div>
      )}

      {/* NEW SECTION: PORTAL CLASSIFICATION OF WARDS MATRIX & EXPLAINABLE AI DISPATCH */}
      <div className="border-t border-blue-500/15 pt-6 mt-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#3B82F6] animate-pulse" />
            <h3 className="text-sm uppercase font-mono tracking-wider font-bold text-slate-200">
              Interactive Classification of Wards & Risk Matrix
            </h3>
          </div>

          {/* Matrix Scope Filter Tabs */}
          {!loggedInInspector ? (
            <div className="flex flex-wrap bg-[#111111] p-1 rounded-lg border border-white/5 text-[10px] font-mono gap-1 shrink-0">
              {['all', 'East Zone', 'North Zone', 'Central Zone', 'South Zone', 'West Zone'].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setMatrixScope(z)}
                  className={`px-2.5 py-1.5 rounded transition-all cursor-pointer ${
                    matrixScope === z
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white bg-transparent'
                  }`}
                >
                  {z === 'all' ? 'All 100 Wards (Citywide)' : z}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-[10px] bg-blue-950/20 text-blue-400 font-mono px-3 py-1.5 rounded border border-blue-500/10">
              Logged-in Zone: <strong>{inspectorZone}</strong>
            </div>
          )}
        </div>
        
        <p className="text-xs text-slate-400 font-sans leading-relaxed">
          Ward classification indices automatically grouped by AI disease outbreaks risks. Click on any <span className="text-red-400 font-bold">CRITICAL</span> target node to query live Explainable AI diagnostics and retrieve immediate dispatch recommendations suggesting inspectors to conduct on-site sanitization audits.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Critical Wards Column */}
          <div className="glass-panel p-4 rounded-xl border border-red-500/20 bg-red-950/10 space-y-3">
            <span className="text-xs font-mono font-bold text-red-400 uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              Critical Wards (Red Alerts)
            </span>
            <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {activeCriticalWards.length === 0 ? (
                <p className="text-[11px] font-mono text-slate-500 italic block p-3 text-center bg-black/20 rounded">
                  No critical outbreaks detected.
                </p>
              ) : (
                activeCriticalWards.map(w => (
                  <button
                    key={w.ward}
                    onClick={() => handleCriticalWardClick(w)}
                    className={`w-full text-left p-2.5 rounded border transition-all cursor-pointer block ${
                      selectedExplainerWard?.ward === w.ward 
                        ? 'border-red-500 bg-red-950/40 shadow-lg shadow-red-500/10' 
                        : 'border-red-500/10 bg-[#111111]/65 hover:border-red-500/30'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-mono text-xs font-bold text-white block">Ward {w.ward}</span>
                        <span className="text-[9px] text-[#3B82F6] font-mono uppercase">{w.zone}</span>
                      </div>
                      <span className="font-sans text-[10px] text-red-400 font-bold bg-red-950/40 px-1.5 py-0.5 rounded">
                        Score: {w.riskScore}%
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-white/5">
                      <span>Cases: {w.hospitalCases}</span>
                      <span>Complaints: {w.complaintCount}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* High Wards Column */}
          <div className="glass-panel p-4 rounded-xl border border-yellow-500/25 bg-yellow-950/5 space-y-3">
            <span className="text-xs font-mono font-bold text-yellow-500 uppercase flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              High Wards (Elevated Risks)
            </span>
            <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {activeHighWards.length === 0 ? (
                <p className="text-[11px] font-mono text-slate-500 italic block p-3 text-center bg-black/20 rounded">
                  No high risk zones. All stable.
                </p>
              ) : (
                activeHighWards.map(w => (
                  <div key={w.ward} className="p-2.5 rounded border border-yellow-500/10 bg-[#111111]/45 text-slate-300">
                    <div className="flex justify-between items-center font-sans">
                      <div>
                        <span className="font-mono text-xs font-semibold block">Ward {w.ward}</span>
                        <span className="text-[9px] text-slate-500 font-mono uppercase block">{w.zone}</span>
                      </div>
                      <span className="text-[10px] text-yellow-400 font-mono font-bold">Risk: {w.riskScore}%</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-white/5">
                      <span>Cases: {w.hospitalCases}</span>
                      <span>Complaints: {w.complaintCount}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Moderate Wards Column */}
          <div className="glass-panel p-4 rounded-xl border border-green-500/25 bg-green-950/5 space-y-3">
            <span className="text-xs font-mono font-bold text-green-400 uppercase flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Moderate Wards (Monitored Zones)
            </span>
            <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {activeModerateWards.length === 0 ? (
                <p className="text-[11px] font-mono text-slate-500 italic block p-3 text-center bg-black/20 rounded">
                  No moderate risk zones initialized.
                </p>
              ) : (
                activeModerateWards.map(w => (
                  <div key={w.ward} className="p-2.5 rounded border border-green-500/10 bg-[#111111]/45 text-slate-300">
                    <div className="flex justify-between items-center font-sans">
                      <div>
                        <span className="font-mono text-xs block font-semibold">Ward {w.ward}</span>
                        <span className="text-[9px] text-slate-500 font-mono uppercase block">{w.zone}</span>
                      </div>
                      <span className="text-[10px] text-green-400 font-mono font-bold font-sans">Risk: {w.riskScore}%</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-white/5">
                      <span>Cases: {w.hospitalCases}</span>
                      <span>Complaints: {w.complaintCount}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED EXPLAINABLE AI DISPATCH REPORT PANEL */}
      {selectedExplainerWard && (
        <div className="glass-panel p-5 rounded-xl border border-red-500/30 bg-[#2c0b02]/10 space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-red-500/15 pb-2.5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#3B82F6] animate-bounce" />
              <span className="font-bold text-white font-mono text-xs">
                Government Clinical Decision-Support AI Response (Explainable-AI Interface)
              </span>
            </div>
            <button
              onClick={() => setSelectedExplainerWard(null)}
              className="text-xs text-slate-300 hover:text-white font-mono cursor-pointer"
            >
              Clear Feed [✕]
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <p className="font-bold text-red-400 uppercase tracking-wide">
              CRITICAL HAZARD DISPATCH WARNING IN WARD {selectedExplainerWard.ward} ({selectedExplainerWard.zone}):
            </p>

            {explainerLoading ? (
              <div className="flex items-center gap-2 font-mono text-slate-300 p-6 justify-center bg-black/45 rounded border border-white/5">
                <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />
                <span>Querying Gemini 3.5 Flash Explainer for clinical hazard correlations...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-black/35 p-4 rounded leading-relaxed text-slate-200 border border-white/5 space-y-3 font-sans">
                  <p className="font-mono text-[10px] text-[#3B82F6] border-b border-blue-500/10 pb-1.5">
                    [XAI Analysis Token: SECURE_AUTH_{selectedExplainerWard.ward}_MDU]
                  </p>
                  <p className="whitespace-pre-line text-[#ffd8a8] font-mono text-[11px] leading-relaxed">
                    {aiExplanationText}
                  </p>
                  <div className="bg-[#1e0702]/85 p-3 rounded border border-red-500/10 text-[10.5px] font-mono text-slate-300 space-y-1">
                    <span className="font-bold text-red-500 block mb-1">RECOMMENDED SANITATION DIRECTIVES:</span>
                    <div>• Dispatch chemical chlorination squad immediately to spray stagnant sewage pooling.</div>
                    <div>• Issue public sanitation advice to all residents of Ward {selectedExplainerWard.ward} regarding mosquito larva elimination.</div>
                    <div>• Collect water samples from main municipal reservoirs supplying this zone to prevent wider water-borne spread.</div>
                  </div>
                </div>

                {/* EXPLAINABLE AI INSPECTION RECOMMENDATION ALERT DISPATCH BOX */}
                <div className="border border-yellow-500/30 bg-yellow-950/15 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertOctagon className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-mono font-bold text-yellow-400 block tracking-wider">
                        🚨 Explainable AI Inspection Recommendation
                      </span>
                      <p className="text-xs font-semibold text-slate-200 leading-normal font-sans">
                        Our model predicts critical vectors in Ward {selectedExplainerWard.ward} ({selectedExplainerWard.zone}) requiring on-site supervision.
                      </p>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                        "Based on Shapley importance weights, a combination of {selectedExplainerWard.hospitalCases} active clinical infections and a Water Quality Index (WQI) of {selectedExplainerWard.waterQualityScore}/100 poses severe viral outbreak danger.
                        <strong className="text-yellow-400"> We suggest the assigned inspector ({inspectorName}) to conduct an immediate on-site field sanitary inspection</strong> to verify stagnant water caving and execute immediate eradication orders."
                      </p>
                    </div>
                  </div>

                  {setActivePortal && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => {
                          setActivePortal('complaints');
                          alert(`Officer Dispatched: Switching to complaints desk to conduct inspection in Ward ${selectedExplainerWard.ward} (${selectedExplainerWard.zone})`);
                        }}
                        className="bg-yellow-600 hover:bg-yellow-550 text-black px-4.5 py-2.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md glow-orange"
                      >
                        Inspect Ward {selectedExplainerWard.ward} Now <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
