/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  HEALTH_INSPECTORS, 
  HOSPITALS_BY_ZONE, 
  MADURAI_ZONES, 
  ZoneName, 
  DiseaseType, 
  PatientRecord, 
  Complaint, 
  WardRiskSummary, 
  AIDetectionResult
} from './src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Set up larger limits for base64 image uploads
app.use(express.json({ limit: '15mb' }));

// Initial Simulated Database State
let complaints: Complaint[] = [];
let patients: PatientRecord[] = [];
// Water quality registers for each ward (from 30 to 95)
const wardWaterQuality: Record<number, number> = {};

// Helper: Generate Random integer
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper: Generate seed data
function initializeDatabase() {
  console.log("Initializing Simulated Database...");

  // 1. Initialize Water Quality Index (WQI) for all wards
  // Pure is around 90-100. Toxic is below 50.
  Object.values(MADURAI_ZONES).forEach(wards => {
    wards.forEach(ward => {
      // Create some critical zones across all five jurisdictions
      if (ward === 3 || ward === 22 || ward === 54 || ward === 45 || ward === 92) {
        wardWaterQuality[ward] = randomInt(35, 52); // Contaminated WQI
      } else if (ward === 7 || ward === 12 || ward === 27 || ward === 41 || ward === 83) {
        wardWaterQuality[ward] = randomInt(55, 68); // Moderate
      } else {
        wardWaterQuality[ward] = randomInt(75, 96); // Ideal / Low Risk
      }
    });
  });

  // 2. Generate Simulated Patients (circa 150 patients with water-borne infections)
  const patientNames = [
    'Ramesh Swamy', 'Karthick Raja', 'Muthu Vijay', 'Anjali Devi', 'Subbulakshmi K',
    'Selvan Durai', 'Saravanan M', 'Meenakshi Sundaram', 'Pandiyan T', 'Rajeshwari P',
    'Alagar Samy', 'Ganesan K', 'Chitra S', 'Devi Prasad', 'Murugan Vel',
    'Shanmugam A', 'Kokila Vani', 'Bala Krishnan', 'Venkatesh Babu', 'Lakshmi Narayanan',
    'Guru Moorthy', 'Easwari R', 'Kavitha S', 'Uma Maheshwari', 'Sundar Rajan',
    'Abdul Rahman', 'Fathima Beevi', 'Yousuf Ali', 'Daniel Raj', 'Esther Mary'
  ];

  const diseases: { type: DiseaseType; baseSeverity: 'Low' | 'Moderate' | 'Critical' }[] = [
    { type: 'Dengue', baseSeverity: 'Critical' },
    { type: 'Typhoid', baseSeverity: 'Moderate' },
    { type: 'Cholera', baseSeverity: 'Critical' },
    { type: 'Malaria', baseSeverity: 'Moderate' },
    { type: 'Diarrhoea', baseSeverity: 'Low' },
    { type: 'Hepatitis A', baseSeverity: 'Moderate' },
    { type: 'Leptospirosis', baseSeverity: 'Critical' },
    { type: 'Food Poisoning', baseSeverity: 'Low' }
  ];

  const genders = ['Male', 'Female', 'Other'] as const;
  const statuses = ['Admitted', 'Recovering', 'Discharged'] as const;

  // Distribute hospital cases
  let idCounter = 1000;
  Object.keys(MADURAI_ZONES).forEach((zoneStr) => {
    const zone = zoneStr as ZoneName;
    const wards = MADURAI_ZONES[zone];
    const hospitals = HOSPITALS_BY_ZONE[zone];

    wards.forEach(ward => {
      // Determine how many cases this ward gets based on WQI
      const wqi = wardWaterQuality[ward] || 80;
      let caseCount = randomInt(1, 3);
      if (wqi < 55) {
        caseCount = randomInt(6, 12); // Epidemic outbreak sim (minimum 5 cases for critical categorization)
      } else if (wqi < 70) {
        caseCount = randomInt(3, 5);
      }

      for (let i = 0; i < caseCount; i++) {
        const pName = `${patientNames[randomInt(0, patientNames.length - 1)]} ${String.fromCharCode(65 + randomInt(0, 25))}`;
        const age = randomInt(4, 75);
        const gender = genders[randomInt(0, genders.length - 1)];
        const hospital = hospitals[randomInt(0, hospitals.length - 1)];
        const diseaseChoice = diseases[randomInt(0, diseases.length - 1)];
        
        // Severity matches disease and WQI slightly
        let severity = diseaseChoice.baseSeverity;
        if (wqi < 45 && Math.random() > 0.4) severity = 'Critical';

        const recoveryStatus = statuses[randomInt(0, statuses.length - 1)];
        const dateOffset = randomInt(0, 14);
        const adminDate = new Date();
        adminDate.setDate(adminDate.getDate() - dateOffset);

        patients.push({
          id: `PT-${zone.substring(0, 2).toUpperCase()}-${idCounter++}`,
          name: pName,
          age,
          gender,
          zone,
          ward,
          hospital,
          disease: diseaseChoice.type,
          severity,
          admissionDate: adminDate.toISOString().split('T')[0],
          recoveryStatus
        });
      }
    });
  });

  // 3. Generate initial Citizen Complaints
  const sampleComplaints = [
    {
      title: 'Stagnant wastewater pooling behind local market',
      description: 'Massive puddle of dark water showing mosquito larvae activity over the past 4 days. Strong odor and close proximity to residential homes.',
      zone: 'East Zone' as ZoneName,
      ward: 3,
      lat: 9.9452,
      lng: 78.1215,
      address: 'Ward 3, Sellur Market Complex, Madurai (East Zone)',
      classes: ['Stagnant Water', 'Mosquito Breeding Area']
    },
    {
      title: 'Drainage overflow spraying onto the main street',
      description: 'The underground sewage pipe is completely blocked and spilling sewage onto the main bypass road. Vehicles are splashing contaminated water everywhere.',
      zone: 'North Zone' as ZoneName,
      ward: 22,
      lat: 9.9238,
      lng: 78.1485,
      address: 'Ward 22, K.K. Nagar West Street, Madurai (North Zone)',
      classes: ['Drainage Overflow', 'Dirty Water', 'Polluted Water']
    },
    {
      title: 'Garbage pile blocking storm water drain canal',
      description: 'Piles of household rubbish and plastic bags have been dumped inside the stormwater canal, completely stopping flow. Water is turning pitch dark and breeding flies.',
      zone: 'South Zone' as ZoneName,
      ward: 45,
      lat: 9.9192,
      lng: 78.0982,
      address: 'Ward 45, Kalavasal Junction, Madurai (South Zone)',
      classes: ['Garbage', 'Blocked Drain', 'Stagnant Water']
    },
    {
      title: 'Potable water supply pipeline cracked and mixed with sewage',
      description: 'Drinking water pipeline has cracked, causing water to pool next to the drainage ditch. Risk of sewage water seeping into potable pipe lines.',
      zone: 'Central Zone' as ZoneName,
      ward: 54,
      lat: 9.9312,
      lng: 78.1141,
      address: 'Ward 54, Central Junction Bazaar, Madurai (Central Zone)',
      classes: ['Water Leakage', 'Stagnant Water', 'Polluted Water']
    },
    {
      title: 'Open sewer water accumulate and breeding mosquitoes',
      description: 'Persistent drainage pool near the playground has turned greenish with algae and larvae. Needs immediate chlorine treatment.',
      zone: 'West Zone' as ZoneName,
      ward: 92,
      lat: 9.9212,
      lng: 78.1001,
      address: 'Ward 92, Kalavasal Bypass Road, Madurai (West Zone)',
      classes: ['Stagnant Water', 'Mosquito Breeding Area']
    }
  ];

  sampleComplaints.forEach((sc, index) => {
    const totalRisk = randomInt(80, 96);
    const mockSHAP = [
      { feature: 'Stagnant Water Presence', importance: randomInt(35, 45) },
      { feature: 'Poor Local Drainage', importance: randomInt(20, 30) },
      { feature: 'Organic Waste and Odor', importance: randomInt(15, 25) },
      { feature: 'High Mosquito Vector Probability', importance: randomInt(10, 15) }
    ];

    complaints.push({
      id: `COMP-2026-00${index + 1}`,
      title: sc.title,
      description: sc.description,
      latitude: sc.lat,
      longitude: sc.lng,
      zone: sc.zone,
      ward: sc.ward,
      address: sc.address,
      status: index === 0 ? 'Inspection Started' : 'Pending',
      date: new Date(Date.now() - index * 86400000).toISOString().split('T')[0],
      citizenName: ['Gopal Swamy', 'Kavitha Ram', 'Nagarajan M', 'Senthil Kumar'][index],
      citizenPhone: `+91 98452 0000${index + 1}`,
      aiDetection: {
        detectedObjects: sc.classes.map(cls => ({
          className: cls,
          confidence: parseFloat((0.85 + Math.random() * 0.12).toFixed(2)),
          boundingBox: [
            randomInt(10, 30),
            randomInt(15, 35),
            randomInt(60, 85),
            randomInt(65, 90)
          ] as [number, number, number, number]
        })),
        isDangerous: true,
        overallRiskScore: totalRisk,
        explanation: `AI marked this location dangerous due to detected ${sc.classes.join(', ')}. Poor drainage structures, slow water movement, and organic trash build-up create high probability vector breeding environments. Immediate chlorine treatment and source reduction needed.`,
        shapExplanation: mockSHAP
      }
    });
  });

  console.log(`Database seeded with ${patients.length} patient reports & ${complaints.length} complaints.`);
}


// Start database setup
initializeDatabase();

// Initialize the server-side Gemini client
let geminiClient: GoogleGenAI | null = null;
const isGeminiEnabled = !!process.env.GEMINI_API_KEY;

if (isGeminiEnabled) {
  try {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    console.log("Success: Google GenAI Client Initialized.");
  } catch (error) {
    console.error("Fault during Google GenAI initialization:", error);
  }
} else {
  console.log("Warning: process.env.GEMINI_API_KEY is not set. Falling back to robust simulated AI engine.");
}


/* ==========================================================
 * REST APIs
 * ========================================================== */

// Dashboard Metrics Calculating Risk Engine
function lookupWardRisks(): WardRiskSummary[] {
  const summaries: WardRiskSummary[] = [];

  Object.entries(MADURAI_ZONES).forEach(([zoneStr, wards]) => {
    const zone = zoneStr as ZoneName;
    wards.forEach(ward => {
      // 1. Complaint statistics
      const wardComplaints = complaints.filter(c => c.zone === zone && c.ward === ward);
      const complaintsCount = wardComplaints.length;

      // 2. Hospital Patient statistics
      const wardHospitalCases = patients.filter(p => p.zone === zone && p.ward === ward).length;

      // 3. Water Quality Index
      const wqi = wardWaterQuality[ward] ?? randomInt(75, 95);

      // 4. AI Image score from complaints
      const mappedScores = wardComplaints
        .map(c => c.aiDetection?.overallRiskScore)
        .filter((score): score is number => score !== undefined);
      const aiImageScore = mappedScores.length > 0 
        ? Math.round(mappedScores.reduce((a, b) => a + b, 0) / mappedScores.length)
        : wqi < 55 ? 85 : wqi < 70 ? 60 : 25; // Default score relative to water safety

      // 5. Predict historical score
      const historicalRiskScore = wqi < 55 ? 88 : wqi < 70 ? 58 : 20;

      // COMPOSITE RISK ENGINE FORMULA Definition
      // Normalized variables:
      const complaintFactor = Math.min(10, complaintsCount) * 10; // Normalized to 0-100
      const diseaseFactor = Math.min(15, wardHospitalCases) * 6.6;  // Normalized to 0-100
      const waterContaminationFactor = 100 - wqi;                  // Higher means worse contamination

      const computedScore = Math.min(100, Math.round(
        (complaintFactor * 0.3) + 
        (diseaseFactor * 0.4) + 
        (waterContaminationFactor * 0.2) + 
        (aiImageScore * 0.1)
      ));

      let riskCategory: 'MODERATE' | 'HIGH' | 'CRITICAL' = 'MODERATE';
      if (computedScore >= 70 || wqi < 45 || (wardHospitalCases >= 8 && complaintsCount >= 1)) {
        riskCategory = 'CRITICAL';
      } else if (computedScore >= 35) {
        riskCategory = 'HIGH';
      }

      summaries.push({
        ward,
        zone,
        complaintCount: complaintsCount,
        hospitalCases: wardHospitalCases,
        waterQualityScore: wqi,
        aiImageScore,
        historicalRiskScore,
        riskScore: computedScore,
        riskCategory
      });
    });
  });

  return summaries;
}


// --- 1. Authentic Health Inspector Login API ---
app.post('/api/auth/inspector-login', (req, res) => {
  const { id, password } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Government ID is required.' });
  }

  // Exact Inspector validations
  const inspector = HEALTH_INSPECTORS.find(hi => hi.id.toUpperCase() === id.toUpperCase());
  if (!inspector) {
    return res.status(401).json({ error: 'Invalid Government Authorization ID.' });
  }

  // Simulate successful password validations
  res.json({
    success: true,
    inspector,
    token: `MOCK-GOVT-JWT-${inspector.id}-${Date.now()}`
  });
});


// --- 2. Ward Risk Summaries API ---
app.get('/api/dashboard/ward-risks', (req, res) => {
  const risks = lookupWardRisks();
  res.json(risks);
});


// --- 2.1. Explain Critical Ward (Gemini AI-powered Decision Assist) ---
app.get('/api/explain-critical-ward', async (req, res) => {
  const { ward, zone } = req.query;
  if (!ward) {
    return res.status(400).json({ error: 'Ward number is required.' });
  }

  const wNum = parseInt(ward as string);
  const zName = zone as string;

  const risks = lookupWardRisks();
  const metrics = risks.find(r => r.ward === wNum);
  const wardPatients = patients.filter(p => p.ward === wNum);
  const wardComplaints = complaints.filter(c => c.ward === wNum);

  const statsText = `
    Ward: ${wNum}
    Zone: ${zName}
    WQI Water Quality Score: ${metrics?.waterQualityScore || 80}/100
    Active Clinical Patient Diagnoses: ${metrics?.hospitalCases || 0}
    Open Citizen Polluted-Water Complaints: ${metrics?.complaintCount || 0}
    Outbreak Risk Index Level: ${metrics?.riskScore || 0}%
    Patients breakdown: ${wardPatients.map(p => p.disease).join(', ') || 'No Admissions'}
    Open complaints tags: ${wardComplaints.map(c => c.title).join(', ') || 'No complaints'}
  `;

  const fallbackText = `The AI model detected high-risk trigger overlap in Ward ${wNum} during current-epoch scanning. Specifically, we noted an outbreak rating of ${metrics?.riskScore || 85}% outbreak probability spurred by ${metrics?.hospitalCases || 7} active water-borne clinical admissions (primarily featuring Dengue and Typhoid spikes) coupled directly with citizen-asserted standing wastewater alerts. The localized Chemical Water Quality Index is currently flagged at ${metrics?.waterQualityScore || 42}/100, which suggests persistent septic infiltration. Emergency vector eradication measures (including chlorine/powder flushing and pesticide drone dispatch) are highly advised to prevent wider transmission blocks.`;

  if (geminiClient && isGeminiEnabled) {
    try {
      console.log(`[Gemini] Requesting critical explanation for Ward ${wNum}...`);
      const response = await geminiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `You are an expert Government Epidemiological Assistant AI trained by the Tamil Nadu Health Department. Explain to a Sanitary Health Inspector why they must inspect Ward ${wNum} in ${zName} immediately.
        Here is the medical and municipal data for Ward ${wNum}:
        ${statsText}
        
        Write a professional, urgent, objective administrative analysis. Keep it high density and compact (150-200 words). Breakdown:
        1. Threat Analysis (Explain why the WQI water score, active patient cases, and citizen pooling complaints are a critical hazard).
        2. Vector potential (Describe why mosquitoes and water-borne pathogens could explode in this node).
        3. Recommend exactly 3 targeted field operations. Do not include salutations, write as an authoritative, elegant bulletin.`,
        config: {
          systemInstruction: "You are the Tamil Nadu Health Department Epidemic Intelligence Engine. Always respond in English, professionally, without conversational preamble or hype."
        }
      });
      const text = response.text || fallbackText;
      return res.json({ success: true, explanation: text });
    } catch (err) {
      console.error("[Gemini] Failed to generate explainable AI risk report. Using fallback.", err);
      return res.json({ success: true, explanation: fallbackText });
    }
  } else {
    return res.json({ success: true, explanation: fallbackText });
  }
});


// --- 3. Hospital Patient Dataset API ---
app.get('/api/hospitals/patients', (req, res) => {
  res.json(patients);
});

// Seed a new random patient dynamically on a regular interval (simulates actual real-time incoming hospital disease reports)
app.post('/api/hospitals/report-case', (req, res) => {
  const { name, age, gender, zone, ward, hospital, disease, severity } = req.body;

  if (!zone || !ward || !hospital || !disease) {
    return res.status(400).json({ error: 'Missing diagnostic fields.' });
  }

  const newPatient: PatientRecord = {
    id: `PT-${zone.substring(0, 2).toUpperCase()}-${patients.length + 1000}`,
    name: name || 'Anonymous Patient',
    age: Number(age) || randomInt(18, 65),
    gender: gender || 'Female',
    zone: zone as ZoneName,
    ward: Number(ward),
    hospital,
    disease: disease as DiseaseType,
    severity: severity || 'Moderate',
    admissionDate: new Date().toISOString().split('T')[0],
    recoveryStatus: 'Admitted'
  };

  patients.unshift(newPatient); // Add to the top
  res.json({ success: true, patient: newPatient });
});


// --- 4. Submit Complaint + Real-Time AI Inference Pipeline ---
app.post('/api/complaints/submit', async (req, res) => {
  const { title, description, image, latitude, longitude, zone, ward, address, citizenName, citizenPhone } = req.body;

  if (!title || !description || !zone || !ward || !citizenPhone) {
    return res.status(400).json({ error: 'Missing required compliance metadata.' });
  }

  const generatedId = `COMP-2026-${randomInt(1000, 9999)}`;
  const finalLat = Number(latitude) || 9.9252 + (Math.random() - 0.5) * 0.05;
  const finalLng = Number(longitude) || 78.1197 + (Math.random() - 0.5) * 0.05;

  // Use instant high-fidelity computer vision fallback tagging to submit grievance instantly
  const detectionDetails = makeSimulatedDetection(title, description);

  const newComplaint: Complaint = {
    id: generatedId,
    title,
    description,
    imageUrl: image, // Store binary representation for preview
    latitude: finalLat,
    longitude: finalLng,
    zone: zone as ZoneName,
    ward: Number(ward),
    address: address || `Madurai Ward ${ward}`,
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    citizenName: citizenName || 'Anonymous Citizen',
    citizenPhone: citizenPhone,
    aiDetection: detectionDetails
  };

  // Prepend to complaints database
  complaints.unshift(newComplaint);

  res.json({
    success: true,
    complaint: newComplaint
  });
});

// Helper for high-fidelity computer vision fallback tagging
function makeSimulatedDetection(title: string, desc: string): AIDetectionResult {
  const content = `${title} ${desc}`.toLowerCase();
  const detected: { className: string; confidence: number; boundingBox?: [number, number, number, number] }[] = [];

  if (content.includes('stagnant') || content.includes('water') || content.includes('puddle') || content.includes('standing')) {
    detected.push({ className: 'Stagnant Water', confidence: 0.94, boundingBox: [20, 25, 75, 80] });
    detected.push({ className: 'Mosquito Breeding Area', confidence: 0.89, boundingBox: [35, 40, 65, 75] });
  }
  if (content.includes('drain') || content.includes('overflow') || content.includes('gutter') || content.includes('sewer')) {
    detected.push({ className: 'Drainage Overflow', confidence: 0.92, boundingBox: [10, 30, 85, 90] });
    detected.push({ className: 'Blocked Drain', confidence: 0.88, boundingBox: [15, 20, 50, 60] });
  }
  if (content.includes('garbage') || content.includes('waste') || content.includes('trash') || content.includes('plastics')) {
    detected.push({ className: 'Garbage', confidence: 0.95, boundingBox: [30, 30, 70, 75] });
  }
  if (content.includes('leak') || content.includes('pipe') || content.includes('tap')) {
    detected.push({ className: 'Water Leakage', confidence: 0.87, boundingBox: [40, 20, 65, 60] });
  }

  // Base fallback if nothing is matching
  if (detected.length === 0) {
    detected.push({ className: 'Polluted Water', confidence: 0.82, boundingBox: [15, 30, 80, 80] });
  }

  const totalRisk = detected.length > 1 ? randomInt(85, 97) : randomInt(60, 84);

  return {
    detectedObjects: detected,
    isDangerous: true,
    overallRiskScore: totalRisk,
    explanation: `Simulated OpenCV/YOLOv8 Inference: Detected ${detected.map(d => d.className).join(', ')}. Probability of active mosq vector density is high due to stagnation variables, low localized movement, and thermal shade profiles. Action protocol requires chemical sanitation.`,
    shapExplanation: [
      { feature: 'Stagnant Surface Volume', importance: randomInt(35, 45) },
      { feature: 'Waste Proximity Score', importance: randomInt(20, 30) },
      { feature: 'Potable Pipe Leakage Proximity', importance: randomInt(15, 25) },
      { feature: 'Vector Hotspot Coefficient', importance: randomInt(11, 15) }
    ]
  };
}


// --- 5. All Complaints Retrieval API ---
app.get('/api/complaints', (req, res) => {
  res.json(complaints);
});


// --- 6. Inspector Actions API (Manage Inspection Status, Resolve, Reject) ---
app.post('/api/complaints/action', (req, res) => {
  const { complaintId, action, comment, inspectorId } = req.body;

  if (!complaintId || !action || !inspectorId) {
    return res.status(400).json({ error: 'Missing diagnostic mapping criteria.' });
  }

  const complaint = complaints.find(c => c.id === complaintId);
  if (!complaint) {
    return res.status(444).json({ error: 'Complaint record not found.' });
  }

  if (action === 'start') {
    complaint.status = 'Inspection Started';
  } else if (action === 'resolve') {
    complaint.status = 'Resolved';
    // When resolved, we safely restore the water quality rating of the ward a little!
    const activeWard = complaint.ward;
    if (wardWaterQuality[activeWard]) {
      wardWaterQuality[activeWard] = Math.min(98, wardWaterQuality[activeWard] + randomInt(10, 22));
    }
  } else if (action === 'reject') {
    complaint.status = 'Rejected';
  }

  complaint.inspectorId = inspectorId;
  complaint.inspectorComment = comment || `${action.toUpperCase()} by Health Inspector ${inspectorId}`;

  res.json({ success: true, complaint });
});


// --- 7. Predictive Analytics Dashboard Endpoint ---
app.get('/api/dashboard/predictions', (req, res) => {
  // Extract outbreak predictions based on simulated and current ward summaries
  const wardStatuses = lookupWardRisks();
  const criticalWards = wardStatuses.filter(ws => ws.riskCategory === 'CRITICAL');
  const moderateWards = wardStatuses.filter(ws => ws.riskCategory === 'MODERATE');

  // Formulate AI predictions percentages
  const countWards = (cat: string) => wardStatuses.filter(ws => ws.riskCategory === cat).length;
  
  const outbreakBaseProb = Math.min(98, Math.round((criticalWards.length * 15) + (moderateWards.length * 4)));
  const waterContamAverageProb = Math.max(10, Math.round(
    wardStatuses.reduce((acc, current) => acc + (100 - current.waterQualityScore), 0) / wardStatuses.length
  ));
  const vectorBreedingProb = Math.min(100, Math.round(
    outbreakBaseProb * 1.05
  ));

  res.json({
    outbreakProbability: outbreakBaseProb,
    waterContaminationProbability: waterContamAverageProb,
    vectorBreedingProbability: vectorBreedingProb,
    diseaseHotspotsCount: criticalWards.length,
    criticalWardList: criticalWards.map(cw => ({
      ward: cw.ward,
      zone: cw.zone,
      riskScore: cw.riskScore,
      hospitalCases: cw.hospitalCases,
      complaintCount: cw.complaintCount,
      reasons: cw.hospitalCases >= 8 && cw.complaintCount >= 1 
        ? `Dual-Trigger Criticality: Dengue/Malaria hospital count is highly elevated (${cw.hospitalCases} active cases) matching with registered citizen water-pools complaints.`
        : `Elevated Water Contamination: Low WQI index (${cw.waterQualityScore}) combined with stagnant water drainage complaints.`
    })),
    moderateWardList: moderateWards.map(mw => ({
      ward: mw.ward,
      zone: mw.zone,
      riskScore: mw.riskScore,
      hospitalCases: mw.hospitalCases,
      complaintCount: mw.complaintCount
    }))
  });
});


// --- 8. Download Reports and Data exports  ---
app.get('/api/reports/download', (req, res) => {
  const { type, format } = req.query; // type: daily, weekly, monthly, zone, ward
  res.json({
    message: "Report generated successfully on server side",
    timestamp: new Date().toISOString(),
    type: type || 'daily',
    format: format || 'excel',
    meta: {
      totalComplaintsAnalyzed: complaints.length,
      totalHospitalPatients: patients.length,
      criticalHazardsFlagged: complaints.filter(c => c.status === 'Pending').length
    }
  });
});


/* ==========================================================
 * Static Files Serving & Vite Integrated Dev Server
 * ========================================================== */

if (process.env.NODE_ENV !== "production") {
  // Import Vite dynamically
  import('vite').then(async (viteModule) => {
    const vite = await viteModule.createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log("Vite development server linked to Express successfully on port 3000.");
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started running on host 0.0.0.0 and port ${PORT}`);
});
