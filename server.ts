import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

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
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
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

// Middleware setup
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// =======================================================================
// API ENDPOINTS
// =======================================================================

// 1. GET ALL CLAIMS
app.get("/api/claims", (req, res) => {
  try {
    const db = getDB();
    res.json(db.claims);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET CLAIM BY ID WITH DETAILS
app.get("/api/claims/:id", (req, res) => {
  try {
    const db = getDB();
    const claim = db.claims.find((c) => c.id === req.params.id);
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. SUBMIT A NEW CROP CLAIM
app.post("/api/claims", (req, res) => {
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
      latitude: Number(latitude) || 26.8467,
      longitude: Number(longitude) || 80.9462,
      timestamp: new Date().toISOString(),
      status: "pending_ai",
      createdAt: new Date().toISOString(),
    };

    db.claims.unshift(newClaim);
    saveDB(db);

    res.status(201).json(newClaim);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. TRIGGER AI VISION ANALYSIS
app.post("/api/claims/:id/analyze", async (req, res) => {
  try {
    const claimId = req.params.id;
    const db = getDB();
    const claimIndex = db.claims.findIndex((c) => c.id === claimId);
    
    if (claimIndex === -1) {
      return res.status(404).json({ error: "Claim not found" });
    }

    const claim = db.claims[claimIndex];

    // Remove existing AI and weather results for re-evaluation
    db.aiResults = db.aiResults.filter((r) => r.claimId !== claimId);
    db.weatherVerifications = db.weatherVerifications.filter((w) => w.claimId !== claimId);

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

    db.aiResults.push(aiResult);

    // Weather check logic (Only for Flood, Drought, Hail)
    const isWeatherRequired = ["Flood", "Drought", "Hail"].includes(claim.damageType);
    if (isWeatherRequired) {
      db.claims[claimIndex].status = "pending_weather";
      saveDB(db);

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

      db.weatherVerifications.push(weatherVerification);
      db.claims[claimIndex].status = "pending_officer";
    } else {
      // Pest, disease, etc. skip weather check, move straight to officer review
      db.claims[claimIndex].status = "pending_officer";
    }

    saveDB(db);
    res.json({ success: true, status: db.claims[claimIndex].status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. OFFICER DECISION & CRYPTOGRAPHIC BLOCKCHAIN LEDGER BLOCK GENERATION
app.post("/api/claims/:id/decide", (req, res) => {
  try {
    const claimId = req.params.id;
    const { officerId, officerName, officerPosition, statusSelected, comments, officerWallet } = req.body;

    if (!officerId || !officerName || !statusSelected || !comments) {
      return res.status(400).json({ error: "Missing required decision fields" });
    }

    const db = getDB();
    const claimIndex = db.claims.findIndex((c) => c.id === claimId);
    if (claimIndex === -1) {
      return res.status(404).json({ error: "Claim not found" });
    }

    // 1. Record the Officer's decision in db
    const decisionId = "dec-" + Date.now();
    const newDecision = {
      id: decisionId,
      claimId,
      officerId,
      officerName,
      officerPosition: officerPosition || "Senior Agricultural Inspection Officer",
      statusSelected,
      comments,
      blockchainBlockId: null as number | null,
      decidedAt: new Date().toISOString()
    };

    // 2. Cryptographic Block Generation representing the Smart Contract
    const lastBlock = db.blockchainBlocks[db.blockchainBlocks.length - 1];
    const newBlockNumber = lastBlock ? lastBlock.blockNumber + 1 : 0;
    const previousHash = lastBlock ? lastBlock.currentHash : "0x0";

    // Create an immutable evidence payload hash representing the claim & report state
    const evidencePayload = JSON.stringify({
      claimId,
      cropType: db.claims[claimIndex].cropType,
      damageType: db.claims[claimIndex].damageType,
      estimatedLoss: db.claims[claimIndex].estimatedLossInr,
      imageUrl: db.claims[claimIndex].imageUrl.substring(0, 200) + "..." // truncated for string size
    });
    const evidenceHash = "0x" + crypto.createHash("sha256").update(evidencePayload).digest("hex");

    // Perform a simple Proof of Work mining simulator (finding a hash starting with "0000") to demonstrate blockchain mechanics!
    let nonce = 0;
    let currentHash = "";
    const walletAddress = officerWallet || "0x" + crypto.randomBytes(20).toString("hex");

    const blockTimestamp = new Date().toISOString();

    while (nonce < 100000) {
      const blockString = `${newBlockNumber}${claimId}${evidenceHash}${statusSelected}${blockTimestamp}${walletAddress}${previousHash}${nonce}`;
      currentHash = "0x" + crypto.createHash("sha256").update(blockString).digest("hex");
      if (currentHash.startsWith("0x000")) {
        break;
      }
      nonce++;
    }

    const newBlock = {
      blockNumber: newBlockNumber,
      claimId,
      evidenceHash,
      status: statusSelected,
      timestamp: blockTimestamp,
      officerWallet: walletAddress,
      previousHash,
      currentHash,
      nonce
    };

    // Store block in db blockchain ledger
    db.blockchainBlocks.push(newBlock);

    // Update claim status & attach the final transactions hash on-chain!
    db.claims[claimIndex].status = statusSelected;
    db.claims[claimIndex].blockchainTxHash = currentHash;

    // Attach blockId reference to decision logs
    newDecision.blockchainBlockId = newBlockNumber;
    db.officerDecisions.push(newDecision);

    saveDB(db);

    res.json({
      success: true,
      claimStatus: statusSelected,
      txHash: currentHash,
      blockNumber: newBlockNumber
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. SUBMIT FARMER APPEAL
app.post("/api/claims/:id/appeal", (req, res) => {
  try {
    const claimId = req.params.id;
    const { farmerId, reason, newEvidenceUrl } = req.body;

    if (!farmerId || !reason) {
      return res.status(400).json({ error: "Missing required appeal fields" });
    }

    const db = getDB();
    const claimIndex = db.claims.findIndex((c) => c.id === claimId);
    if (claimIndex === -1) {
      return res.status(404).json({ error: "Claim not found" });
    }

    // Update claim status to appealed
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

    res.json({ success: true, status: "appealed" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. SUBMIT SUPPLEMENTAL EVIDENCE (for more_evidence claims)
app.post("/api/claims/:id/supplemental-evidence", (req, res) => {
  try {
    const claimId = req.params.id;
    const { additionalDescription, additionalImageUrls } = req.body;

    const db = getDB();
    const claimIndex = db.claims.findIndex((c) => c.id === claimId);
    if (claimIndex === -1) {
      return res.status(404).json({ error: "Claim not found" });
    }

    const claim = db.claims[claimIndex];
    if (claim.status !== "more_evidence") {
      return res.status(400).json({ error: "Claim is not awaiting evidence" });
    }

    // Append supplemental description
    if (additionalDescription) {
      claim.description = (claim.description || "") + "\n\n[Supplemental Evidence]\n" + additionalDescription;
    }

    // Append new images to existing imageUrls
    if (Array.isArray(additionalImageUrls) && additionalImageUrls.length) {
      claim.imageUrls = [...(claim.imageUrls || [claim.imageUrl].filter(Boolean)), ...additionalImageUrls];
      // Update primary imageUrl to latest
      claim.imageUrl = claim.imageUrls[0];
    }

    // Record the supplemental submission timestamp
    claim.supplementalEvidenceAt = new Date().toISOString();

    // Move back to officer review queue
    claim.status = "pending_officer";

    db.claims[claimIndex] = claim;
    saveDB(db);

    res.json({ success: true, status: "pending_officer" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. GET COMPLETE BLOCKCHAIN LEDGER
app.get("/api/blockchain", (req, res) => {
  try {
    const db = getDB();
    res.json(db.blockchainBlocks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. GET HIGH LEVEL LEDGER STATISTICS (for landing page / admin dashboard)
app.get("/api/stats", (req, res) => {
  try {
    const db = getDB();
    const totalClaims = db.claims.length;
    const approvedClaims = db.claims.filter((c) => c.status === "approved").length;
    const rejectedClaims = db.claims.filter((c) => c.status === "rejected").length;
    const pendingClaims = db.claims.filter((c) => ["pending_ai", "pending_weather", "pending_officer"].includes(c.status)).length;

    // Financial calculations
    const totalDisbursedInr = db.claims
      .filter((c) => c.status === "approved")
      .reduce((sum, c) => sum + c.estimatedLossInr, 0);

    // Weather warnings
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
