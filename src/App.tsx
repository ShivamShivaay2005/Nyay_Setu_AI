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

  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // ---- Connect MetaMask on load if already connected ----
  useEffect(() => {
    const checkWallet = async () => {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (e) {
          console.error("Error checking wallet connection:", e);
        }
      }
    };
    checkWallet();
  }, []);

  const handleConnectWallet = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (e) {
        console.error("Error connecting MetaMask:", e);
      }
    } else {
      alert("MetaMask is not installed. Please install it from metamask.io!");
    }
  };

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
    const decisionResult = await res.json();
    await fetchData();
    setSelectedClaimId(null);
    return decisionResult;
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
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 flex flex-col font-sans">
      
      {/* GLOBAL HEADER */}
      <header className="bg-white/90 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Branding Logo */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => { window.location.href = "landing.html"; }}
            >
              <div className="bg-gradient-to-br from-emerald-600 to-green-700 text-amber-300 p-2 rounded-2xl shadow-md shadow-emerald-700/20 flex items-center justify-center group-hover:scale-105 transition">
                <Sprout className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  Nyay Setu <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">AI</span>
                </h1>
                <p className="text-[11px] text-emerald-800/70 font-medium">Smart Kisan Insurance Grid</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Authenticated session: show user info + logout */}
              {!canSwitchRoles && sessionUser && (
                <div className="flex items-center gap-4">
                  {walletAddress ? (
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-xl font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {walletAddress.substring(0, 6)}...{walletAddress.slice(-4)}
                    </span>
                  ) : (
                    <button
                      onClick={handleConnectWallet}
                      className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 hover:text-indigo-700 bg-slate-50 hover:bg-indigo-50/30 border border-slate-200 hover:border-indigo-200 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                    >
                      🔌 Connect Wallet
                    </button>
                  )}
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-bold text-slate-900">{sessionUser.name}</span>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                      sessionUser.role === "officer"
                        ? "bg-blue-50 text-blue-800 border-blue-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}>
                      {sessionUser.role === "officer" ? "🏛️ Officer" : "🌾 Farmer"}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout
                  </button>
                </div>
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
