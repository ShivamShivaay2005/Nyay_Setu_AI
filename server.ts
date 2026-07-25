import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

// Configure Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const isSupabaseConfigured = supabaseUrl && supabaseKey && !supabaseUrl.includes("your-project-id");

let supabase: any = null;
if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log("Supabase Client initialized successfully.");
  
  // Seed demo profiles in the background
  const seedProfiles = async () => {
    const demoProfiles = [
      { id: "a0000000-0000-0000-0000-000000000001", name: "Rajesh Kumar", email: "rajesh.kumar@agrilink.in", role: "farmer" },
      { id: "a0000000-0000-0000-0000-000000000002", name: "Priya Devi", email: "priya.devi@agrilink.in", role: "farmer" },
      { id: "b0000000-0000-0000-0000-000000000001", name: "Sandeep Verma", email: "s.verma@agriculture.gov.in", role: "officer" },
      { id: "b0000000-0000-0000-0000-000000000002", name: "Anjali Sharma", email: "a.sharma@agriculture.gov.in", role: "officer" }
    ];
    const { error } = await supabase!.from("profiles").upsert(demoProfiles);
    if (error) {
      console.error("Error seeding demo profiles in Supabase:", error.message);
    } else {
      console.log("Demo profiles seeded successfully in Supabase.");
    }
  };
  seedProfiles().catch(err => console.error("Profiles seeding failed:", err));
} else {
  console.warn("Supabase is not fully configured. Using fallback local JSON db.json.");
}

// ID mapping helpers for backward compatibility with frontend
const ID_MAP: Record<string, string> = {
  "farmer-1": "a0000000-0000-0000-0000-000000000001",
  "farmer-2": "a0000000-0000-0000-0000-000000000002",
  "officer-1": "b0000000-0000-0000-0000-000000000001",
  "officer-2": "b0000000-0000-0000-0000-000000000002",
};

const REV_ID_MAP: Record<string, string> = {
  "a0000000-0000-0000-0000-000000000001": "farmer-1",
  "a0000000-0000-0000-0000-000000000002": "farmer-2",
  "b0000000-0000-0000-0000-000000000001": "officer-1",
  "b0000000-0000-0000-0000-000000000002": "officer-2",
};

function mapClaimToFrontend(claim: any) {
  if (!claim) return claim;
  return {
    id: claim.id,
    farmerId: REV_ID_MAP[claim.farmer_id] || claim.farmer_id,
    farmerName: claim.farmer_name,
    cropType: claim.crop_type,
    damageType: claim.damage_type,
    sowingDate: claim.sowing_date,
    damageDate: claim.damage_date,
    areaAcres: Number(claim.area_acres),
    estimatedLossInr: Number(claim.estimated_loss_inr),
    description: claim.description,
    imageUrl: claim.image_url,
    imageUrls: claim.image_urls || [],
    ipfsUrl: claim.ipfs_url || "",
    supplementalEvidence: claim.supplemental_evidence || [],
    supplementalEvidenceAt: claim.supplemental_evidence_at,
    latitude: Number(claim.latitude),
    longitude: Number(claim.longitude),
    timestamp: claim.timestamp,
    status: claim.status,
    blockchainTxHash: claim.blockchain_tx_hash || "",
    blockchainBlockNumber: claim.blockchain_block_number || null,
    blockchainNetwork: claim.blockchain_network || "",
    blockchainMode: claim.blockchain_mode || "",
    blockchainExplorerUrl: claim.blockchain_explorer_url || "",
  };
}

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// Increase JSON body size limit to 50MB to handle base64 image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Path for JSON persistent store
const DB_FILE = path.join(process.cwd(), "db.json");

// Define basic interface states
interface DBState {
  claims: any[];
  aiResults: any[];
  weatherVerifications: any[];
  officerDecisions: any[];
  appeals: any[];
  blockchainBlocks: any[];
}

// Ensure database file exists with initial mock data representing previous state
function getDB(): DBState {
  if (!fs.existsSync(DB_FILE)) {
    const initialState: DBState = {
      claims: [
        {
          id: "claim-101",
          farmerId: "farmer-1",
          farmerName: "Rajesh Kumar",
          cropType: "Rice (Paddy)",
          damageType: "Flood",
          sowingDate: "2026-05-10",
          damageDate: "2026-07-12",
          areaAcres: 4.5,
          estimatedLossInr: 85000,
          description: "Flash flood submerged the entire crop for 5 days. Heavy root rot detected.",
          imageUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
          latitude: 26.8467,
          longitude: 80.9462,
          timestamp: "2026-07-14T10:30:00Z",
          status: "approved",
          createdAt: "2026-07-14T10:30:00Z",
          blockchainTxHash: "0x892ac2f8b5a15320d7459efdfef3854a2a1b18129df2f8b5024de7457a1b18"
        },
        {
          id: "claim-102",
          farmerId: "farmer-2",
          farmerName: "Sukhdev Singh",
          cropType: "Wheat",
          damageType: "Hail",
          sowingDate: "2026-04-15",
          damageDate: "2026-07-15",
          areaAcres: 6.0,
          estimatedLossInr: 120000,
          description: "Unseasonal hailstorm damaged wheat ears heavily during maturity stage.",
          imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
          latitude: 30.7333,
          longitude: 76.7794,
          timestamp: "2026-07-16T14:15:00Z",
          status: "pending_officer",
          createdAt: "2026-07-16T14:15:00Z"
        },
        {
          id: "claim-103",
          farmerId: "farmer-1",
          farmerName: "Rajesh Kumar",
          cropType: "Cotton",
          damageType: "Pest",
          sowingDate: "2026-05-20",
          damageDate: "2026-07-18",
          areaAcres: 3.2,
          estimatedLossInr: 55000,
          description: "Pink bollworm infestation destroying cotton crop flowers.",
          imageUrl: "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=600",
          latitude: 26.8500,
          longitude: 80.9500,
          timestamp: "2026-07-19T09:00:00Z",
          status: "pending_ai",
          createdAt: "2026-07-19T09:00:00Z"
        }
      ],
      aiResults: [
        {
          claimId: "claim-101",
          cropTypeDetected: "Rice (Paddy)",
          damageTypeDetected: "Flood Submersion",
          severity: "High",
          severityPercent: 85,
          confidenceScore: 0.92,
          reasoning: "Image shows mature paddy fields heavily flooded with brown, muddy water. Plant lodging is visible. Color degradation indicates structural failure and anaerobic stress.",
          manualReviewRequired: false,
          analyzedAt: "2026-07-14T10:35:00Z"
        },
        {
          claimId: "claim-102",
          cropTypeDetected: "Wheat",
          damageTypeDetected: "Hail Strike",
          severity: "High",
          severityPercent: 75,
          confidenceScore: 0.88,
          reasoning: "Images show shredded wheat leaves and flattened stems, matching unseasonal heavy hail strike. Ear lodging is critical across 70% of evaluated area.",
          manualReviewRequired: true,
          analyzedAt: "2026-07-16T14:22:00Z"
        }
      ],
      weatherVerifications: [
        {
          claimId: "claim-101",
          verified: true,
          temperature: 28.5,
          humidity: 92,
          precipitation: 125.4,
          weatherDescription: "Heavy monsoon rain & local thunderstorms",
          windSpeed: 22.4,
          stationName: "Lucknow Regional Met",
          analysisNote: "Severe precipitation (125.4 mm) recorded on 2026-07-12, validating the farmer's claim of local flash flooding. Saturation threshold exceeded by 180%.",
          checkedAt: "2026-07-14T10:36:00Z"
        },
        {
          claimId: "claim-102",
          verified: true,
          temperature: 19.8,
          humidity: 88,
          precipitation: 45.2,
          weatherDescription: "Thunderstorms with unseasonal heavy hail",
          windSpeed: 34.1,
          stationName: "Chandigarh Agri-Met Station",
          analysisNote: "Agri-radar logs confirm high-reflectivity cell indicative of localized hailstorm at 15:30 on 2026-07-15. Corroborates severe damage window.",
          checkedAt: "2026-07-16T14:23:00Z"
        }
      ],
      officerDecisions: [
        {
          id: "dec-1",
          claimId: "claim-101",
          officerId: "officer-1",
          officerName: "Officer Sandeep Verma",
          statusSelected: "approved",
          comments: "Verified against Gemini AI vision logs and local Met Department flood registry. Claim is fully genuine. Signed to Kisan Nyay Ledger on-chain.",
          blockchainBlockId: 1,
          decidedAt: "2026-07-14T11:45:00Z"
        }
      ],
      appeals: [],
      blockchainBlocks: [
        {
          blockNumber: 0,
          claimId: "GENESIS-BLOCK",
          evidenceHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          status: "Genesis",
          timestamp: "2026-07-01T00:00:00Z",
          officerWallet: "0x0000000000000000000000000000000000000000",
          previousHash: "0x0",
          currentHash: "0x00007fc5ba324df7efda345912389abcde7457a1b18129df2f8b5024de74571b",
          nonce: 1358
        },
        {
          blockNumber: 1,
          claimId: "claim-101",
          evidenceHash: "0x56a1b18fbfb3975a5e92ac2f8b5a15320d7459efdfef3854a2a1b18129df2f8b",
          status: "approved",
          timestamp: "2026-07-14T11:45:00Z",
          officerWallet: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          previousHash: "0x00007fc5ba324df7efda345912389abcde7457a1b18129df2f8b5024de74571b",
          currentHash: "0x892ac2f8b5a15320d7459efdfef3854a2a1b18129df2f8b5024de7457a1b18",
          nonce: 8492
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2), "utf-8");
  }
  const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8")) as DBState;
  let migratedLegacyEvidence = false;

  // Older builds appended re-submitted text/photos into the original claim.
  // Normalize those records once so the original evidence and every re-claim stay distinct.
  data.claims = data.claims.map((claim) => {
    const marker = "\n\n[Supplemental Evidence]\n";
    if (
      typeof claim.description !== "string" ||
      !claim.description.includes(marker) ||
      (Array.isArray(claim.supplementalEvidence) && claim.supplementalEvidence.length > 0)
    ) {
      return claim;
    }

    const [originalDescription, ...supplementalDescriptions] = claim.description.split(marker);
    const allImages = Array.isArray(claim.imageUrls)
      ? claim.imageUrls
      : [claim.imageUrl].filter(Boolean);
    const originalImages = allImages.length > 0 ? [allImages[0]] : [];
    const supplementalImages = allImages.slice(1);
    const submittedAt = claim.supplementalEvidenceAt || claim.createdAt || new Date().toISOString();

    migratedLegacyEvidence = true;
    return {
      ...claim,
      description: originalDescription,
      imageUrl: originalImages[0] || claim.imageUrl,
      imageUrls: originalImages,
      supplementalEvidence: supplementalDescriptions.map((description: string, index: number) => ({
        id: `evidence-legacy-${claim.id}-${index + 1}`,
        description,
        imageUrls: index === supplementalDescriptions.length - 1 ? supplementalImages : [],
        submittedAt,
      })),
    };
  });

  if (migratedLegacyEvidence) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  }

  return data;
}

function saveDB(data: DBState) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Lazy-initialization utility for Google GenAI SDK (prevents crash on empty key)
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const KISAN_NYAY_LEDGER_ABI = [
  "function createClaim(string _claimId, string _evidenceHash, string _status)",
  "function updateStatus(string _claimId, string _newStatus, string _newEvidenceHash)",
  "function getClaim(string _claimId) view returns (string claimId, string evidenceHash, string status, uint256 timestamp, address officerWallet)",
  "function getTotalClaimsCount() view returns (uint256)",
];

let ledgerContract: ethers.Contract | null = null;
let ledgerSignerAddress = "";

function getBlockchainConfiguration() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL?.trim() || "";
  const privateKey = process.env.PRIVATE_KEY?.trim() || "";
  const contractAddress = process.env.CONTRACT_ADDRESS?.trim() || "";
  return {
    rpcUrl,
    privateKey,
    contractAddress,
    configured: Boolean(rpcUrl && privateKey && contractAddress),
    fallbackEnabled: process.env.BLOCKCHAIN_FALLBACK_ENABLED !== "false",
  };
}

async function getLedgerContract() {
  if (ledgerContract) {
    return { contract: ledgerContract, signerAddress: ledgerSignerAddress };
  }

  const configuration = getBlockchainConfiguration();
  if (!configuration.configured) {
    throw new Error("Sepolia is not configured. Add SEPOLIA_RPC_URL, PRIVATE_KEY and CONTRACT_ADDRESS.");
  }
  if (!ethers.isAddress(configuration.contractAddress)) {
    throw new Error("CONTRACT_ADDRESS is not a valid Ethereum address.");
  }

  const provider = new ethers.JsonRpcProvider(configuration.rpcUrl);
  const signer = new ethers.Wallet(configuration.privateKey, provider);
  ledgerSignerAddress = await signer.getAddress();
  ledgerContract = new ethers.Contract(
    configuration.contractAddress,
    KISAN_NYAY_LEDGER_ABI,
    signer,
  );
  return { contract: ledgerContract, signerAddress: ledgerSignerAddress };
}

async function writeDecisionToSepolia(claimId: string, status: string, evidenceHash: string) {
  const { contract, signerAddress } = await getLedgerContract();
  let claimExists = true;
  try {
    await contract.getClaim(claimId);
  } catch {
    claimExists = false;
  }

  const transaction = claimExists
    ? await contract.updateStatus(claimId, status, evidenceHash)
    : await contract.createClaim(claimId, evidenceHash, status);
  const receipt = await transaction.wait();
  if (!receipt) {
    throw new Error("Sepolia transaction was submitted but no receipt was returned.");
  }

  return {
    txHash: transaction.hash as string,
    blockNumber: receipt.blockNumber as number,
    walletAddress: signerAddress,
    timestamp: new Date().toISOString(),
    network: "sepolia",
    simulated: false,
    explorerUrl: `https://sepolia.etherscan.io/tx/${transaction.hash}`,
  };
}

// Upload base64 image to IPFS via Pinata API (optional)
async function uploadToPinata(base64Data: string): Promise<string> {
  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt || pinataJwt === "MY_PINATA_JWT") {
    console.log("Pinata JWT not configured. Skipping real IPFS upload.");
    return "";
  }

  try {
    const mimeMatch = base64Data.match(/^data:([^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const rawData = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(rawData, "base64");
    
    const formData = new globalThis.FormData();
    const blob = new globalThis.Blob([buffer], { type: mimeType });
    formData.append("file", blob, `crop-claim-${Date.now()}.jpg`);
    
    console.log("Uploading claim image to Pinata IPFS...");
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: formData as any,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Pinata error: ${errText}`);
    }

    const result: any = await res.json();
    console.log(`Successfully pinned to IPFS! CID: ${result.IpfsHash}`);
    return `ipfs://${result.IpfsHash}`;
  } catch (e: any) {
    console.error("IPFS upload failed:", e.message);
    return "";
  }
}

// Middleware setup
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// =======================================================================
// API ENDPOINTS
// =======================================================================

// 1. GET ALL CLAIMS
app.get("/api/claims", async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("claims")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      res.json(data.map(mapClaimToFrontend));
    } else {
      const db = getDB();
      res.json(db.claims);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET CLAIM BY ID WITH DETAILS
app.get("/api/claims/:id", async (req, res) => {
  try {
    const claimId = req.params.id;
    if (supabase) {
      const { data: claimData, error: claimErr } = await supabase
        .from("claims")
        .select("*")
        .eq("id", claimId)
        .single();
      
      if (claimErr || !claimData) {
        return res.status(404).json({ error: "Claim not found" });
      }

      const [aiRes, weatherRes, decisionsRes, appealRes] = await Promise.all([
        supabase.from("ai_results").select("*").eq("claim_id", claimId).maybeSingle(),
        supabase.from("weather_verifications").select("*").eq("claim_id", claimId).maybeSingle(),
        supabase.from("officer_decisions").select("*").eq("claim_id", claimId),
        supabase.from("appeals").select("*").eq("claim_id", claimId).maybeSingle(),
      ]);

      const claim = mapClaimToFrontend(claimData);
      const aiResult = aiRes.data ? {
        claimId: aiRes.data.claim_id,
        cropTypeDetected: aiRes.data.crop_type_detected,
        damageTypeDetected: aiRes.data.damage_type_detected,
        severity: aiRes.data.severity,
        severityPercent: aiRes.data.severity_percent,
        confidenceScore: Number(aiRes.data.confidence_score),
        reasoning: aiRes.data.reasoning,
        manualReviewRequired: aiRes.data.manual_review_required,
        analyzedAt: aiRes.data.analyzed_at,
      } : null;

      const weatherVerification = weatherRes.data ? {
        claimId: weatherRes.data.claim_id,
        verified: weatherRes.data.verified,
        temperature: Number(weatherRes.data.temperature),
        humidity: weatherRes.data.humidity,
        precipitation: Number(weatherRes.data.precipitation),
        weatherDescription: weatherRes.data.weather_description,
        windSpeed: Number(weatherRes.data.wind_speed),
        stationName: weatherRes.data.station_name,
        analysisNote: weatherRes.data.analysis_note,
        checkedAt: weatherRes.data.checked_at,
      } : null;

      const decisions = (decisionsRes.data || []).map((d: any) => ({
        id: d.id,
        claimId: d.claim_id,
        officerId: REV_ID_MAP[d.officer_id] || d.officer_id,
        officerName: d.officer_name,
        officerPosition: d.officer_position || "Senior Agricultural Inspection Officer",
        statusSelected: d.status_selected,
        comments: d.comments,
        blockchainBlockId: d.blockchain_block_id,
        blockchainMode: d.blockchain_mode || "simulated",
        decidedAt: d.decided_at,
      }));

      const appeal = appealRes.data ? {
        id: appealRes.data.id,
        claimId: appealRes.data.claim_id,
        farmerId: REV_ID_MAP[appealRes.data.farmer_id] || appealRes.data.farmer_id,
        reason: appealRes.data.reason,
        newEvidenceUrl: appealRes.data.new_evidence_url,
        status: appealRes.data.status,
        createdAt: appealRes.data.created_at,
      } : null;

      res.json({
        claim,
        aiResult,
        weatherVerification,
        decisions,
        appeal,
      });
    } else {
      const db = getDB();
      const claim = db.claims.find((c) => c.id === claimId);
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }

      const aiResult = db.aiResults.find((ai) => ai.claimId === claim.id) || null;
      const weatherVerification = db.weatherVerifications.find((w) => w.claimId === claim.id) || null;
      const decisions = db.officerDecisions.filter((d) => d.claimId === claim.id);
      const appeal = db.appeals.find((a) => a.claimId === claim.id) || null;

      res.json({
        claim,
        aiResult,
        weatherVerification,
        decisions,
        appeal,
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. SUBMIT A NEW CROP CLAIM
app.post("/api/claims", async (req, res) => {
  try {
    const {
      farmerId,
      farmerName,
      cropType,
      damageType,
      sowingDate,
      damageDate,
      areaAcres,
      estimatedLossInr,
      description,
      imageUrl,
      imageUrls,
      latitude,
      longitude,
    } = req.body;

    if (!farmerId || !farmerName || !cropType || !damageType || !imageUrl) {
      return res.status(400).json({ error: "Missing required claim fields" });
    }

    // Upload to Pinata IPFS if JWT is configured
    let ipfsUrl = "";
    if (imageUrl && imageUrl.startsWith("data:image")) {
      try {
        ipfsUrl = await uploadToPinata(imageUrl);
      } catch (ipfsErr: any) {
        console.warn("IPFS Pinata upload failed, falling back to local base64:", ipfsErr.message);
      }
    }

    if (supabase) {
      const dbClaim = {
        farmer_id: ID_MAP[farmerId] || farmerId,
        farmer_name: farmerName,
        crop_type: cropType,
        damage_type: damageType,
        sowing_date: sowingDate || new Date().toISOString().split("T")[0],
        damage_date: damageDate || new Date().toISOString().split("T")[0],
        area_acres: Number(areaAcres) || 1.0,
        estimated_loss_inr: Number(estimatedLossInr) || 10000,
        description: description || "",
        image_url: imageUrl,
        image_urls: Array.isArray(imageUrls) && imageUrls.length ? imageUrls : (imageUrl ? [imageUrl] : []),
        ipfs_url: ipfsUrl || "",
        latitude: Number(latitude) || 26.8467,
        longitude: Number(longitude) || 80.9462,
        status: "pending_ai"
      };

      const { data, error } = await supabase
        .from("claims")
        .insert([dbClaim])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(mapClaimToFrontend(data));
    } else {
      const db = getDB();
      const newClaim = {
        id: "claim-" + Date.now(),
        farmerId,
        farmerName,
        cropType,
        damageType,
        sowingDate: sowingDate || new Date().toISOString().split("T")[0],
        damageDate: damageDate || new Date().toISOString().split("T")[0],
        areaAcres: Number(areaAcres) || 1.0,
        estimatedLossInr: Number(estimatedLossInr) || 10000,
        description: description || "",
        imageUrl,
        imageUrls: Array.isArray(imageUrls) && imageUrls.length ? imageUrls : (imageUrl ? [imageUrl] : []),
        ipfsUrl: ipfsUrl || "",
        latitude: Number(latitude) || 26.8467,
        longitude: Number(longitude) || 80.9462,
        timestamp: new Date().toISOString(),
        status: "pending_ai",
        createdAt: new Date().toISOString(),
      };

      db.claims.unshift(newClaim);
      saveDB(db);

      res.status(201).json(newClaim);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. TRIGGER AI VISION ANALYSIS
app.post("/api/claims/:id/analyze", async (req, res) => {
  try {
    const claimId = req.params.id;
    let claim: any;
    let db: any;
    let claimIndex = -1;

    if (supabase) {
      const { data, error } = await supabase
        .from("claims")
        .select("*")
        .eq("id", claimId)
        .single();
      if (error || !data) {
        return res.status(404).json({ error: "Claim not found" });
      }
      claim = mapClaimToFrontend(data);
      
      // Clean existing results for re-evaluation
      await Promise.all([
        supabase.from("ai_results").delete().eq("claim_id", claimId),
        supabase.from("weather_verifications").delete().eq("claim_id", claimId),
      ]);
    } else {
      db = getDB();
      claimIndex = db.claims.findIndex((c) => c.id === claimId);
      if (claimIndex === -1) {
        return res.status(404).json({ error: "Claim not found" });
      }
      claim = db.claims[claimIndex];
      db.aiResults = db.aiResults.filter((r) => r.claimId !== claimId);
      db.weatherVerifications = db.weatherVerifications.filter((w) => w.claimId !== claimId);
    }

    let base64Image = "";
    if (claim.imageUrl.startsWith("data:image")) {
      const commaIndex = claim.imageUrl.indexOf(",");
      if (commaIndex !== -1) {
        base64Image = claim.imageUrl.substring(commaIndex + 1);
      }
    }

    let resultJson: any;

    try {
      // Lazy load Gemini Client to check for key configuration
      const ai = getGeminiClient();

      // Check if image data is base64, otherwise download standard internet images
      let imagePart: any;
      if (base64Image) {
        let mimeType = "image/png";
        if (claim.imageUrl.includes("image/jpeg") || claim.imageUrl.includes("image/jpg")) {
          mimeType = "image/jpeg";
        }
        imagePart = {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        };
      } else {
        // Fallback for demo unsplash images: fetch image buffer and convert to base64
        const imageRes = await fetch(claim.imageUrl);
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        imagePart = {
          inlineData: {
            mimeType: "image/jpeg",
            data: buffer.toString("base64"),
          },
        };
      }

      const prompt = `Analyze this crop damage image for insurance verification purposes. 
The claim states the crop is "${claim.cropType}" and the damage cause is "${claim.damageType}".
Provide a formal agricultural assessment.

CRITICAL VERIFICATION RULES (FRAUD DETECTION):
1. Crop Matching: Verify if the crop in the image is actually "${claim.cropType}". If it is a different crop or not a farm/crop image at all (e.g., random internet memes, stock objects, people, indoor photos), set "confidenceScore" to less than 0.20 and set "manualReviewRequired" to true.
2. Damage Matching: Verify if the damage visible matches "${claim.damageType}". If the crop looks completely healthy or the damage type is entirely different, set "confidenceScore" to less than 0.30.
3. If you suspect the image is fake, unrelated, or not matching the claim, reflect this clearly in your "confidenceScore" (low value) and write your findings in the "reasoning".

You must respond with a strictly formatted JSON object matching the following TypeScript schema:
{
  "cropTypeDetected": "string",
  "damageTypeDetected": "string",
  "severity": "Low" | "Medium" | "High" | "Critical",
  "severityPercent": number (0-100),
  "confidenceScore": number (0.0 to 1.0),
  "reasoning": "string with extensive agricultural justification of what is observed in the image",
  "manualReviewRequired": boolean
}

Do not add markdown formatting or wrappers outside the raw JSON object. Use valid properties only.`;

      const geminiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [imagePart, { text: prompt }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cropTypeDetected: { type: Type.STRING },
              damageTypeDetected: { type: Type.STRING },
              severity: { type: Type.STRING, description: "Low, Medium, High, or Critical" },
              severityPercent: { type: Type.INTEGER },
              confidenceScore: { type: Type.NUMBER },
              reasoning: { type: Type.STRING },
              manualReviewRequired: { type: Type.BOOLEAN },
            },
            required: ["cropTypeDetected", "damageTypeDetected", "severity", "severityPercent", "confidenceScore", "reasoning", "manualReviewRequired"],
          },
        },
      });

      const responseText = geminiResponse.text?.trim() || "{}";
      resultJson = JSON.parse(responseText);
    } catch (geminiError: any) {
      console.warn("Gemini Live analysis failed or not configured. Running crop simulator fallback. Error:", geminiError.message);
      
      // Dynamic fallback based on damage type if key is missing or call fails (Simulator Mode)
      const severityMap: Record<string, "Low" | "Medium" | "High" | "Critical"> = {
        Flood: "High",
        Drought: "Critical",
        Hail: "Medium",
        Pest: "High",
        Disease: "Medium",
      };
      
      const reasons: Record<string, string> = {
        Flood: `[SIMULATOR ASSESSMENT] The crop leaf tissue shows visible chlorosis consistent with oxygen deprivation under flood submergence. Secondary rotting of stalk roots likely initiated due to anaerobic conditions. Lodge damage index is high.`,
        Drought: `[SIMULATOR ASSESSMENT] Severe structural wilting observed. Stomata closure led to advanced cell necrosis. Crop moisture index suggests irreversible crop failure across major tracts.`,
        Hail: `[SIMULATOR ASSESSMENT] Immediate mechanical leaf shredding and stem breakage detected. Wheat heads display high shatter-fracture percentage. Mature grain head count reduced.`,
        Pest: `[SIMULATOR ASSESSMENT] Crop canopy exhibits heavy defoliation. High concentrations of localized pest vectors detected. Damage matches cotton bollworm activity.`,
        Disease: `[SIMULATOR ASSESSMENT] Visual rust blemishes visible on wheat ear stems. Leaf blade spots suggest early blight propagation. Requires localized fungicide evaluation.`,
      };

      resultJson = {
        cropTypeDetected: claim.cropType,
        damageTypeDetected: claim.damageType + " Damage",
        severity: severityMap[claim.damageType] || "Medium",
        severityPercent: Math.floor(Math.random() * 30) + 60, // 60-90%
        confidenceScore: 0.85,
        reasoning: reasons[claim.damageType] || `[SIMULATOR ASSESSMENT] Visible crop degradation matches requested agricultural damage parameters. Local foliage shows distinct chlorophyll stress. Ready for officer review.`,
        manualReviewRequired: claim.damageType === "Pest" || claim.damageType === "Disease"
      };
    }

    const aiResult = {
      claimId,
      cropTypeDetected: resultJson.cropTypeDetected,
      damageTypeDetected: resultJson.damageTypeDetected,
      severity: resultJson.severity,
      severityPercent: resultJson.severityPercent,
      confidenceScore: resultJson.confidenceScore,
      reasoning: resultJson.reasoning,
      manualReviewRequired: resultJson.manualReviewRequired,
      analyzedAt: new Date().toISOString(),
    };

    if (supabase) {
      const { error: aiErr } = await supabase.from("ai_results").insert([{
        claim_id: claimId,
        crop_type_detected: resultJson.cropTypeDetected,
        damage_type_detected: resultJson.damageTypeDetected,
        severity: resultJson.severity,
        severity_percent: resultJson.severityPercent,
        confidence_score: resultJson.confidenceScore,
        reasoning: resultJson.reasoning,
        manual_review_required: resultJson.manualReviewRequired
      }]);
      if (aiErr) throw aiErr;
    } else {
      db.aiResults.push(aiResult);
    }

    // Weather check logic (Only for Flood, Drought, Hail)
    const isWeatherRequired = ["Flood", "Drought", "Hail"].includes(claim.damageType);
    let finalStatus = "pending_officer";

    if (isWeatherRequired) {
      if (supabase) {
        await supabase.from("claims").update({ status: "pending_weather" }).eq("id", claimId);
      } else {
        db.claims[claimIndex].status = "pending_weather";
        saveDB(db);
      }

      // Fetch or simulate weather verification
      let weatherData: any;
      const key = process.env.OPENWEATHER_API_KEY;

      if (key && key !== "MY_OPENWEATHER_API_KEY") {
        try {
          const weatherRes = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${claim.latitude}&lon=${claim.longitude}&appid=${key}&units=metric`
            );
            if (weatherRes.ok) {
              weatherData = await weatherRes.json();
            } else {
              console.error(`OpenWeather API error ${weatherRes.status}: ${weatherRes.statusText}`);
            }
        } catch (e) {
          console.error("OpenWeather API fetch failed, falling back to simulator:", e);
        }
      }

      // Helper to generate varied simulated weather based on month and damage type
      function simulateWeather(claim: any) {
        const date = new Date(claim.damageDate || claim.timestamp);
        const month = date.getUTCMonth(); // 0 = Jan
        // Rough average temperatures (°C) for a typical Indian climate by month
        const avgTemps = [30, 32, 35, 38, 40, 42, 44, 43, 40, 35, 30, 28];
        const avgHumidity = [80, 78, 75, 70, 65, 60, 55, 60, 68, 75, 78, 80];
        const temp = avgTemps[month] + Math.random() * 2 - 1; // ±1°C variation
        const humidity = avgHumidity[month] + Math.random() * 5 - 2.5; // ±2.5%
        let precipitation = 0;
        let description = "";
        switch (claim.damageType) {
          case "Flood":
            precipitation = Math.max(0, 70 + Math.random() * 30); // 70‑100 mm
            description = "Heavy rain and thunderstorms";
            break;
          case "Drought":
            precipitation = 0;
            description = "Extreme heat and dry conditions";
            break;
          case "Hail":
            precipitation = Math.max(0, 20 + Math.random() * 10); // 20‑30 mm equiv.
            description = "Severe hailstorm";
            break;
          default:
            precipitation = Math.random() * 10; // minor rain
            description = "Mixed weather conditions";
        }
        const windSpeed = 10 + Math.random() * 20; // 10‑30 m/s
        return { temp, humidity, precipitation, description, windSpeed };
      }

      if (!weatherData || !weatherData.main) {
        // Use dynamic simulation instead of static map
        const sim = simulateWeather(claim);
        weatherData = {
          main: { temp: sim.temp, humidity: sim.humidity },
          weather: [{ description: sim.description }],
          wind: { speed: sim.windSpeed },
          name: "Simulated Weather Station",
          simulatedPrecip: sim.precipitation,
        };
      }

      const isVerified = claim.damageType === "Flood" ? weatherData.main.humidity > 80 :
                        claim.damageType === "Drought" ? weatherData.main.temp > 35 :
                        true;

      const weatherVerification = {
        claimId,
        verified: isVerified,
        temperature: weatherData.main.temp,
        humidity: weatherData.main.humidity,
        precipitation: weatherData.simulatedPrecip || (claim.damageType === "Flood" ? 75.5 : 0.0),
        weatherDescription: weatherData.weather[0].description,
        windSpeed: weatherData.wind.speed,
        stationName: weatherData.name || "Regional AWS Weather Grid",
        analysisNote: `Weather logs analyzed for ${claim.damageDate}. Detected ${weatherData.weather[0].description} at lat/long (${claim.latitude}, ${claim.longitude}). Heavy environmental anomalies match reported ${claim.damageType} damage conditions.`,
        checkedAt: new Date().toISOString()
      };

      if (supabase) {
        const { error: wetErr } = await supabase.from("weather_verifications").insert([{
          claim_id: claimId,
          verified: isVerified,
          temperature: weatherData.main.temp,
          humidity: weatherData.main.humidity,
          precipitation: weatherVerification.precipitation,
          weather_description: weatherVerification.weatherDescription,
          wind_speed: weatherVerification.windSpeed,
          station_name: weatherVerification.stationName,
          analysis_note: weatherVerification.analysisNote
        }]);
        if (wetErr) throw wetErr;
        await supabase.from("claims").update({ status: "pending_officer" }).eq("id", claimId);
      } else {
        db.weatherVerifications.push(weatherVerification);
        db.claims[claimIndex].status = "pending_officer";
      }
      finalStatus = "pending_officer";
    } else {
      // Pest, disease, etc. skip weather check, move straight to officer review
      if (supabase) {
        await supabase.from("claims").update({ status: "pending_officer" }).eq("id", claimId);
      } else {
        db.claims[claimIndex].status = "pending_officer";
      }
      finalStatus = "pending_officer";
    }

    if (!supabase) {
      saveDB(db);
    }
    res.json({ success: true, status: finalStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. OFFICER DECISION & SMART-CONTRACT / FALLBACK LEDGER GENERATION
app.post("/api/claims/:id/decide", async (req, res) => {
  try {
    const claimId = req.params.id;
    const { officerId, officerName, officerPosition, statusSelected, comments, officerWallet } = req.body;
    const allowedStatuses = new Set(["approved", "rejected", "more_evidence", "appealed"]);

    if (!officerId || !officerName || !statusSelected || !comments) {
      return res.status(400).json({ error: "Missing required decision fields" });
    }
    if (!allowedStatuses.has(statusSelected)) {
      return res.status(400).json({ error: "Unsupported claim decision status" });
    }

    let claim: any;
    let db: any;
    let claimIndex = -1;

    if (supabase) {
      const { data, error } = await supabase
        .from("claims")
        .select("*")
        .eq("id", claimId)
        .single();
      if (error || !data) {
        return res.status(404).json({ error: "Claim not found" });
      }
      claim = mapClaimToFrontend(data);
    } else {
      db = getDB();
      claimIndex = db.claims.findIndex((claim) => claim.id === claimId);
      if (claimIndex === -1) {
        return res.status(404).json({ error: "Claim not found" });
      }
      claim = db.claims[claimIndex];
    }

    const decidedAt = new Date().toISOString();
    const newDecision = {
      claimId,
      officerId,
      officerName,
      officerPosition: officerPosition || "Senior Agricultural Inspection Officer",
      statusSelected,
      comments,
      blockchainBlockId: null as number | null,
      blockchainMode: "simulated",
      decidedAt,
    };

    // Hash the complete evidence state without putting private photos or descriptions on-chain.
    const originalImageHashes = (claim.imageUrls || [claim.imageUrl].filter(Boolean)).map((image: string) =>
      crypto.createHash("sha256").update(image).digest("hex"),
    );
    const supplementalEvidenceHashes = (claim.supplementalEvidence || []).map((submission: any) => ({
      submittedAt: submission.submittedAt,
      descriptionHash: crypto.createHash("sha256").update(submission.description || "").digest("hex"),
      imageHashes: (submission.imageUrls || []).map((image: string) =>
        crypto.createHash("sha256").update(image).digest("hex"),
      ),
    }));
    const evidencePayload = JSON.stringify({
      claimId,
      cropType: claim.cropType,
      damageType: claim.damageType,
      areaAcres: claim.areaAcres,
      estimatedLossInr: claim.estimatedLossInr,
      latitude: claim.latitude,
      longitude: claim.longitude,
      originalImageHashes,
      supplementalEvidenceHashes,
    });
    const evidenceHash = "0x" + crypto.createHash("sha256").update(evidencePayload).digest("hex");

    const configuration = getBlockchainConfiguration();
    let blockchainRecord: {
      txHash: string;
      blockNumber: number;
      walletAddress: string;
      timestamp: string;
      network: string;
      simulated: boolean;
      explorerUrl?: string;
    } | null = null;
    let blockchainWarning = "";

    if (configuration.configured) {
      try {
        blockchainRecord = await writeDecisionToSepolia(claimId, statusSelected, evidenceHash);
      } catch (error: any) {
        blockchainWarning = error?.shortMessage || error?.message || "Sepolia transaction failed";
        if (!configuration.fallbackEnabled) {
          return res.status(502).json({
            error: "The Sepolia transaction failed and simulator fallback is disabled.",
            blockchainError: blockchainWarning,
          });
        }
      }
    }

    let previousHash = "0x0";
    let blockNumber = 0;

    if (supabase) {
      const { data: lastLogs } = await supabase
        .from("blockchain_logs")
        .select("current_hash, block_number")
        .order("block_number", { ascending: false })
        .limit(1);
      
      const lastBlock = lastLogs?.[0];
      previousHash = lastBlock?.current_hash || "0x0";
      blockNumber = lastBlock ? Number(lastBlock.block_number) + 1 : 0;
    } else {
      const lastBlock = db.blockchainBlocks[db.blockchainBlocks.length - 1];
      previousHash = lastBlock?.currentHash || "0x0";
      blockNumber = lastBlock ? Number(lastBlock.blockNumber) + 1 : 0;
    }

    let nonce = 0;

    if (!blockchainRecord) {
      const walletAddress = officerWallet || "0x" + crypto.randomBytes(20).toString("hex");
      let simulatedHash = "";

      while (nonce < 100000) {
        const blockString = `${blockNumber}${claimId}${evidenceHash}${statusSelected}${decidedAt}${walletAddress}${previousHash}${nonce}`;
        simulatedHash = "0x" + crypto.createHash("sha256").update(blockString).digest("hex");
        if (simulatedHash.startsWith("0x000")) break;
        nonce++;
      }

      blockchainRecord = {
        txHash: simulatedHash,
        blockNumber,
        walletAddress,
        timestamp: decidedAt,
        network: "local-simulator",
        simulated: true,
      };
    }

    const blockchainMode = blockchainRecord.simulated ? "simulated" : "sepolia";

    if (supabase) {
      await Promise.all([
        supabase.from("blockchain_logs").insert([{
          block_number: blockchainRecord.blockNumber,
          claim_id: claimId,
          evidence_hash: evidenceHash,
          status: statusSelected,
          timestamp: blockchainRecord.timestamp,
          officer_wallet: blockchainRecord.walletAddress,
          previous_hash: previousHash,
          current_hash: blockchainRecord.txHash,
          nonce,
          network: blockchainRecord.network,
          simulated: blockchainRecord.simulated,
          explorer_url: blockchainRecord.explorerUrl || ""
        }]),
        supabase.from("officer_decisions").insert([{
          claim_id: claimId,
          officer_id: ID_MAP[officerId] || officerId,
          officer_name: officerName,
          status_selected: statusSelected,
          comments,
          blockchain_block_id: blockchainRecord.blockNumber,
        }]),
        supabase.from("claims").update({
          status: statusSelected,
          blockchain_tx_hash: blockchainRecord.txHash,
          blockchain_block_number: blockchainRecord.blockNumber,
          blockchain_network: blockchainRecord.network,
          blockchain_mode: blockchainMode,
          blockchain_explorer_url: blockchainRecord.explorerUrl || ""
        }).eq("id", claimId)
      ]);
    } else {
      db.blockchainBlocks.push({
        blockNumber: blockchainRecord.blockNumber,
        claimId,
        evidenceHash,
        status: statusSelected,
        timestamp: blockchainRecord.timestamp,
        officerWallet: blockchainRecord.walletAddress,
        previousHash,
        currentHash: blockchainRecord.txHash,
        nonce,
        network: blockchainRecord.network,
        simulated: blockchainRecord.simulated,
        explorerUrl: blockchainRecord.explorerUrl || "",
      });

      claim.status = statusSelected;
      claim.blockchainTxHash = blockchainRecord.txHash;
      claim.blockchainBlockNumber = blockchainRecord.blockNumber;
      claim.blockchainNetwork = blockchainRecord.network;
      claim.blockchainMode = blockchainMode;
      claim.blockchainExplorerUrl = blockchainRecord.explorerUrl || "";

      newDecision.blockchainBlockId = blockchainRecord.blockNumber;
      newDecision.blockchainMode = blockchainMode;
      
      db.officerDecisions.push({
        id: "dec-" + Date.now(),
        ...newDecision
      });
      db.claims[claimIndex] = claim;
      saveDB(db);
    }

    res.json({
      success: true,
      claimStatus: statusSelected,
      txHash: blockchainRecord.txHash,
      blockNumber: blockchainRecord.blockNumber,
      blockchainMode,
      network: blockchainRecord.network,
      explorerUrl: blockchainRecord.explorerUrl || null,
      warning: blockchainWarning || null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. SUBMIT FARMER APPEAL
app.post("/api/claims/:id/appeal", async (req, res) => {
  try {
    const claimId = req.params.id;
    const { farmerId, reason, newEvidenceUrl } = req.body;

    if (!farmerId || !reason) {
      return res.status(400).json({ error: "Missing required appeal fields" });
    }

    if (supabase) {
      const { data: claim, error: claimErr } = await supabase.from("claims").select("id").eq("id", claimId).single();
      if (claimErr || !claim) {
        return res.status(404).json({ error: "Claim not found" });
      }

      await Promise.all([
        supabase.from("claims").update({ status: "appealed" }).eq("id", claimId),
        supabase.from("appeals").upsert([{
          claim_id: claimId,
          farmer_id: ID_MAP[farmerId] || farmerId,
          reason,
          new_evidence_url: newEvidenceUrl || "",
          status: "pending"
        }], { onConflict: "claim_id" })
      ]);
    } else {
      const db = getDB();
      const claimIndex = db.claims.findIndex((c) => c.id === claimId);
      if (claimIndex === -1) {
        return res.status(404).json({ error: "Claim not found" });
      }

      db.claims[claimIndex].status = "appealed";

      const appealId = "app-" + Date.now();
      const newAppeal = {
        id: appealId,
        claimId,
        farmerId,
        reason,
        newEvidenceUrl: newEvidenceUrl || "",
        status: "pending",
        createdAt: new Date().toISOString()
      };

      db.appeals = db.appeals.filter((a) => a.claimId !== claimId);
      db.appeals.push(newAppeal);
      saveDB(db);
    }

    res.json({ success: true, status: "appealed" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. SUBMIT SUPPLEMENTAL EVIDENCE (for more_evidence claims)
app.post("/api/claims/:id/supplemental-evidence", async (req, res) => {
  try {
    const claimId = req.params.id;
    const { additionalDescription, additionalImageUrls } = req.body;

    let claim: any;
    let db: any;
    let claimIndex = -1;

    if (supabase) {
      const { data, error } = await supabase.from("claims").select("*").eq("id", claimId).single();
      if (error || !data) {
        return res.status(404).json({ error: "Claim not found" });
      }
      claim = mapClaimToFrontend(data);
    } else {
      db = getDB();
      claimIndex = db.claims.findIndex((c) => c.id === claimId);
      if (claimIndex === -1) {
        return res.status(404).json({ error: "Claim not found" });
      }
      claim = db.claims[claimIndex];
    }

    if (claim.status !== "more_evidence") {
      return res.status(400).json({ error: "Claim is not awaiting evidence" });
    }

    const submittedAt = new Date().toISOString();
    const supplementalSubmission = {
      id: "evidence-" + Date.now(),
      description: additionalDescription || "",
      imageUrls: Array.isArray(additionalImageUrls) ? additionalImageUrls : [],
      submittedAt,
    };

    const newEvidenceList = [
      ...(Array.isArray(claim.supplementalEvidence) ? claim.supplementalEvidence : []),
      supplementalSubmission,
    ];

    if (supabase) {
      const { error: updErr } = await supabase.from("claims").update({
        status: "pending_officer",
        supplemental_evidence: newEvidenceList,
        supplemental_evidence_at: submittedAt
      }).eq("id", claimId);
      if (updErr) throw updErr;
    } else {
      claim.supplementalEvidence = newEvidenceList;
      claim.supplementalEvidenceAt = submittedAt;
      claim.status = "pending_officer";
      db.claims[claimIndex] = claim;
      saveDB(db);
    }

    res.json({ success: true, status: "pending_officer", supplementalSubmission });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. GET COMPLETE BLOCKCHAIN LEDGER
app.get("/api/blockchain", async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("blockchain_logs")
        .select("*")
        .order("block_number", { ascending: true });
      if (error) throw error;
      res.json(data.map((b: any) => ({
        blockNumber: b.block_number,
        claimId: b.claim_id,
        evidenceHash: b.evidence_hash,
        status: b.status,
        timestamp: b.timestamp,
        officerWallet: b.officer_wallet,
        previousHash: b.previous_hash,
        currentHash: b.current_hash,
        nonce: b.nonce,
        network: b.network || "local-simulator",
        simulated: b.simulated,
        explorerUrl: b.explorer_url || ""
      })));
    } else {
      const db = getDB();
      res.json(db.blockchainBlocks);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/blockchain/status", (_req, res) => {
  const configuration = getBlockchainConfiguration();
  res.json({
    configured: configuration.configured,
    mode: configuration.configured ? "sepolia" : "local-simulator",
    network: configuration.configured ? "Ethereum Sepolia" : "Local cryptographic ledger",
    contractAddress: configuration.contractAddress || null,
    fallbackEnabled: configuration.fallbackEnabled,
  });
});

// 9. GET HIGH LEVEL LEDGER STATISTICS (for landing page / admin dashboard)
app.get("/api/stats", async (req, res) => {
  try {
    if (supabase) {
      const [claimsRes, blocksRes, weatherRes] = await Promise.all([
        supabase.from("claims").select("status, estimated_loss_inr"),
        supabase.from("blockchain_logs").select("id", { count: "exact" }),
        supabase.from("weather_verifications").select("verified")
      ]);

      const claimsData = claimsRes.data || [];
      const totalClaims = claimsData.length;
      const approvedClaims = claimsData.filter((c) => c.status === "approved").length;
      const rejectedClaims = claimsData.filter((c) => c.status === "rejected").length;
      const pendingClaims = claimsData.filter((c) => ["pending_ai", "pending_weather", "pending_officer"].includes(c.status)).length;
      
      const totalDisbursedInr = claimsData
        .filter((c) => c.status === "approved")
        .reduce((sum, c) => sum + Number(c.estimated_loss_inr), 0);

      const totalSecuredBlocks = blocksRes.count || 0;
      const wetVerifications = (weatherRes.data || []).filter((v) => v.verified).length;

      res.json({
        totalClaims,
        approvedClaims,
        rejectedClaims,
        pendingClaims,
        totalDisbursedInr,
        totalSecuredBlocks,
        weatherVerifiedPercentage: totalClaims > 0 ? Math.round((wetVerifications / totalClaims) * 100) : 0
      });
    } else {
      const db = getDB();
      const totalClaims = db.claims.length;
      const approvedClaims = db.claims.filter((c) => c.status === "approved").length;
      const rejectedClaims = db.claims.filter((c) => c.status === "rejected").length;
      const pendingClaims = db.claims.filter((c) => ["pending_ai", "pending_weather", "pending_officer"].includes(c.status)).length;
      const totalDisbursedInr = db.claims
        .filter((c) => c.status === "approved")
        .reduce((sum, c) => sum + c.estimatedLossInr, 0);
      const wetVerifications = db.weatherVerifications.filter((v) => v.verified).length;

      res.json({
        totalClaims,
        approvedClaims,
        rejectedClaims,
        pendingClaims,
        totalDisbursedInr,
        totalSecuredBlocks: db.blockchainBlocks.length,
        weatherVerifiedPercentage: totalClaims > 0 ? Math.round((wetVerifications / totalClaims) * 100) : 0
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =======================================================================
// VITE CLIENT DEV SERVER OR STATIC PRODUCTION BUILD HANDLER
// =======================================================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nyay Setu Server running on http://localhost:${PORT}`);
  });
}

startServer();
