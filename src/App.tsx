import { useState, useEffect } from "react";
import { 
  Sprout, ChevronRight, Sparkles, Key, LogOut, Home
} from "lucide-react";
import { UserRole, Claim, BlockchainBlock } from "./types";
import FarmerDashboard from "./components/FarmerDashboard";
import OfficerDashboard from "./components/OfficerDashboard";
import AdminDashboard from "./components/AdminDashboard";

// ---------- Session helpers ----------
interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "farmer" | "officer";
}

function getSessionUser(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem("nyay_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem("nyay_user");
}

export default function App() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  const [currentRole, setCurrentRole] = useState<UserRole | "landing">("landing");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [blockchainBlocks, setBlockchainBlocks] = useState<BlockchainBlock[]>([]);
  const [stats, setStats] = useState({
    totalClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0,
    pendingClaims: 0,
    totalDisbursedInr: 0,
    totalSecuredBlocks: 0,
    weatherVerifiedPercentage: 0,
  });

  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [claimDetails, setClaimDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // ---- Resolve logged-in user based on session or demo fallback ----
  const DEMO_USERS = {
    farmer: { id: "farmer-1", name: "Rajesh Kumar", email: "rajesh.kumar@agrilink.in" },
    officer: { id: "officer-1", name: "Sandeep Verma", email: "s.verma@agriculture.gov.in" },
  };

  const activeUser = sessionUser
    ? { id: sessionUser.id, name: sessionUser.name, email: sessionUser.email }
    : currentRole === UserRole.FARMER
    ? DEMO_USERS.farmer
    : currentRole === UserRole.OFFICER
    ? DEMO_USERS.officer
    : DEMO_USERS.farmer;

  // ---- On mount: read session + URL portal param ----
  useEffect(() => {
    const user = getSessionUser();
    const urlParams = new URLSearchParams(window.location.search);
    const portal = urlParams.get("portal");

    if (user) {
      setSessionUser(user);
      if (user.role === "farmer") setCurrentRole(UserRole.FARMER);
      else if (user.role === "officer") setCurrentRole(UserRole.OFFICER);
    } else {
      // No session — redirect to the static landing page
      window.location.href = "landing.html";
    }
  }, []);

  // ---- Logout handler ----
  const handleLogout = () => {
    clearSession();
    window.location.href = "landing.html";
  };

  // ---- Current user for API calls ----
  const currentUser = {
    farmer: activeUser,
    officer: activeUser,
  };

  // Fetch all claims, stats, and blockchain blocks
  const fetchData = async () => {
    try {
      const claimsRes = await fetch("/api/claims");
      const claimsData = await claimsRes.json();
      setClaims(claimsData);

      const blockchainRes = await fetch("/api/blockchain");
      const blockchainData = await blockchainRes.json();
      setBlockchainBlocks(blockchainData);

      const statsRes = await fetch("/api/stats");
      const statsData = await statsRes.json();
      setStats(statsData);
    } catch (e) {
      console.error("Error fetching ledger data:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentRole]);

  // Fetch detailed information of a selected claim (AI, Weather, Decisions, Appeals)
  useEffect(() => {
    if (!selectedClaimId) {
      setClaimDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setLoadingDetails(true);
      try {
        const res = await fetch(`/api/claims/${selectedClaimId}`);
        const data = await res.json();
        setClaimDetails(data);

        // Auto-trigger AI Analysis if the claim is pending AI audit
        if (data.claim && data.claim.status === "pending_ai") {
          await handleTriggerAnalyze(selectedClaimId);
        }
      } catch (e) {
        console.error("Error fetching claim details:", e);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedClaimId]);

  // API Call wrappers
  const handleAddClaim = async (claimPayload: Partial<Claim>) => {
    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(claimPayload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Claim submission failed");
    }
    await fetchData();
  };

  const handleTriggerAnalyze = async (claimId: string) => {
    const res = await fetch(`/api/claims/${claimId}/analyze`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "AI analysis failed");
    }
    await fetchData();
    // Re-trigger details fetch
    const detailRes = await fetch(`/api/claims/${claimId}`);
    const detailData = await detailRes.json();
    setClaimDetails(detailData);
  };

  const handleDecideClaim = async (
    claimId: string,
    statusSelected: any,
    comments: string,
    officerWallet: string
  ) => {
    const res = await fetch(`/api/claims/${claimId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        officerId: currentUser.officer.id,
        officerName: currentUser.officer.name,
        officerPosition: sessionUser?.position || "Senior Agricultural Field Inspection Officer",
        statusSelected,
        comments,
        officerWallet,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Decision upload failed");
    }
    await fetchData();
    setSelectedClaimId(null);
  };

  const handleAppealClaim = async (claimId: string, reason: string, newEvidenceUrl?: string) => {
    const res = await fetch(`/api/claims/${claimId}/appeal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        farmerId: currentUser.farmer.id,
        reason,
        newEvidenceUrl,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Appeal filing failed");
    }
    await fetchData();
    // Re-trigger details fetch
    const detailRes = await fetch(`/api/claims/${claimId}`);
    const detailData = await detailRes.json();
    setClaimDetails(detailData);
  };

  const handleSubmitSupplementalEvidence = async (
    claimId: string,
    additionalDescription: string,
    additionalImageUrls: string[]
  ) => {
    const res = await fetch(`/api/claims/${claimId}/supplemental-evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ additionalDescription, additionalImageUrls }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Evidence submission failed");
    }
    await fetchData();
    const detailRes = await fetch(`/api/claims/${claimId}`);
    const detailData = await detailRes.json();
    setClaimDetails(detailData);
  };


  // ---- No need for role switching anymore since we use login.html ----
  const canSwitchRoles = false;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* GLOBAL HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Branding Logo */}
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => { window.location.href = "landing.html"; }}
            >
              <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-600/5 flex items-center justify-center">
                <Sprout className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1">
                  Nyay Setu AI <span className="text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200/50">Ledger</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">Kisan Crop-Loss Verification Grid</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Demo mode: full role switcher for hackathon evaluators */}
              {canSwitchRoles && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => { setCurrentRole("landing"); setSelectedClaimId(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentRole === "landing" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    🏠 Home
                  </button>
                  <button
                    onClick={() => { setCurrentRole(UserRole.FARMER); setSelectedClaimId(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentRole === UserRole.FARMER ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    🌾 Farmer
                  </button>
                  <button
                    onClick={() => { setCurrentRole(UserRole.OFFICER); setSelectedClaimId(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentRole === UserRole.OFFICER ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    🛡️ Officer
                  </button>
                  <button
                    onClick={() => { setCurrentRole(UserRole.ADMIN); setSelectedClaimId(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentRole === UserRole.ADMIN ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    ⛓️ Chain
                  </button>
                </div>
              )}

              {/* Authenticated session: show user info + logout */}
              {!canSwitchRoles && sessionUser && (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-bold text-slate-800">{sessionUser.name}</span>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                      sessionUser.role === "officer"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {sessionUser.role === "officer" ? "🏛️ Officer" : "🌾 Farmer"}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-xl transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout
                  </button>
                </div>
              )}

              {/* Demo mode badge */}
              {canSwitchRoles && (
                <span className="hidden md:flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  🎯 Demo / Eval Mode
                </span>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* CORE PLATFORM VIEWS */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* LANDING PAGE PERSPECTIVE (Removed in favor of landing.html) */}

        {/* FARMER PERSPECTIVE */}
        {currentRole === UserRole.FARMER && (
          <FarmerDashboard
            userId={activeUser.id}
            userName={activeUser.name}
            claims={claims}
            onAddClaim={handleAddClaim}
            onTriggerAnalyze={handleTriggerAnalyze}
            onAppeal={handleAppealClaim}
            onSubmitSupplementalEvidence={handleSubmitSupplementalEvidence}
            selectedClaimId={selectedClaimId}
            setSelectedClaimId={setSelectedClaimId}
            claimDetails={claimDetails}
            loadingDetails={loadingDetails}
            refreshClaims={fetchData}
          />
        )}

        {/* OFFICER PERSPECTIVE */}
        {currentRole === UserRole.OFFICER && (
          <OfficerDashboard
            userId={activeUser.id}
            userName={activeUser.name}
            claims={claims}
            onDecideClaim={handleDecideClaim}
            selectedClaimId={selectedClaimId}
            setSelectedClaimId={setSelectedClaimId}
            claimDetails={claimDetails}
            loadingDetails={loadingDetails}
            refreshClaims={fetchData}
          />
        )}

        {/* ADMIN BLOCKCHAIN PERSPECTIVE */}
        {currentRole === UserRole.ADMIN && (
          <AdminDashboard
            blocks={blockchainBlocks}
            stats={stats}
            refreshBlocks={fetchData}
          />
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Nyay Setu AI. Mined securely under Government of India Agricultural Relief Framework standards.</p>
          <p className="mt-1 font-mono text-[10px] text-slate-300">Decentralized Node Sync Status: Operational</p>
        </div>
      </footer>

    </div>
  );
}
