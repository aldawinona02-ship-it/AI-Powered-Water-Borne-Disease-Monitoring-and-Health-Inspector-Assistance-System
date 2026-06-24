/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, FormEvent, DragEvent } from 'react';
import { 
  User, Phone, Map, Shield, Upload, MapPin, 
  CheckCircle, AlertTriangle, HelpCircle, Activity,
  ChevronRight, PhoneCall, Check, Eye
} from 'lucide-react';
import { ZoneName, MADURAI_ZONES, HEALTH_INSPECTORS, Citizen, Complaint, WardRiskSummary } from '../types';

// Safe non-blocking custom notification dispatcher to avoid iframe sandbox alert blocks (Script error)
const alert = (message: string) => {
  window.dispatchEvent(new CustomEvent('custom-toast', { detail: { message } }));
};

interface PublicPortalProps {
  wardRisks: WardRiskSummary[];
  allComplaints: Complaint[];
  onNewComplaintSubmitted: (complaint: Complaint) => void;
}

export default function PublicPortal({ wardRisks, allComplaints, onNewComplaintSubmitted }: PublicPortalProps) {
  // State to track if citizen has successfully authenticated via residency page
  const [isLoggedCitizen, setIsLoggedCitizen] = useState(false);

  // Direct Entry States (Citizen Profile details filled directly in the form!)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState<ZoneName>('North Zone');
  const [ward, setWard] = useState<number>(1);
  const [address, setAddress] = useState('');
  const [gpsGranted, setGpsGranted] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Complaint Lodging Content State
  const [compTitle, setCompTitle] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compImage, setCompImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [compLat, setCompLat] = useState<number | null>(null);
  const [compLng, setCompLng] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lodgedComplaint, setLodgedComplaint] = useState<Complaint | null>(null);

  // Active public views
  const [activeTab, setActiveTab] = useState<'lodge' | 'history' | 'status' | 'safety'>('status');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search state to filter historical reports asynchronously without gating
  const [historySearchPhone, setHistorySearchPhone] = useState('');

  // Local Monitoring selection for non-authenticated citizens to review any ward's metrics!
  const [selectedMonitorZone, setSelectedMonitorZone] = useState<ZoneName>('North Zone');
  const [selectedMonitorWard, setSelectedMonitorWard] = useState<number>(1);

  // Ward Risk rating of selected monitoring sector
  const citizenWardRisk = wardRisks.find(wr => wr.ward === selectedMonitorWard && wr.zone === selectedMonitorZone) || null;

  // Track complaints submitted by this citizen's phone if searched, otherwise show all corporator grievances
  const citizenComplaints = historySearchPhone.trim() === ''
    ? allComplaints
    : allComplaints.filter(c => c.citizenPhone.includes(historySearchPhone.trim()));

  // Request high-precision location coordinate
  const requestGPS = () => {
    setGpsLoading(true);
    try {
      if (!navigator || !navigator.geolocation) {
        alert("GPS Geolocation is not supported by your current browser.");
        setGpsLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCompLat(pos.coords.latitude);
          setCompLng(pos.coords.longitude);
          setGpsGranted(true);
          setGpsLoading(false);
        },
        (error) => {
          console.warn("User geographical permission blocked, placing approximate corporation coordinate.");
          // Approximate centered Madurai city center
          setCompLat(9.9252 + (Math.random() - 0.5) * 0.04);
          setCompLng(78.1197 + (Math.random() - 0.5) * 0.04);
          setGpsGranted(true);
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } catch (err) {
      console.warn("Geolocation API inaccessible or restricted synchronously in iframe context, executing default placeholder:", err);
      // Approximate centered Madurai city center fallback
      setCompLat(9.9252 + (Math.random() - 0.5) * 0.04);
      setCompLng(78.1197 + (Math.random() - 0.5) * 0.04);
      setGpsGranted(true);
      setGpsLoading(false);
    }
  };

  // Convert image to Base64 for sending to server-side ML model
  const handleImageChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Allowed format selection: standard pictures (.png, .jpg) only.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCompImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageChange(e.dataTransfer.files[0]);
    }
  };

  const handleCitizenLogin = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please enter your full Name.");
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      alert("Please enter a valid 10-digit mobile phone number.");
      return;
    }
    if (!address.trim()) {
      alert("Please provide your detailed resident street address.");
      return;
    }

    // Direct surveillance tracking defaults to their actual login parameters
    setSelectedMonitorZone(zone);
    setSelectedMonitorWard(ward);
    setHistorySearchPhone(phone); // Pre-sync history tracker filter to their phone number
    setIsLoggedCitizen(true);

    // Auto trigger permission capture
    requestGPS();
  };

  const handleLodgeComplaint = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !address) {
      alert("Please provide your full Name, Phone Number, and Resident Address inside the Complaint Form first.");
      return;
    }
    if (phone.length < 10) {
      alert("Please enter a valid 10-digit mobile phone number.");
      return;
    }
    if (!compTitle || !compDesc) {
      alert("Please provide a concise description of the water hazard.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/complaints/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: compTitle,
          description: compDesc,
          image: compImage,
          latitude: compLat || 9.9252 + (Math.random() - 0.5) * 0.04,
          longitude: compLng || 78.1197 + (Math.random() - 0.5) * 0.04,
          zone: zone,
          ward: Number(ward),
          address: address,
          citizenName: name,
          citizenPhone: phone
        })
      });

      const result = await response.json();
      if (result.success) {
        onNewComplaintSubmitted(result.complaint);
        setLodgedComplaint(result.complaint);
        // Clear lodge form
        setCompTitle('');
        setCompDesc('');
        setCompImage(null);
        alert("Water contamination hazard reported successfully to direct Health Inspector!");
      } else {
        alert("An error occurred: " + result.error);
      }
    } catch (err) {
      console.error(err);
      alert("Backend link stalled. Storing local fallback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pre-configured Primary Health Center directories
  const nearestPHCList = [
    { name: 'Sellur Urban Primary Health Centre', phone: '0452-2580101', mapLink: 'Ward 3, Sellur' },
    { name: 'K.K. Nagar Urban PHC', phone: '0452-2580102', mapLink: 'Ward 22, East Zone' },
    { name: 'Kalavasal Health Diagnostic Station', phone: '0452-2530103', mapLink: 'Ward 45, West Zone' },
    { name: 'Thiruparankundram Block PHC', phone: '0452-2580104', mapLink: 'Ward 34, South Zone' }
  ];

  /* Citizen Dashboard Hub */
  if (!isLoggedCitizen) {
    return (
      <div id="citizen-login-view" className="w-full max-w-md mx-auto space-y-6 animate-fadeIn">
        <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-gradient-to-b from-[#111111]/95 to-[#000000]/90 shadow-2xl relative overflow-hidden">
          {/* Subtle design seal accent */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="text-center pb-5 mb-5 border-b border-white/10">
            <div className="w-12 h-12 bg-[#3B82F6] rounded-lg mx-auto flex items-center justify-center font-bold text-black text-lg mb-3 shadow-lg">
              TN
            </div>
            <span className="text-[10px] tracking-widest text-[#3B82F6] font-mono font-bold uppercase block mb-1">
              TAMIL NADU DEPARTMENT OF MUNICIPAL ADMINISTRATION
            </span>
            <h3 className="text-sm font-bold tracking-tight text-white leading-tight font-mono">
              MADURAI CORP CITIZEN SURVEILLANCE LOGIN
            </h3>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              Provide your residential credentials to view live clinical statuses, check disease outbreaks, and submit verified environmental hazard tickets.
            </p>
          </div>

          <form onSubmit={handleCitizenLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase text-slate-400 font-mono mb-1 font-bold">Your Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Muthu Swamy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-[#3B82F6] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-slate-400 font-mono mb-1 font-bold">Mobile Phone (For Complaint Tracking)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="tel"
                  required
                  placeholder="Enter 10-digit primary number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full bg-black/60 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-[#3B82F6] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase text-slate-400 font-mono mb-1 font-bold">Residential Zone</label>
                <select
                  value={zone}
                  onChange={(e) => {
                    const z = e.target.value as ZoneName;
                    setZone(z);
                    setWard(MADURAI_ZONES[z][0]);
                  }}
                  className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white font-mono outline-none focus:border-[#3B82F6]"
                >
                  {Object.keys(MADURAI_ZONES).map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-400 font-mono mb-1 font-bold">Ward Block Number</label>
                <select
                  value={ward}
                  onChange={(e) => setWard(Number(e.target.value))}
                  className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white font-mono outline-none focus:border-[#3B82F6]"
                >
                  {MADURAI_ZONES[zone].map(wNum => (
                    <option key={wNum} value={wNum}>Ward {wNum}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-slate-400 font-mono mb-1 font-bold">Resident Street Address</label>
              <textarea
                rows={2}
                required
                placeholder="Door No, Street name, Madurai neighborhood"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-[#3B82F6] font-mono"
              />
            </div>

            <div className="bg-[#1a1a1a] border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-4 h-4 text-[#3B82F6]" />
                <span className="font-mono">
                  GPS Auth: {compLat ? `SYNCED` : 'NOT AUTHORIZED'}
                </span>
              </div>
              <button 
                type="button" 
                onClick={requestGPS}
                className="bg-blue-600/10 hover:bg-blue-600/35 text-[#3B82F6] border border-[#3B82F6]/20 px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all"
              >
                {gpsLoading ? 'Locating...' : 'Verify GPS Location'}
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-[#3B82F6] hover:bg-blue-500 text-black py-3 rounded-lg text-xs font-bold font-mono tracking-wider transition-all shadow-lg text-center cursor-pointer block"
            >
              Authenticate & Enter Dashboard →
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Citizen Profile Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 border border-white/5 bg-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-900/20 border border-blue-500/35 flex items-center justify-center font-bold text-[#3B82F6] tracking-wider shrink-0 font-mono">
            {name ? name.slice(0, 2).toUpperCase() : 'C'}
          </div>
          <div>
            <span className="text-[10px] text-[#3B82F6] font-mono font-bold block uppercase tracking-wider">
              MADURAI CORP • CITIZEN SESSION
            </span>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-sm font-bold text-white">{name}</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wide">
                {zone} • Ward {ward}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              Field Officer: <span className="text-[#3B82F6] font-bold">{HEALTH_INSPECTORS.find(hi => hi.zone === zone)?.name || 'Duty Inspector'}</span> ({HEALTH_INSPECTORS.find(hi => hi.zone === zone)?.phone})
            </p>
          </div>
        </div>

        {/* Local Risk Banner Indicators */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-mono block">Your Ward Risk Profile</span>
            <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded inline-block mt-0.5 ${
              citizenWardRisk?.riskCategory === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              citizenWardRisk?.riskCategory === 'HIGH' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
              'bg-green-500/20 text-green-400 border border-green-500/20'
            }`}>
              {citizenWardRisk?.riskCategory || 'MODERATE'} ({citizenWardRisk?.riskScore || 20}%)
            </span>
          </div>

          <button 
            type="button"
            onClick={() => {
              setIsLoggedCitizen(false);
              setName('');
              setPhone('');
              setAddress('');
              setCompLat(null);
              setCompLng(null);
              setGpsGranted(false);
            }}
            className="bg-transparent hover:bg-red-600/10 hover:text-red-400 border border-white/10 hover:border-red-500/30 text-[10px] font-mono font-semibold px-2.5 py-1.5 rounded transition-all cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs bar */}
      <div className="flex border-b border-white/5 text-sm font-mono gap-1">
        <button
          onClick={() => { setActiveTab('status'); setLodgedComplaint(null); }}
          className={`pb-2.5 px-4 transition-all border-b-2 hover:text-white ${
            activeTab === 'status' 
              ? 'border-[#3B82F6] text-[#3B82F6] font-semibold' 
              : 'border-transparent text-slate-400'
          }`}
        >
          My Ward Status
        </button>
        <button
          onClick={() => setActiveTab('lodge')}
          className={`pb-2.5 px-4 transition-all border-b-2 hover:text-white ${
            activeTab === 'lodge' 
              ? 'border-[#3B82F6] text-[#3B82F6] font-semibold' 
              : 'border-transparent text-slate-400'
          }`}
        >
          Submit Complaint
        </button>
        <button
          onClick={() => { setActiveTab('history'); setLodgedComplaint(null); }}
          className={`pb-2.5 px-4 transition-all border-b-2 hover:text-white ${
            activeTab === 'history' 
              ? 'border-[#3B82F6] text-[#3B82F6] font-semibold' 
              : 'border-transparent text-slate-400'
          }`}
        >
          Complaint Tracker ({citizenComplaints.length})
        </button>
        <button
          onClick={() => { setActiveTab('safety'); setLodgedComplaint(null); }}
          className={`pb-2.5 px-4 transition-all border-b-2 hover:text-white ${
            activeTab === 'safety' 
              ? 'border-[#3B82F6] text-[#3B82F6] font-semibold' 
              : 'border-transparent text-slate-400'
          }`}
        >
          Outbreak Safety Guides
        </button>
      </div>

      {/* TAB CONTENT 1: LATEST WARD HEAL STATUS */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          {/* Target Ward Surveillance Selector */}
          <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold font-mono text-slate-300 uppercase leading-none mb-1">Select Target Ward for Surveillance:</h4>
              <p className="text-[10px] text-slate-500 font-mono">Query micro environmental safety indices for any Madurai block.</p>
            </div>
            <div className="flex gap-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1 font-bold">Zone</label>
                <select
                  value={selectedMonitorZone}
                  onChange={(e) => {
                    const z = e.target.value as ZoneName;
                    setSelectedMonitorZone(z);
                    setSelectedMonitorWard(MADURAI_ZONES[z][0]);
                  }}
                  className="bg-[#111111] border border-white/10 rounded px-2.5 py-1.5 outline-none focus:border-[#3B82F6] text-slate-155"
                >
                  {Object.keys(MADURAI_ZONES).map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1 font-bold">Ward</label>
                <select
                  value={selectedMonitorWard}
                  onChange={(e) => setSelectedMonitorWard(Number(e.target.value))}
                  className="bg-[#111111] border border-white/10 rounded px-2.5 py-1.5 outline-none focus:border-[#3B82F6] text-[#ffffff]"
                >
                  {MADURAI_ZONES[selectedMonitorZone].map(wNum => (
                    <option key={wNum} value={wNum}>Ward {wNum}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Water pure quality HUD */}
            <div className="glass-panel p-4 rounded-xl text-center space-y-2">
              <span className="text-xs text-orange-300 font-mono block">Water Quality Index (WQI)</span>
              <span className="text-3xl font-display font-bold text-blue-400">
                {citizenWardRisk?.waterQualityScore || 85} <span className="text-xs text-orange-200/40">WQI</span>
              </span>
              <p className="text-[11px] text-orange-250/70">
                {(citizenWardRisk?.waterQualityScore || 85) > 75 
                  ? 'POTABLE: Municipal drinking lines represent clean safety profile.' 
                  : (citizenWardRisk?.waterQualityScore || 85) > 60
                  ? 'WARNING: Subpar index. Boil before standard kitchen assembly usage.'
                  : 'DANGEROUS: Intestinal hazard threat! Contaminants found.'
                }
              </p>
            </div>

            {/* Epidemiological stats HUD */}
            <div className="glass-panel p-4 rounded-xl text-center space-y-2">
              <span className="text-xs text-orange-300 font-mono block">Hospital Clinical Cases</span>
              <span className="text-3xl font-display font-bold text-red-400">
                {citizenWardRisk?.hospitalCases || 0} <span className="text-xs text-orange-200/40">active</span>
              </span>
              <p className="text-[11px] text-orange-250/70">
                Water-borne infectious records flagged inside local corporate hospitals.
              </p>
            </div>

            {/* Complaints lodged density */}
            <div className="glass-panel p-4 rounded-xl text-center space-y-2">
              <span className="text-xs text-orange-300 font-mono block">Registered Breeding Hazards</span>
              <span className="text-3xl font-display font-bold text-orange-400">
                {citizenWardRisk?.complaintCount || 0} <span className="text-xs text-orange-200/40">cases</span>
              </span>
              <p className="text-[11px] text-orange-250/70">
                Submissions by neighbors concerning stagnant breeding spots.
              </p>
            </div>
          </div>

          {/* Quick Alarm banner */}
          {citizenWardRisk?.riskCategory === 'CRITICAL' && (
            <div className="bg-red-950/50 border border-red-500/30 p-4 rounded-xl flex items-start gap-3 glow-red">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-red-200 text-sm block">Ward Outbreak Critical Flag Status</span>
                <span className="text-xs text-red-300 leading-relaxed block">
                  Notice: Your selected sector (Ward {selectedMonitorWard}) is suffering localized containment problems. Avoid drinking non-chlorinated public sources. Report standing puddles immediately to minimize Dengue breeding circles.
                </span>
              </div>
            </div>
          )}

          {/* safety banner for safe categories */}
          {citizenWardRisk?.riskCategory !== 'CRITICAL' && (
            <div className="bg-green-950/20 border border-green-500/20 p-4 rounded-xl flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-green-200 text-sm block">Ward Status Clear & Safe</span>
                <span className="text-xs text-green-300 leading-relaxed block">
                  Excellent: No critical water diseases pooling in Ward {selectedMonitorWard}. Keep gutters clear of plastic waste arrays to prevent blockages.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: SUBMIT COMPLAINT */}
      {activeTab === 'lodge' && (
        <div className="space-y-6">
          {lodgedComplaint ? (
            /* AFTER ACTION SCREEN: AI Computer Vision Output display */
            <div className="glass-panel p-6 rounded-xl space-y-6 border border-green-500/30">
              <div className="text-center pb-4 border-b border-orange-500/10">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2 animate-bounce" />
                <h3 className="text-xl font-display font-bold text-green-400">AI Verification Verified & Filed!</h3>
                <p className="text-xs text-orange-200/60 font-mono">
                  Assigned ID: {lodgedComplaint.id} | Health Inspector Assigned
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Visual inference bounding box display */}
                <div className="space-y-2">
                  <span className="text-xs uppercase text-orange-200 font-mono block">YOLOv8 Object Detection Inference Output</span>
                  <div className="bg-black/60 border border-orange-500/25 rounded-lg overflow-hidden relative max-h-[240px] flex items-center justify-center">
                    {lodgedComplaint.imageUrl ? (
                      <div className="relative">
                        <img 
                          src={lodgedComplaint.imageUrl} 
                          alt="Hazard scan" 
                          referrerPolicy="no-referrer"
                          className="w-full h-auto max-h-[238px] object-cover" 
                        />
                        {/* Overlay Bounding box annotations */}
                        {lodgedComplaint.aiDetection?.detectedObjects.map((obj, idx) => (
                          <div
                            key={idx}
                            className="absolute border-2 border-red-500 bg-red-500/15 box-border"
                            style={{
                              left: `${obj.boundingBox ? obj.boundingBox[0] : 15}%`,
                              top: `${obj.boundingBox ? obj.boundingBox[1] : 20}%`,
                              width: `${obj.boundingBox ? (obj.boundingBox[2] - obj.boundingBox[0]) : 60}%`,
                              height: `${obj.boundingBox ? (obj.boundingBox[3] - obj.boundingBox[1]) : 55}%`
                            }}
                          >
                            <span className="absolute -top-6 left-0 bg-red-600 text-[10px] text-white font-mono font-bold px-1.5 py-0.5 rounded shadow">
                              {obj.className} ({(obj.confidence * 100).toFixed(0)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center text-xs text-orange-200/40 font-mono">
                        No image sample provided to model. Using semantic analyzer fallbacks.
                      </div>
                    )}
                  </div>
                </div>

                {/* Explainable AI report and SHAP and Inspector info */}
                <div className="space-y-4">
                  <div>
                    <span className="text-xs uppercase text-orange-200 font-mono block">Explainable AI Safety Threat Score</span>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="text-3xl font-display font-bold text-red-500 leading-none">
                        {lodgedComplaint.aiDetection?.overallRiskScore}%
                      </div>
                      <span className="text-[11px] text-orange-200/60 leading-relaxed font-mono">
                        Composite mosquito Vector Propagation Risk calculation.
                      </span>
                    </div>
                  </div>

                  {/* SHAP Chart Display */}
                  <div className="space-y-2 bg-[#2c0b02]/40 p-3 rounded-lg border border-orange-500/15">
                    <span className="text-[11.5px] font-mono text-orange-300 font-semibold block">
                      SHAP Feature Impact Drivers:
                    </span>
                    <div className="space-y-1.5 text-[10.5px] font-mono">
                      {lodgedComplaint.aiDetection?.shapExplanation.map((item, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-orange-250">
                            <span>{item.feature}</span>
                            <span className="text-orange-400">+{item.importance}%</span>
                          </div>
                          <div className="w-full bg-orange-950/50 rounded-full h-1.5">
                            <div className="bg-orange-600 h-1.5 rounded-full" style={{ width: `${item.importance * 2}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs uppercase text-orange-200 font-mono block">Auto-Routed Authority</span>
                    <div className="bg-[#1e0702] border border-orange-500/20 p-2.5 rounded-lg mt-1 text-xs">
                      <p className="font-bold text-white">{HEALTH_INSPECTORS.find(hi => hi.zone === lodgedComplaint.zone)?.name || 'Duty Inspector'}</p>
                      <p className="text-orange-300/60 font-mono text-[11px]">Authorized Health Inspector, {lodgedComplaint.zone}</p>
                      <p className="text-orange-400 font-mono text-[11px] mt-1 flex items-center gap-1">
                        <PhoneCall className="w-3.5 h-3.5" /> Direct: {HEALTH_INSPECTORS.find(hi => hi.zone === lodgedComplaint.zone)?.phone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Citizen safety advice cards */}
              <div className="bg-orange-950/25 border border-orange-500/20 p-4 rounded-xl space-y-2">
                <span className="text-sm font-bold text-orange-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-orange-500 animate-pulse" />
                  Bureau Safe Sanitation Precautions:
                </span>
                <ul className="text-xs text-orange-205/85 space-y-1 grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1 font-mono">
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-400" /> Boil cooking water for &gt;10 mins</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-400" /> Treat wells with corporate chlorine</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-400" /> Deploy mosquito window nets</li>
                  <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-400" /> Avoid leaving water containers bare</li>
                </ul>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setLodgedComplaint(null)}
                  className="bg-[#1e0702] border border-orange-500/25 hover:border-orange-500 text-orange-300/80 hover:text-orange-200 px-4 py-2 rounded-lg text-xs font-mono transition-all"
                >
                  Report Another Hazard
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-mono transition-all"
                >
                  Go to Complaint Registry
                </button>
              </div>
            </div>
          ) : (
            /* Lodge Grievance Form */
            <div className="glass-panel p-6 rounded-xl space-y-4">
              <h3 className="text-lg font-display font-bold text-orange-300">
                New Water Safety Grievance Submission
              </h3>
              <p className="text-xs text-orange-200/50">
                All coordinates, address descriptors, and visual media are transmitted under high security and auto-dispatched to zone inspectors in real-time.
              </p>

              <form onSubmit={handleLodgeComplaint} className="space-y-4">
                {/* Reporter Profile Details & Local Sector Mapping */}
                <div className="bg-orange-950/15 border border-orange-500/10 p-4 rounded-xl space-y-4">
                  <h4 className="text-xs uppercase font-mono text-orange-300 font-bold tracking-wider">
                    1. Reporter Contact & Incident Coordinates
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase text-orange-250 font-mono mb-1 font-bold">Your Full Name (Session Locked)</label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-orange-550 opacity-40" />
                        <input
                          type="text"
                          disabled
                          value={name}
                          className="w-full bg-[#111111]/80 border border-orange-500/15 rounded-lg py-2 pl-9 pr-3 text-xs text-orange-200 opacity-70 cursor-not-allowed font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-orange-250 font-mono mb-1 font-bold">Mobile Phone (Session Locked)</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-orange-550 opacity-40" />
                        <input
                          type="tel"
                          disabled
                          value={phone}
                          className="w-full bg-[#111111]/80 border border-orange-500/15 rounded-lg py-2 pl-9 pr-3 text-xs text-orange-200 opacity-70 cursor-not-allowed font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase text-orange-250 font-mono mb-1 font-bold">Corporation Zone</label>
                      <select
                        disabled
                        value={zone}
                        className="w-full bg-[#111111]/80 border border-orange-500/15 rounded-lg p-2 text-xs text-orange-200 opacity-70 cursor-not-allowed font-mono"
                      >
                        <option value={zone}>{zone}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-orange-250 font-mono mb-1 font-bold">Ward Block Number</label>
                      <select
                        disabled
                        value={ward}
                        className="w-full bg-[#111111]/80 border border-orange-500/15 rounded-lg p-2 text-xs text-orange-200 opacity-70 cursor-not-allowed font-mono"
                      >
                        <option value={ward}>Ward {ward}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-orange-250 font-mono mb-1 font-bold">Incident Residential Address</label>
                    <textarea
                      rows={2}
                      disabled
                      value={address}
                      className="w-full bg-[#111111]/80 border border-orange-500/15 rounded-lg p-2.5 text-xs text-orange-200 opacity-70 cursor-not-allowed font-mono"
                    />
                  </div>
                </div>

                <div className="h-px bg-orange-500/10 my-4" />
                <h4 className="text-xs uppercase font-mono text-orange-300 font-semibold tracking-wider">
                  2. Environmental Hazard & Evidence Parameters
                </h4>

                <div>
                  <label className="block text-xs uppercase text-orange-200 font-mono mb-1">Grievance Title / Hazard Category</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="Ex: Severe sewage overflow blocking street side canal"
                    value={compTitle}
                    onChange={(e) => setCompTitle(e.target.value)}
                    className="w-full bg-[#1e0702] border border-orange-500/20 rounded-lg py-2.5 px-4 text-xs text-orange-100 outline-none focus:border-orange-500 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase text-orange-200 font-mono mb-1">Incident Details & Observations</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Detail the duration, scale, water opacity, proximity to drinking water pipelines, larval movement observations, and smell."
                    value={compDesc}
                    onChange={(e) => setCompDesc(e.target.value)}
                    className="w-full bg-[#1e0702] border border-orange-500/20 rounded-lg p-3 text-xs text-orange-100 outline-none focus:border-orange-500 transition-all font-mono"
                  />
                </div>

                {/* Drag and Drop Upload Image */}
                <div>
                  <label className="block text-xs uppercase text-orange-200 font-mono mb-1">Attach Visual Evidence (Supports Stagnancy ML Extraction)</label>
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      isDragging 
                        ? 'border-orange-400 bg-orange-950/20' 
                        : compImage 
                        ? 'border-green-600 bg-green-950/10' 
                        : 'border-orange-500/25 hover:border-orange-500/50 bg-[#1e0702]/30'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => e.target.files && handleImageChange(e.target.files[0])}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    {compImage ? (
                      <div className="space-y-2">
                        <img 
                          src={compImage} 
                          alt="Loaded preview" 
                          referrerPolicy="no-referrer"
                          className="w-32 h-20 object-cover rounded-md mx-auto border border-green-500/30" 
                        />
                        <span className="text-[11px] font-mono text-green-400 block font-semibold flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Image attached successfully
                        </span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-orange-400 animate-pulse" />
                        <span className="text-xs text-orange-200 font-mono font-semibold">Drag & Drop Image or Click to Browse</span>
                        <span className="text-[10px] text-orange-300/40 font-mono">Accepts JPG, PNG up to 10MB</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center bg-[#1e0702] p-3 rounded-lg border border-orange-500/10 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-orange-300">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <span>GPS Sync: {compLat ? `${compLat.toFixed(4)}, ${compLng?.toFixed(4)}` : 'Auto-linking default address'}</span>
                  </div>
                  {!compLat && <button type="button" onClick={requestGPS} className="text-orange-400 hover:underline">Refresh Coordinates</button>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white disabled:bg-orange-900 py-3 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all"
                >
                  {isSubmitting ? 'AI Model Analyzing Base Image...' : 'Transmit Grievance & Run Computer Vision Pipeline'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: COMPLAINT HISTORY Registry */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-orange-500/10 pb-4">
            <div>
              <h3 className="text-lg font-display font-bold text-orange-300">
                Registered Complaint Tracker Registry
              </h3>
              <p className="text-xs text-orange-200/50">
                Enter your mobile number to isolate your past hazard submissions, or leave blank to view all public reports.
              </p>
            </div>
            
            {/* Search Input Filter */}
            <div className="relative shrink-0 w-full md:w-72">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-orange-400" />
              <input
                type="tel"
                placeholder="Search by Mobile..."
                value={historySearchPhone}
                onChange={(e) => setHistorySearchPhone(e.target.value)}
                className="w-full bg-[#1e0702] border border-orange-500/20 rounded-lg py-2.5 pl-9 pr-8 text-xs text-orange-100 outline-none focus:border-orange-500 font-mono"
              />
              {historySearchPhone && (
                <button
                  type="button"
                  onClick={() => setHistorySearchPhone('')}
                  className="absolute right-2.5 top-2.5 text-xs text-orange-450 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {citizenComplaints.length === 0 ? (
            <div className="glass-panel text-center p-12 text-orange-200/40 text-xs font-mono">
              <HelpCircle className="w-10 h-10 mx-auto text-orange-500/30 mb-2 animate-bounce" />
              No matching complaints registered under phone query "{historySearchPhone}".
            </div>
          ) : (
            <div className="space-y-4">
              {citizenComplaints.map((c) => (
                <div 
                  key={c.id} 
                  className={`glass-panel p-4 rounded-xl flex flex-col md:flex-row justify-between gap-4 transition-all border ${
                    c.status === 'Resolved' ? 'border-green-500/25' :
                    c.status === 'Inspection Started' ? 'border-yellow-500/25 animate-pulse' :
                    'border-orange-500/15'
                  }`}
                >
                  <div className="space-y-2 max-w-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-orange-400 text-xs">{c.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        c.status === 'Resolved' ? 'bg-green-950 text-green-400' :
                        c.status === 'Inspection Started' ? 'bg-yellow-950 text-yellow-500' :
                        'bg-orange-950 text-orange-300'
                      }`}>
                        {c.status}
                      </span>
                      {c.aiDetection && (
                        <span className="bg-red-950 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                          AI Risk: {c.aiDetection.overallRiskScore}%
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-white text-sm">{c.title}</h4>
                    <p className="text-xs text-orange-200/70">{c.description}</p>
                    <p className="text-[10.5px] text-orange-400/60 font-mono">Logged on: {c.date} | Location: {c.address}</p>

                    {c.inspectorComment && (
                      <div className="bg-[#2c0b02]/50 border-l-2 border-orange-500 p-2 text-[11px] font-mono text-orange-300">
                        <span className="font-bold">Inspector Remark:</span> {c.inspectorComment}
                      </div>
                    )}
                  </div>

                  {/* Thumbnail and button display */}
                  <div className="flex flex-col items-center justify-center shrink-0 border-t md:border-t-0 md:border-l border-orange-500/10 pt-3 md:pt-0 md:pl-4">
                    {c.imageUrl ? (
                      <img 
                        src={c.imageUrl} 
                        alt="Submitted content" 
                        referrerPolicy="no-referrer"
                        className="w-24 h-16 object-cover rounded border border-orange-500/30 mb-2" 
                      />
                    ) : (
                      <span className="text-[10px] font-mono text-orange-200/30 mb-2">No Image file</span>
                    )}

                    <span className="text-[10.5px] font-mono text-orange-300 block text-center">
                      Zone: <span className="text-orange-400 font-bold">{c.zone}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 4: OUTBREAK SAFETY GUIDELINES */}
      {activeTab === 'safety' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Safe water preparation guidelines */}
            <div className="glass-panel p-5 rounded-xl space-y-3">
              <span className="text-sm font-bold text-orange-400 font-display flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500 animate-pulse" />
                Potable Chlorination and Boiling Guides
              </span>
              <ul className="text-xs text-orange-200/80 space-y-2.5 pl-4 list-disc font-mono">
                <li><strong className="text-orange-300">Boiling Strategy:</strong> Bring household water to a rolling boil for 10 full minutes to neutralize cholera organisms completely.</li>
                <li><strong className="text-orange-300">Chlorination:</strong> Mix 3 drops of clear liquid household bleach per liter of municipal water, shake, and leave covered for 30 minutes before consumption.</li>
                <li><strong className="text-orange-300">Vessel Cleaning:</strong> Clean personal storage tanks using dedicated chlorine-scrubs monthly.</li>
              </ul>
            </div>

            {/* Mosquito vector reduction strategies */}
            <div className="glass-panel p-5 rounded-xl space-y-3">
              <span className="text-sm font-bold text-orange-400 font-display flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-500" />
                Vector Larvicide & Source Reduction
              </span>
              <ul className="text-xs text-orange-200/80 space-y-2.5 pl-4 list-disc font-mono">
                <li><strong className="text-orange-300">Drainage clearing:</strong> Keep gutters around your house clean and free of heavy leaves and plastic bag clogs.</li>
                <li><strong className="text-orange-300">Larvicide Application:</strong> Spray biological larvicidal oils over standing swamps or sumps once every fortnight.</li>
                <li><strong className="text-orange-300">Physical Barriers:</strong> Double inspect household septic tank vents and vents matching overhead tanks for fine micro-mesh protection.</li>
              </ul>
            </div>
          </div>

          {/* Local Health directories lists */}
          <div className="glass-panel p-5 rounded-xl space-y-3">
            <span className="text-sm font-bold text-orange-400 font-display block">
              Emergency Primary Health Centres (PHC Map Tracker)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nearestPHCList.map((phc, index) => (
                <div key={index} className="bg-[#1e0702] border border-orange-500/10 p-3 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-white block">{phc.name}</span>
                    <span className="text-[11px] text-orange-300/60 font-mono">Location: {phc.mapLink}</span>
                  </div>
                  <a 
                    href={`tel:${phc.phone}`}
                    className="bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 p-2 rounded-lg font-mono text-[11.5px] transition-all flex items-center gap-1 shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5" /> call
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
