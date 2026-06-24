/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Activity, ShieldAlert, Heart, Filter, UserCheck, 
  MapPin, PlusCircle, CheckCircle, Flame
} from 'lucide-react';
import { PatientRecord, DiseaseType, ZoneName, HOSPITALS_BY_ZONE, MADURAI_ZONES } from '../types';

// Safe non-blocking custom notification dispatcher to avoid iframe sandbox alert blocks (Script error)
const alert = (message: string) => {
  window.dispatchEvent(new CustomEvent('custom-toast', { detail: { message } }));
};

interface HospitalAnalyticsProps {
  patients: PatientRecord[];
  onReportCaseTriggered: (patient: any) => void;
  loggedInInspector?: any;
}

export default function HospitalAnalytics({ patients, onReportCaseTriggered, loggedInInspector }: HospitalAnalyticsProps) {
  const [diseaseFilter, setDiseaseFilter] = useState<DiseaseType | 'All'>('All');
  
  // If inspector login exists, lock them to their allocated municipality zone
  const inspectorZone = loggedInInspector?.zone;
  const [selectedZone, setSelectedZone] = useState<ZoneName | 'All'>(inspectorZone || 'All');

  // Diagnostic form state for reporting a clinical incident
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [caseZone, setCaseZone] = useState<ZoneName>(inspectorZone || 'North Zone');
  const [caseWard, setCaseWard] = useState<number>(() => {
    const defaultZone = inspectorZone || 'North Zone';
    return MADURAI_ZONES[defaultZone][0];
  });
  const [hospital, setHospital] = useState(() => {
    const defaultZone = inspectorZone || 'North Zone';
    return HOSPITALS_BY_ZONE[defaultZone][0];
  });
  const [disease, setDisease] = useState<DiseaseType>('Dengue');
  const [severity, setSeverity] = useState<'Low' | 'Moderate' | 'Critical'>('Moderate');
  const [submittingIncident, setSubmittingIncident] = useState(false);

  // Filter patients
  const filteredPatients = patients.filter(p => {
    const matchDisease = diseaseFilter === 'All' || p.disease === diseaseFilter;
    const matchZone = selectedZone === 'All' || p.zone === selectedZone;
    return matchDisease && matchZone;
  });

  // Recharts Chart 1: Prepare Disease Case Distribution
  const diseaseDistributionData = () => {
    const countMap: Record<string, number> = {};
    filteredPatients.forEach(p => {
      countMap[p.disease] = (countMap[p.disease] || 0) + 1;
    });

    return Object.entries(countMap).map(([disease, count]) => ({
      name: disease,
      Cases: count
    }));
  };

  // Recharts Chart 2: Prepare Gender Distribution
  const genderDistributionData = () => {
    const countMap = { Male: 0, Female: 0, Other: 0 };
    filteredPatients.forEach(p => {
      if (p.gender in countMap) {
        countMap[p.gender as 'Male'|'Female'|'Other']++;
      }
    });

    return Object.entries(countMap).map(([gender, count]) => ({
      name: gender,
      value: count
    }));
  };

  // 12-Wards with highest clinical epidemics outbreaks
  const topCriticalWardsLog = () => {
    const wardMap: Record<number, { ward: number; zone: ZoneName; count: number; diseaseList: Set<string> }> = {};
    patients.forEach(p => {
      if (!wardMap[p.ward]) {
        wardMap[p.ward] = { ward: p.ward, zone: p.zone, count: 0, diseaseList: new Set() };
      }
      wardMap[p.ward].count++;
      wardMap[p.ward].diseaseList.add(p.disease);
    });

    return Object.values(wardMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4); // Top 4 dual-trigger hotspots
  };

  const COLORS = ['#2563EB', '#3B82F6', '#06B6D4', '#8B5CF6', '#EC4899'];

  const handleSubmitIncident = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !age) {
      alert("Please provide the Patient Name and Age parameters.");
      return;
    }

    setSubmittingIncident(true);

    const payload = {
      name,
      age: Number(age),
      gender,
      zone: caseZone,
      ward: Number(caseWard),
      hospital,
      disease,
      severity
    };

    onReportCaseTriggered(payload);

    // Clear Form
    setName('');
    setAge('');
    setSubmittingIncident(false);
    alert("Live Clinical Incident submitted successfully! Database Risk scores will recalculate.");
  };

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Core Charts and Filters */}
        <div className="lg:col-span-8 glass-panel p-5 rounded-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-500/15 pb-4">
            <div>
              <h3 className="text-lg font-display font-bold text-[#3B82F6] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#3B82F6] animate-pulse" />
                Live Epidemiological Analytics Canvas
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Total Live Hospital Database Records: {patients.length} patients
              </p>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              {!loggedInInspector && (
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value as any)}
                  className="bg-[#1a1a1a] border border-blue-500/20 p-1.5 rounded outline-none focus:border-[#3B82F6] text-slate-200"
                >
                  <option value="All">All Corp Zones</option>
                  {Object.keys(MADURAI_ZONES).map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              )}

              <select
                value={diseaseFilter}
                onChange={(e) => setDiseaseFilter(e.target.value as any)}
                className="bg-[#1a1a1a] border border-blue-500/20 p-1.5 rounded outline-none focus:border-[#3B82F6] text-slate-200"
              >
                <option value="All">All Diseases</option>
                <option value="Dengue">Dengue</option>
                <option value="Cholera">Cholera</option>
                <option value="Typhoid">Typhoid</option>
                <option value="Malaria">Malaria</option>
                <option value="Diarrhoea">Diarrhoea</option>
                <option value="Hepatitis A">Hepatitis A</option>
                <option value="Leptospirosis">Leptospirosis</option>
                <option value="Food Poisoning">Food Poisoning</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1: Disease Case Numbers */}
            <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-blue-500/10">
              <span className="text-xs font-mono font-bold text-blue-400 block">
                Disease Breakdown Distribution (Categorical Count)
              </span>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={diseaseDistributionData()}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" stroke="#f1f5f9" fontSize={9} tickLine={false} />
                    <YAxis stroke="#f1f5f9" fontSize={9} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111111', border: '1px solid #3B82F6' }} />
                    <Bar dataKey="Cases" fill="#3B82F6">
                      {diseaseDistributionData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Gender Demographics Proportion */}
            <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-blue-500/10">
              <span className="text-xs font-mono font-bold text-blue-400 block">
                Infection Gender Share Proportion
              </span>
              <div className="h-56 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderDistributionData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {genderDistributionData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111111', border: '1px solid #3B82F6' }} />
                    <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Active Live Patient Database Table */}
          <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-blue-500/10">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span className="text-xs font-mono font-bold text-blue-400 block">
                Live Registered Epidemiological Logs
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Showing {filteredPatients.length} medical camp cases
              </span>
            </div>
            
            <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#111111] text-blue-400 sticky top-0">
                  <tr>
                    <th className="p-2">Patient Name</th>
                    <th className="p-2">Age/Gender</th>
                    <th className="p-2">Infection Type</th>
                    <th className="p-2">Clinical Severity</th>
                    <th className="p-2">Admitted Hospital</th>
                    <th className="p-2">Admission Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/5 text-slate-300">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-500">No matching hospital logs.</td>
                    </tr>
                  ) : (
                    filteredPatients.map(p => (
                      <tr key={p.id} className="hover:bg-blue-950/10 text-slate-350 transition-colors">
                        <td className="p-2 font-semibold text-white font-sans">{p.name}</td>
                        <td className="p-2">{p.age} / {p.gender.charAt(0)}</td>
                        <td className="p-2 text-rose-400 font-semibold">{p.disease}</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            p.severity === 'Critical' ? 'bg-red-950 text-red-400 border border-red-500/20' :
                            p.severity === 'Moderate' ? 'bg-yellow-950 text-yellow-400 border border-yellow-500/20' :
                            'bg-green-950 text-green-400 border border-green-500/20'
                          }`}>
                            {p.severity}
                          </span>
                        </td>
                        <td className="p-2 text-slate-400">{p.hospital}</td>
                        <td className="p-2 text-slate-400">{p.admissionDate}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CLINICAL REPORT PANEL: Add Live Records */}
        <div className="lg:col-span-4 glass-panel p-5 rounded-xl space-y-4">
          <div className="border-b border-blue-500/20 pb-2.5">
            <h3 className="text-md font-bold text-white flex items-center gap-1.5">
              <PlusCircle className="w-5 h-5 text-[#3B82F6]" />
              Report Live Medical Diagnosis
            </h3>
            <p className="text-xs text-slate-400">Clinician workspace to immediately upload verified typhoid, dengue or cholera patient incident mappings.</p>
          </div>

          <form onSubmit={handleSubmitIncident} className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-slate-300 text-[10.5px] mb-1">Patient Name</label>
              <input
                type="text"
                required
                placeholder="Ex: Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#111111] border border-blue-500/20 rounded py-2 px-3 text-white outline-none focus:border-[#3B82F6] font-mono text-xs animate-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 text-[10.5px] mb-1">Age (Years)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={110}
                  placeholder="34"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-[#111111] border border-blue-500/20 rounded py-2 px-3 text-white outline-none focus:border-[#3B82F6] font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-[10.5px] mb-1">Gender Segment</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-[#111111] border border-blue-500/20 rounded py-2 px-2.5 text-white outline-none focus:border-[#3B82F6] font-mono text-xs text-slate-200"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 text-[10.5px] mb-1">Identified Zone</label>
                <select
                  value={caseZone}
                  disabled={!!loggedInInspector}
                  onChange={(e) => {
                    const z = e.target.value as ZoneName;
                    setCaseZone(z);
                    setCaseWard(MADURAI_ZONES[z][0]);
                    setHospital(HOSPITALS_BY_ZONE[z][0]);
                  }}
                  className="w-full bg-[#111111] border border-blue-500/20 rounded py-2 px-2.5 text-white outline-none focus:border-[#3B82F6] font-mono text-xs text-slate-200 disabled:opacity-60"
                >
                  {Object.keys(MADURAI_ZONES).map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-[10.5px] mb-1">Municipal Ward</label>
                <select
                  value={caseWard}
                  onChange={(e) => setCaseWard(Number(e.target.value))}
                  className="w-full bg-[#111111] border border-blue-500/20 rounded py-2 px-2.5 text-white outline-none focus:border-[#3B82F6] font-mono text-xs text-slate-200"
                >
                  {MADURAI_ZONES[caseZone].map(wNum => (
                    <option key={wNum} value={wNum}>Ward {wNum}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-[10.5px] mb-1">Admitted Clinic / Hospital</label>
              <select
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className="w-full bg-[#111111] border border-blue-500/20 rounded py-2 px-2.5 text-white outline-none focus:border-[#3B82F6] font-mono text-xs text-slate-200"
              >
                {HOSPITALS_BY_ZONE[caseZone].map(hsp => (
                  <option key={hsp} value={hsp}>{hsp}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 text-[10.5px] mb-1">Disease Diagnostics</label>
                <select
                  value={disease}
                  onChange={(e) => setDisease(e.target.value as any)}
                  className="w-full bg-[#111111] border border-blue-500/20 rounded py-2 px-2.5 text-white outline-none focus:border-[#3B82F6] font-mono text-xs text-slate-200"
                >
                  <option value="Dengue">Dengue</option>
                  <option value="Cholera">Cholera</option>
                  <option value="Typhoid">Typhoid</option>
                  <option value="Malaria">Malaria</option>
                  <option value="Diarrhoea">Diarrhoea</option>
                  <option value="Hepatitis A">Hepatitis A</option>
                  <option value="Leptospirosis">Leptospirosis</option>
                  <option value="Food Poisoning">Food Poisoning</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-[10.5px] mb-1">Severe Level</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full bg-[#111111] border border-blue-500/20 rounded py-2 px-2.5 text-white outline-none focus:border-[#3B82F6] font-mono text-xs text-slate-200"
                >
                  <option value="Low">Low</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingIncident}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-950 text-white font-bold py-2.5 rounded font-mono transition-all hover:shadow-lg text-xs"
            >
              {submittingIncident ? 'Registering Entry...' : 'Submit Incident Entry'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
