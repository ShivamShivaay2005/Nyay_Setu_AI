export enum UserRole {
  FARMER = "farmer",
  OFFICER = "officer",
  ADMIN = "admin"
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  aadhaar?: string;
  walletAddress?: string;
}

export enum ClaimStatus {
  PENDING_AI = "pending_ai",
  PENDING_WEATHER = "pending_weather",
  PENDING_OFFICER = "pending_officer",
  APPROVED = "approved",
  REJECTED = "rejected",
  MORE_EVIDENCE = "more_evidence",
  APPEALED = "appealed"
}

export enum DamageType {
  FLOOD = "Flood",
  DROUGHT = "Drought",
  HAIL = "Hail",
  PEST = "Pest",
  DISEASE = "Disease",
  WIND = "Wind/Storm",
  OTHER = "Other"
}

export interface Claim {
  id: string;
  farmerId: string;
  farmerName: string;
  cropType: string;
  damageType: DamageType;
  sowingDate: string;
  damageDate: string;
  areaAcres: number;
  estimatedLossInr: number;
  description: string;
  imageUrl: string;
  imageUrls?: string[];  // multiple damage photos
  latitude: number;
  longitude: number;
  timestamp: string;
  status: ClaimStatus;
  createdAt: string;
  supplementalEvidenceAt?: string;
  blockchainTxHash?: string;
}

export interface AIResult {
  claimId: string;
  cropTypeDetected: string;
  damageTypeDetected: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  severityPercent: number;
  confidenceScore: number;
  reasoning: string;
  manualReviewRequired: boolean;
  analyzedAt: string;
}

export interface WeatherVerification {
  claimId: string;
  verified: boolean;
  temperature?: number;
  humidity?: number;
  precipitation?: number;
  weatherDescription?: string;
  windSpeed?: number;
  stationName?: string;
  analysisNote: string;
  checkedAt: string;
}

export interface OfficerDecision {
  id: string;
  claimId: string;
  officerId: string;
  officerName: string;
  officerPosition?: string;
  statusSelected: ClaimStatus;
  comments: string;
  blockchainBlockId?: number;
  decidedAt: string;
}

export interface Appeal {
  id: string;
  claimId: string;
  farmerId: string;
  reason: string;
  newEvidenceUrl?: string;
  createdAt: string;
  status: "pending" | "resolved";
}

export interface BlockchainBlock {
  blockNumber: number;
  claimId: string;
  evidenceHash: string;
  status: ClaimStatus;
  timestamp: string;
  officerWallet: string;
  previousHash: string;
  currentHash: string;
  nonce: number;
}
