/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Madurai Zones and Wards structure
export type ZoneName = 'East Zone' | 'North Zone' | 'Central Zone' | 'South Zone' | 'West Zone';

export interface WardInfo {
  id: number;
  number: number;
  zone: ZoneName;
  name: string;
}

export interface HealthInspector {
  id: string; // Government ID
  name: string;
  zone: ZoneName;
  phone: string;
}

export interface Citizen {
  name: string;
  phone: string;
  zone: ZoneName;
  ward: number;
  address: string;
  latitude?: number;
  longitude?: number;
}

export type DiseaseType = 
  | 'Typhoid' 
  | 'Cholera' 
  | 'Dengue' 
  | 'Malaria' 
  | 'Diarrhoea' 
  | 'Hepatitis A' 
  | 'Leptospirosis' 
  | 'Food Poisoning';

export interface PatientRecord {
  id: string; // Patient ID
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  zone: ZoneName;
  ward: number;
  hospital: string;
  disease: DiseaseType;
  severity: 'Low' | 'Moderate' | 'Critical';
  admissionDate: string;
  recoveryStatus: 'Admitted' | 'Recovering' | 'Discharged';
}

export interface AIDetectionResult {
  detectedObjects: {
    className: string;
    confidence: number;
    boundingBox?: [number, number, number, number]; // [x1, y1, x2, y2] percentages
  }[];
  isDangerous: boolean;
  overallRiskScore: number; // 0-100
  explanation: string; // Explainable AI text
  shapExplanation: {
    feature: string;
    importance: number; // SHAP value (can be negative or positive)
  }[];
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  latitude: number;
  longitude: number;
  zone: ZoneName;
  ward: number;
  address: string;
  status: 'Pending' | 'Inspection Started' | 'Resolved' | 'Rejected';
  date: string;
  citizenName: string;
  citizenPhone: string;
  aiDetection?: AIDetectionResult;
  inspectorId?: string;
  inspectorComment?: string;
}

export interface WardRiskSummary {
  ward: number;
  zone: ZoneName;
  complaintCount: number;
  hospitalCases: number;
  waterQualityScore: number; // 0-100 index (e.g. 100 is pure, <60 is poor)
  aiImageScore: number;     // Average risk score from uploaded images
  historicalRiskScore: number;
  riskScore: number;        // Composite score 0-100
  riskCategory: 'MODERATE' | 'HIGH' | 'CRITICAL';
}

// Fixed Constants according to requirements
export const MADURAI_ZONES: Record<ZoneName, number[]> = {
  'East Zone': [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 36, 37, 38, 39, 40],
  'North Zone': [1, 2, 15, 20, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33, 34, 35, 63, 64, 65, 66],
  'Central Zone': [50, 51, 52, 54, 55, 56, 57, 58, 59, 60, 61, 62, 70, 75, 76, 77, 67, 68, 69],
  'South Zone': [29, 30, 41, 42, 43, 44, 45, 46, 47, 48, 49, 53, 85, 86, 87, 88, 89, 90],
  'West Zone': [71, 72, 73, 74, 78, 79, 80, 81, 82, 83, 84, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100]
};

export const HEALTH_INSPECTORS: HealthInspector[] = [
  { id: 'HI-TN-2026-1001', name: 'Arun Kumar', zone: 'East Zone', phone: '+91 94432 10001' },
  { id: 'HI-TN-2026-1002', name: 'Priya Devi', zone: 'North Zone', phone: '+91 94432 10002' },
  { id: 'HI-TN-2026-1003', name: 'Babu Mahesh', zone: 'Central Zone', phone: '+91 94432 10003' },
  { id: 'HI-TN-2026-1004', name: 'Alexander', zone: 'South Zone', phone: '+91 94432 10004' },
  { id: 'HI-TN-2026-1005', name: 'Mohammed Sultan', zone: 'West Zone', phone: '+91 94432 10005' },
];

export const HOSPITALS_BY_ZONE: Record<ZoneName, string[]> = {
  'West Zone': [
    'Silovam Hospital',
    'Pechiyaman Kovil Hospital',
    'Prathik Clinic',
    'Thirupathi Medical',
    'Sri Krishna Medical'
  ],
  'East Zone': [
    'Government Rajaji Hospital',
    'Asirvatham Speciality Hospital',
    'Vikram Hospital',
    'AVSS Hospital',
    'Easwara Hospital'
  ],
  'South Zone': [
    'Lakshmana Hospital',
    'Shri Sai Hospital',
    'Alpha Hospital',
    'Mani Hospital',
    'Gautham Hospital'
  ],
  'North Zone': [
    'Arun Hospital',
    'Bharathi Hospital',
    'Fenn Hospital',
    'Grace Hospital',
    'Hannah Joseph Hospital'
  ],
  'Central Zone': [
    'Harshini Hospital',
    'Jaisee Hospital',
    'Meenakshi Mission Hospital',
    'Nithila Hospital',
    'Quality Care Hospital'
  ]
};

// Simple helper to get Inspector matching Zone
export function getInspectorForZone(zone: ZoneName): HealthInspector | undefined {
  return HEALTH_INSPECTORS.find(hi => hi.zone === zone);
}
