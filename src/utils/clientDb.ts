import { 
  WardRiskSummary, 
  Complaint, 
  PatientRecord, 
  MADURAI_ZONES, 
  ZoneName, 
  DiseaseType, 
  HOSPITALS_BY_ZONE 
} from '../types';

// Helper: Random integer generator
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Local Storage Keys
const KEY_WQI = 'madurai_wqi';
const KEY_PATIENTS = 'madurai_patients';
const KEY_COMPLAINTS = 'madurai_complaints';

// Initialize Simulated Local Database
export function initializeClientDb() {
  // 1. Water Quality Index (WQI)
  if (!localStorage.getItem(KEY_WQI)) {
    const wqiMap: Record<number, number> = {};
    Object.values(MADURAI_ZONES).forEach(wards => {
      wards.forEach(ward => {
        if (ward === 3 || ward === 22 || ward === 54 || ward === 45 || ward === 92) {
          wqiMap[ward] = randomInt(35, 52); // Contaminated
        } else if (ward === 7 || ward === 12 || ward === 27 || ward === 41 || ward === 83) {
          wqiMap[ward] = randomInt(55, 68); // Moderate
        } else {
          wqiMap[ward] = randomInt(75, 96); // Good
        }
      });
    });
    localStorage.setItem(KEY_WQI, JSON.stringify(wqiMap));
  }

  // 2. Patients Data
  if (!localStorage.getItem(KEY_PATIENTS)) {
    const wqiMap = JSON.parse(localStorage.getItem(KEY_WQI) || '{}');
    const localPatients: PatientRecord[] = [];
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

    let idCounter = 1000;
    Object.keys(MADURAI_ZONES).forEach((zoneStr) => {
      const zone = zoneStr as ZoneName;
      const wards = MADURAI_ZONES[zone];
      const hospitals = HOSPITALS_BY_ZONE[zone];

      wards.forEach(ward => {
        const wqi = wqiMap[ward] || 80;
        let caseCount = randomInt(1, 3);
        if (wqi < 55) {
          caseCount = randomInt(6, 12);
        } else if (wqi < 70) {
          caseCount = randomInt(3, 5);
        }

        for (let i = 0; i < caseCount; i++) {
          const pName = `${patientNames[randomInt(0, patientNames.length - 1)]} ${String.fromCharCode(65 + randomInt(0, 25))}`;
          const age = randomInt(4, 75);
          const gender = genders[randomInt(0, genders.length - 1)];
          const hospital = hospitals[randomInt(0, hospitals.length - 1)];
          const diseaseChoice = diseases[randomInt(0, diseases.length - 1)];
          
          let severity = diseaseChoice.baseSeverity;
          if (wqi < 45 && Math.random() > 0.4) severity = 'Critical';

          const recoveryStatus = statuses[randomInt(0, statuses.length - 1)];
          const dateOffset = randomInt(0, 14);
          const adminDate = new Date();
          adminDate.setDate(adminDate.getDate() - dateOffset);

          localPatients.push({
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
    localStorage.setItem(KEY_PATIENTS, JSON.stringify(localPatients));
  }

  // 3. Citizen Complaints
  if (!localStorage.getItem(KEY_COMPLAINTS)) {
    const localComplaints: Complaint[] = [];
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
        { feature: 'Stagnant Surface Volume', importance: randomInt(35, 45) },
        { feature: 'Waste Proximity Score', importance: randomInt(20, 30) },
        { feature: 'Potable Pipe Leakage Proximity', importance: randomInt(15, 25) },
        { feature: 'Vector Hotspot Coefficient', importance: randomInt(11, 15) }
      ];

      localComplaints.push({
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
    localStorage.setItem(KEY_COMPLAINTS, JSON.stringify(localComplaints));
  }
}

// Get Complaints
export function getLocalComplaints(): Complaint[] {
  initializeClientDb();
  return JSON.parse(localStorage.getItem(KEY_COMPLAINTS) || '[]');
}

// Get Patients
export function getLocalPatients(): PatientRecord[] {
  initializeClientDb();
  return JSON.parse(localStorage.getItem(KEY_PATIENTS) || '[]');
}

// Get Ward Risks (computed locally using composite risk scoring engine formula)
export function getLocalWardRisks(): WardRiskSummary[] {
  initializeClientDb();
  const wqiMap = JSON.parse(localStorage.getItem(KEY_WQI) || '{}');
  const complaintsList = getLocalComplaints();
  const patientsList = getLocalPatients();
  const summaries: WardRiskSummary[] = [];

  Object.entries(MADURAI_ZONES).forEach(([zoneStr, wards]) => {
    const zone = zoneStr as ZoneName;
    wards.forEach(ward => {
      const wardComplaints = complaintsList.filter(c => c.zone === zone && c.ward === ward);
      const complaintsCount = wardComplaints.length;
      const wardHospitalCases = patientsList.filter(p => p.zone === zone && p.ward === ward).length;
      const wqi = wqiMap[ward] ?? 80;

      const mappedScores = wardComplaints
        .map(c => c.aiDetection?.overallRiskScore)
        .filter((score): score is number => score !== undefined);
      
      const aiImageScore = mappedScores.length > 0 
        ? Math.round(mappedScores.reduce((a, b) => a + b, 0) / mappedScores.length)
        : wqi < 55 ? 85 : wqi < 70 ? 60 : 25;

      const historicalRiskScore = wqi < 55 ? 88 : wqi < 70 ? 58 : 20;

      const complaintFactor = Math.min(10, complaintsCount) * 10;
      const diseaseFactor = Math.min(15, wardHospitalCases) * 6.6;
      const waterContaminationFactor = 100 - wqi;

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

// Get Predictions Dashboard
export function getLocalPredictions() {
  const wardStatuses = getLocalWardRisks();
  const criticalWards = wardStatuses.filter(ws => ws.riskCategory === 'CRITICAL');
  const moderateWards = wardStatuses.filter(ws => ws.riskCategory === 'MODERATE');

  const outbreakBaseProb = Math.min(98, Math.round((criticalWards.length * 15) + (moderateWards.length * 4)));
  const waterContamAverageProb = Math.max(10, Math.round(
    wardStatuses.reduce((acc, current) => acc + (100 - current.waterQualityScore), 0) / wardStatuses.length
  ));
  const vectorBreedingProb = Math.min(100, Math.round(outbreakBaseProb * 1.05));

  return {
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
  };
}

// Submit Complaint
export function submitLocalComplaint(payload: any): Complaint {
  initializeClientDb();
  const complaintsList = getLocalComplaints();

  const generatedId = `COMP-2026-${randomInt(1000, 9999)}`;
  const finalLat = Number(payload.latitude) || 9.9252 + (Math.random() - 0.5) * 0.05;
  const finalLng = Number(payload.longitude) || 78.1197 + (Math.random() - 0.5) * 0.05;

  // AI tag simulation
  const content = `${payload.title} ${payload.description}`.toLowerCase();
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

  if (detected.length === 0) {
    detected.push({ className: 'Polluted Water', confidence: 0.82, boundingBox: [15, 30, 80, 80] });
  }

  const totalRisk = detected.length > 1 ? randomInt(85, 97) : randomInt(60, 84);

  const newComplaint: Complaint = {
    id: generatedId,
    title: payload.title,
    description: payload.description,
    imageUrl: payload.image,
    latitude: finalLat,
    longitude: finalLng,
    zone: payload.zone as ZoneName,
    ward: Number(payload.ward),
    address: payload.address || `Madurai Ward ${payload.ward}`,
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    citizenName: payload.citizenName || 'Anonymous Citizen',
    citizenPhone: payload.citizenPhone,
    aiDetection: {
      detectedObjects: detected,
      isDangerous: true,
      overallRiskScore: totalRisk,
      explanation: `Simulated OpenCV/YOLOv8 Inference: Detected ${detected.map(d => d.className).join(', ')}. Stagnant surface liquid with shading coefficients, representing increased microclimate breeding risks.`,
      shapExplanation: [
        { feature: 'Stagnant Surface Volume', importance: randomInt(35, 45) },
        { feature: 'Waste Proximity Score', importance: randomInt(20, 30) },
        { feature: 'Potable Pipe Leakage Proximity', importance: randomInt(15, 25) },
        { feature: 'Vector Hotspot Coefficient', importance: randomInt(11, 15) }
      ]
    }
  };

  complaintsList.unshift(newComplaint);
  localStorage.setItem(KEY_COMPLAINTS, JSON.stringify(complaintsList));
  return newComplaint;
}

// Report Patient Case
export function reportLocalCase(payload: any): PatientRecord {
  initializeClientDb();
  const patientsList = getLocalPatients();

  const newPatient: PatientRecord = {
    id: `PT-${payload.zone.substring(0, 2).toUpperCase()}-${patientsList.length + 1000}`,
    name: payload.name || 'Anonymous Patient',
    age: Number(payload.age) || randomInt(18, 65),
    gender: payload.gender || 'Female',
    zone: payload.zone as ZoneName,
    ward: Number(payload.ward),
    hospital: payload.hospital,
    disease: payload.disease as DiseaseType,
    severity: payload.severity || 'Moderate',
    admissionDate: new Date().toISOString().split('T')[0],
    recoveryStatus: 'Admitted'
  };

  patientsList.unshift(newPatient);
  localStorage.setItem(KEY_PATIENTS, JSON.stringify(patientsList));
  return newPatient;
}

// Resolve/Action Complaint
export function actionLocalComplaint(cId: string, action: 'start' | 'resolve' | 'reject', comment: string, inspectorId: string): Complaint {
  initializeClientDb();
  const complaintsList = getLocalComplaints();
  const complaint = complaintsList.find(c => c.id === cId);

  if (!complaint) {
    throw new Error('Complaint not found');
  }

  if (action === 'start') {
    complaint.status = 'Inspection Started';
  } else if (action === 'resolve') {
    complaint.status = 'Resolved';
    // Improve water quality in local db
    const wqiMap = JSON.parse(localStorage.getItem(KEY_WQI) || '{}');
    const activeWard = complaint.ward;
    if (wqiMap[activeWard]) {
      wqiMap[activeWard] = Math.min(98, wqiMap[activeWard] + randomInt(10, 22));
      localStorage.setItem(KEY_WQI, JSON.stringify(wqiMap));
    }
  } else if (action === 'reject') {
    complaint.status = 'Rejected';
  }

  complaint.inspectorId = inspectorId;
  complaint.inspectorComment = comment || `${action.toUpperCase()} by Inspector ${inspectorId}`;

  localStorage.setItem(KEY_COMPLAINTS, JSON.stringify(complaintsList));
  return complaint;
}

// Local Ward Explanation generator
export function generateLocalWardExplanation(ward: number, zone: string, metrics?: WardRiskSummary) {
  const score = metrics?.riskScore ?? 75;
  const cases = metrics?.hospitalCases ?? 4;
  const complaints = metrics?.complaintCount ?? 2;
  const wqi = metrics?.waterQualityScore ?? 62;
  
  return `The Tamil Nadu Epidemic Intelligence Engine has processed localized data for Ward ${ward} (${zone}) citywide mapping operations.

1. THREAT ANALYSIS: A critical overlap is identified with an overall risk index of ${score}%. The localized Chemical Water Quality Index reads at ${wqi}/100, registering heavy biological/sewage infiltration. There are currently ${cases} active clinical patient admissions coupled with ${complaints} community stagnant water and piping leakage alerts.

2. PATHOGEN TRANSMISSION POTENTIAL: High humidity indices and standing organic liquid bodies trigger extreme vector hazard breeding thresholds. Mosquito vector density calculations suggest high risk of rapid disease replication across adjacent residential zones unless treated.

3. REQUIRED ACTION PROTOCOLS:
• Immediate deployment of high-concentration larvicide/chlorine flushing along all stagnant water lanes in Ward ${ward}.
• Comprehensive physical drainage dredging to clear household garbage blockages.
• Prompt potable line insulation to fix local sewage-potable joint leaks.`;
}
