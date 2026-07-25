import { useState } from "react";
import {
  FileCheck, Shield, Sparkles, CloudSun, MapPin, Check, X, AlertCircle,
  Calendar, ArrowRight, Wallet, RefreshCw, Layers,
  Search, CheckCircle2, Clock, Image as ImageIcon, ZoomIn, ChevronLeft, ChevronRight,
  XCircle, FlaskConical, RotateCcw, ExternalLink, Wheat, ClipboardCheck,
  IndianRupee, Users, ArrowUpRight, ListChecks, Droplets, BarChart3
} from "lucide-react";
import { Claim, ClaimStatus } from "../types";
import MapComponent from "./MapComponent";
import TimelineComponent from "./TimelineComponent";
import farmerHero from "../../landing_farmer_realistic.png";

interface OfficerDashboardProps {
  userId: string;
  userName: string;
  claims: Claim[];
  onDecideClaim: (
    id: string,
    statusSelected: ClaimStatus,
    comments: string,
    officerWallet: string
  ) => Promise<any>;
  selectedClaimId: string | null;
  setSelectedClaimId: (id: string | null) => void;
  claimDetails: any;
  loadingDetails: boolean;
  refreshClaims: () => void;
}

type TabType = "active" | "reclaim" | "approved" | "rejected" | "evidence_vault";

const OFFICER_REFERENCES = [
  {
    label: "PMFBY Dashboard",
    title: "Scheme statistics",
    description: "Review official coverage, applications and claim-paid indicators.",
    href: "https://pmfby.gov.in/adminStatistics/dashboard",
    icon: BarChart3,
  },
  {
    label: "WINDS",
    title: "Hyperlocal weather",
    description: "Open the national weather data system used for crop-risk decisions.",
    href: "https://pmfby.gov.in/winds/weather",
    icon: CloudSun,
  },
  {
    label: "PMFBY Tools",
    title: "Loss assessment suite",
    description: "Access CLAP, CCE, YESTECH and other official field-operation tools.",
    href: "https://www.pmfby.gov.in/",
    icon: ClipboardCheck,
  },
] as const;

const REVIEW_TEMPLATES = [
  {
    label: "Evidence aligns",
    text: "Field photographs, reported crop details, geo-location and available weather evidence are consistent. Claim is recommended for approval.",
  },
  {
    label: "Need evidence",
    text: "The current record is insufficient for a fair determination. Please submit wider field photographs, close damage images and supporting date/location evidence.",
  },
  {
    label: "Mismatch found",
    text: "The submitted evidence does not sufficiently align with the reported damage type, affected area or available verification data. Claim requires rejection with recorded reasons.",
  },
] as const;

export default function OfficerDashboard({
  userId,
  userName,
  claims,
  onDecideClaim,
  selectedClaimId,
  setSelectedClaimId,
  claimDetails,
  loadingDetails,
  refreshClaims,
}: OfficerDashboardProps) {
  const [comments, setComments] = useState("");
  const [isSealing, setIsSealing] = useState(false);
  const [officerWallet, setOfficerWallet] = useState("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [cropFilter, setCropFilter] = useState("all");
  const [reviewChecks, setReviewChecks] = useState({
    evidence: false,
    ai: false,
    weather: false,
    location: false,
  });
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [lightboxGallery, setLightboxGallery] = useState<string[]>([]);

  // All images for the currently selected claim
  const getClaimImages = (claim: any): string[] => {
    if (!claim) return [];
    if (claim.imageUrls?.length) return claim.imageUrls;
    if (claim.imageUrl) return [claim.imageUrl];
    return [];
  };

  // Lightbox navigation helpers
  const openLightbox = (images: string[], idx: number) => {
    setLightboxGallery(images);
    setLightboxImg(images[idx]);
    setLightboxIdx(idx);
  };
  const lightboxImages = lightboxGallery;
  const prevImg = () => {
    const idx = (lightboxIdx - 1 + lightboxImages.length) % lightboxImages.length;
    setLightboxIdx(idx);
    setLightboxImg(lightboxImages[idx]);
  };
  const nextImg = () => {
    const idx = (lightboxIdx + 1) % lightboxImages.length;
    setLightboxIdx(idx);
    setLightboxImg(lightboxImages[idx]);
  };

  // Re-Claimed: farmer responded to more_evidence request — now back in pending_officer
  const reclaimQueue = claims.filter((c) =>
    c.status === "pending_officer" && !!c.supplementalEvidenceAt
  );

  // Active Cases: new/appealed — officer still needs to act (exclude re-claimed)
  const activeQueue = claims.filter((c) =>
    ["pending_officer", "pending_ai", "pending_weather", "appealed"].includes(c.status)
    && !c.supplementalEvidenceAt
  );

  // Approved: officer approved
  const approvedQueue = claims.filter((c) => c.status === "approved");

  // Rejected: officer rejected
  const rejectedQueue = claims.filter((c) => c.status === "rejected");

  // Evidence Vault: officer asked for more evidence
  const evidenceVaultQueue = claims.filter((c) => c.status === "more_evidence");

  const currentQueue =
    activeTab === "active" ? activeQueue
    : activeTab === "reclaim" ? reclaimQueue
    : activeTab === "approved" ? approvedQueue
    : activeTab === "rejected" ? rejectedQueue
    : evidenceVaultQueue;

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const cropOptions = Array.from(new Set(claims.map((claim) => claim.cropType)));
  const filteredQueue = currentQueue.filter((claim) => {
    const matchesSearch =
      !normalizedSearch ||
      claim.id.toLowerCase().includes(normalizedSearch) ||
      claim.farmerName.toLowerCase().includes(normalizedSearch) ||
      claim.cropType.toLowerCase().includes(normalizedSearch);
    const matchesCrop = cropFilter === "all" || claim.cropType === cropFilter;
    return matchesSearch && matchesCrop;
  });
  const totalClaimValue = claims.reduce((total, claim) => total + claim.estimatedLossInr, 0);
  const approvedValue = approvedQueue.reduce((total, claim) => total + claim.estimatedLossInr, 0);
  const firstName = userName.trim().split(/\s+/)[0] || "Officer";
  const reviewProgress = Object.values(reviewChecks).filter(Boolean).length;

  const selectQueue = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedClaimId(null);
    document.getElementById("officer-queue")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openClaim = (claimId: string) => {
    setSelectedClaimId(claimId);
    setReviewChecks({ evidence: false, ai: false, weather: false, location: false });
  };

  const handleDecision = async (status: ClaimStatus) => {
    if (!comments.trim()) {
      alert("Please provide official feedback comments justifying this claim status update.");
      return;
    }

    setIsSealing(true);
    try {
      const result = await onDecideClaim(claimDetails.claim.id, status, comments, officerWallet);
      setComments("");
      setSelectedClaimId(null);
      const ledgerLabel = result?.blockchainMode === "sepolia"
        ? "Ethereum Sepolia"
        : "the local cryptographic simulator";
      alert(`Claim status updated to ${status.toUpperCase()} and sealed through ${ledgerLabel}.`);
    } catch (err: any) {
      alert("Error submitting decision: " + err.message);
    } finally {
      setIsSealing(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending_officer: "bg-blue-50 border-blue-100 text-blue-700",
      pending_ai: "bg-slate-50 border-slate-200 text-slate-500",
      pending_weather: "bg-purple-50 border-purple-100 text-purple-700",
      appealed: "bg-indigo-50 border-indigo-100 text-indigo-700",
      approved: "bg-emerald-50 border-emerald-100 text-emerald-700",
      rejected: "bg-rose-50 border-rose-100 text-rose-700",
      more_evidence: "bg-amber-50 border-amber-100 text-amber-700",
    };
    return map[status] || "bg-slate-50 border-slate-200 text-slate-500";
  };

  return (
    <>
      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImg}
              alt="Evidence"
              className="w-full rounded-2xl object-contain max-h-[80vh]"
              referrerPolicy="no-referrer"
            />
            {lightboxImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImg(); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImg(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                  {lightboxIdx + 1} / {lightboxImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="officer-dashboard space-y-6">
        <section className="officer-command overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-green-900 to-lime-800 text-white shadow-xl shadow-emerald-950/10">
          <div className="officer-command__image" style={{ backgroundImage: `url(${farmerHero})` }} />
          <div className="officer-command__veil" />
          <div className="officer-command__content">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300 text-emerald-950">
                  <Shield className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-200">District crop protection desk</p>
                  <p className="text-sm font-semibold text-white/80">Officer {firstName} · Lucknow review unit</p>
                </div>
              </div>
              <button
                type="button"
                onClick={refreshClaims}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-white/20"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Sync claim desk
              </button>
            </div>

            <div className="grid gap-8 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-50">
                  <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_0_4px_rgba(253,224,71,0.16)]" />
                  {activeQueue.length + reclaimQueue.length} reviews in motion
                </div>
                <h1 className="max-w-2xl font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                  Read the field.<br />
                  <span className="text-amber-300">Deliver a fair decision.</span>
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
                  Compare farmer evidence, AI signals, weather records and geo-location before sealing every crop-loss outcome.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-black/15 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/55">Claim exposure</p>
                    <p className="mt-1 text-2xl font-extrabold">₹{totalClaimValue.toLocaleString("en-IN")}</p>
                  </div>
                  <IndianRupee className="h-7 w-7 text-amber-300" />
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-amber-300 transition-all duration-500"
                    style={{ width: `${totalClaimValue ? Math.max(8, Math.round((approvedValue / totalClaimValue) * 100)) : 0}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[9px] text-white/55">
                  <span>Approved assessment</span>
                  <span>₹{approvedValue.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-2 border-t border-white/15 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { tab: "active" as TabType, label: "Active queue", value: activeQueue.length, meta: "Needs review", icon: Clock },
                { tab: "reclaim" as TabType, label: "Farmer replied", value: reclaimQueue.length, meta: "New evidence", icon: RotateCcw },
                { tab: "evidence_vault" as TabType, label: "Evidence wait", value: evidenceVaultQueue.length, meta: "Follow-up", icon: FlaskConical },
                { tab: "approved" as TabType, label: "Approved", value: approvedQueue.length, meta: "Decision sealed", icon: CheckCircle2 },
              ].map((metric) => {
                const MetricIcon = metric.icon;
                return (
                  <button
                    key={metric.label}
                    type="button"
                    onClick={() => selectQueue(metric.tab)}
                    className="group rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 text-left transition hover:border-amber-300/50 hover:bg-white/[0.13]"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/55">{metric.label}</p>
                      <MetricIcon className="h-3.5 w-3.5 text-amber-300" />
                    </div>
                    <div className="mt-1 flex items-end justify-between">
                      <strong className="text-xl font-extrabold">{metric.value}</strong>
                      <span className="text-[9px] text-amber-200">{metric.meta}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-12">
          <article className="agri-panel lg:col-span-4">
            <span className="eyebrow"><Wheat className="h-3.5 w-3.5" /> Crop lens</span>
            <h2 className="mt-2 font-display text-xl font-extrabold text-slate-900">Focus the review queue</h2>
            <p className="mt-1 text-xs text-slate-500">Filter all officer queues by the reported crop.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCropFilter("all")}
                aria-pressed={cropFilter === "all"}
                className={`rounded-full border px-3 py-2 text-[10px] font-bold transition ${cropFilter === "all" ? "border-emerald-700 bg-emerald-700 text-white" : "border-stone-200 bg-stone-50 text-slate-600 hover:border-emerald-300"}`}
              >
                All crops
              </button>
              {cropOptions.map((crop) => (
                <button
                  key={crop}
                  type="button"
                  onClick={() => setCropFilter(crop)}
                  aria-pressed={cropFilter === crop}
                  className={`rounded-full border px-3 py-2 text-[10px] font-bold transition ${cropFilter === crop ? "border-emerald-700 bg-emerald-700 text-white" : "border-stone-200 bg-stone-50 text-slate-600 hover:border-emerald-300"}`}
                >
                  {crop}
                </button>
              ))}
            </div>
          </article>

          <article className="agri-panel lg:col-span-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="eyebrow"><ExternalLink className="h-3.5 w-3.5" /> Officer references</span>
                <h2 className="mt-2 font-display text-xl font-extrabold text-slate-900">Official field-operation tools</h2>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-stone-600">Government services</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {OFFICER_REFERENCES.map((reference) => {
                const ReferenceIcon = reference.icon;
                return (
                  <a key={reference.label} href={reference.href} target="_blank" rel="noreferrer" className="resource-card group">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 transition group-hover:bg-emerald-700 group-hover:text-white">
                      <ReferenceIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[8px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">{reference.label}</span>
                      <strong className="mt-1 block text-xs text-slate-900">{reference.title}</strong>
                      <span className="mt-1 block text-[9px] leading-4 text-slate-500">{reference.description}</span>
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  </a>
                );
              })}
            </div>
          </article>
        </section>

        <div id="officer-queue" className="grid scroll-mt-24 grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN: Queue with tabs + search */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-600" />
                  Audit Queue
                </h2>
                <p className="text-xs text-slate-500">Inspect farmer claims with AI assistance.</p>
              </div>
              <button
                onClick={refreshClaims}
                title="Refresh"
                className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 transition cursor-pointer border border-slate-200"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Claim ID, farmer name…"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tabs — 5 sections in 3+2 grid */}
            <div className="space-y-1 mb-4">
              {/* Row 1: 3 tabs */}
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                {/* Active Cases */}
                <button
                  onClick={() => { setActiveTab("active"); setSelectedClaimId(null); }}
                  className={`flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-[10px] font-semibold transition-all ${
                    activeTab === "active"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Active
                  <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${
                    activeTab === "active" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"
                  }`}>
                    {activeQueue.length}
                  </span>
                </button>

                {/* Re-Claimed */}
                <button
                  onClick={() => { setActiveTab("reclaim"); setSelectedClaimId(null); }}
                  className={`relative flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-[10px] font-semibold transition-all ${
                    activeTab === "reclaim"
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {reclaimQueue.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
                  )}
                  <RotateCcw className="w-3 h-3" />
                  Re-Claimed
                  <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${
                    activeTab === "reclaim" ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-500"
                  }`}>
                    {reclaimQueue.length}
                  </span>
                </button>

                {/* Evidence Vault */}
                <button
                  onClick={() => { setActiveTab("evidence_vault"); setSelectedClaimId(null); }}
                  className={`flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-[10px] font-semibold transition-all ${
                    activeTab === "evidence_vault"
                      ? "bg-white text-amber-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <FlaskConical className="w-3 h-3" />
                  Evidence Vault
                  <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${
                    activeTab === "evidence_vault" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-500"
                  }`}>
                    {evidenceVaultQueue.length}
                  </span>
                </button>
              </div>

              {/* Row 2: 2 tabs */}
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                {/* Approved */}
                <button
                  onClick={() => { setActiveTab("approved"); setSelectedClaimId(null); }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                    activeTab === "approved"
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Approved
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                  }`}>
                    {approvedQueue.length}
                  </span>
                </button>

                {/* Rejected */}
                <button
                  onClick={() => { setActiveTab("rejected"); setSelectedClaimId(null); }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                    activeTab === "rejected"
                      ? "bg-white text-rose-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <XCircle className="w-3 h-3" />
                  Rejected
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === "rejected" ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-500"
                  }`}>
                    {rejectedQueue.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Claims List */}
            <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
              {filteredQueue.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Shield className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                  <p className="text-xs font-semibold">
                    {searchQuery
                      ? "No matching claims found"
                      : activeTab === "active" ? "No Active Cases"
                      : activeTab === "reclaim" ? "No Re-Claimed Cases Yet"
                      : activeTab === "approved" ? "No Approved Cases Yet"
                      : activeTab === "rejected" ? "No Rejected Cases"
                      : "Evidence Vault Is Empty"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {searchQuery ? "Try a different search term." : "Claims in this category will appear here."}
                  </p>
                </div>
              ) : (
                filteredQueue.map((claim) => {
                  const isSelected = selectedClaimId === claim.id;
                  const imgs = getClaimImages(claim);

                  return (
                    <div
                      key={claim.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openClaim(claim.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openClaim(claim.id);
                        }
                      }}
                      aria-pressed={isSelected}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/60 shadow-sm"
                          : activeTab === "reclaim"
                          ? "border-violet-200 bg-violet-50/40 hover:bg-violet-50"
                          : "border-stone-200 bg-stone-50/50 hover:border-emerald-200 hover:bg-emerald-50/30"
                      }`}
                    >
                      {/* Re-Claimed badge */}
                      {activeTab === "reclaim" && (
                        <div className="flex items-center gap-1 mb-2">
                          <RotateCcw className="w-3 h-3 text-violet-600" />
                          <span className="text-[9px] font-bold text-violet-700 uppercase tracking-wide">Farmer Responded · New Evidence Submitted</span>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                            {claim.id}
                          </span>
                          <h4 className="text-sm font-bold text-slate-800 mt-1">{claim.cropType}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Farmer: {claim.farmerName}</p>
                        </div>

                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${statusBadge(claim.status)}`}>
                          {claim.status.replace("_", " ")}
                        </span>
                      </div>

                      {/* Thumbnail strip */}
                      {imgs.length > 0 && (
                        <div className="mt-2 flex gap-1.5 overflow-x-auto">
                          {imgs.slice(0, 3).map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt=""
                              className="h-9 w-12 object-cover rounded-lg border border-slate-200 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ))}
                          {imgs.length > 3 && (
                            <div className="h-9 w-12 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-[9px] text-slate-500 font-bold shrink-0">
                              +{imgs.length - 3}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2 text-slate-500">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase block">Damage</span>
                          <span className="font-semibold text-slate-700">{claim.damageType}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 uppercase block">Estimate Loss</span>
                          <span className="font-semibold text-emerald-700 font-mono">₹{claim.estimatedLossInr.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 pt-1.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(claim.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-0.5 text-emerald-700 font-semibold">
                          Inspect Case <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Officer Audit Panel */}
        <div className="lg:col-span-7 space-y-6">
          {selectedClaimId && claimDetails ? (
            <>
              {/* Quick overview of claim */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <div className="border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Audit: {claimDetails.claim.cropType} Loss Case
                      </h2>
                      <p className="text-xs text-slate-500">Filed by {claimDetails.claim.farmerName} on {new Date(claimDetails.claim.createdAt).toLocaleString()}</p>
                    </div>
                    <span className="bg-slate-100 text-slate-600 text-xs font-mono px-2 py-0.5 rounded-md">
                      {claimDetails.claim.id}
                    </span>
                  </div>
                </div>

                {/* Loss Details */}
                <div className="grid grid-cols-3 gap-4 text-center mb-6">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Acreage</span>
                    <p className="text-sm font-bold text-slate-800 mt-1">{claimDetails.claim.areaAcres} Acres</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Estimate Loss</span>
                    <p className="text-sm font-bold font-mono text-blue-600 mt-1">₹{claimDetails.claim.estimatedLossInr.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Reported Damage</span>
                    <p className="text-sm font-bold text-slate-800 mt-1">{claimDetails.claim.damageType}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Farmer Description Statement:</span>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed italic">
                    &ldquo;{claimDetails.claim.description}&rdquo;
                  </p>
                </div>
              </div>

              {/* Evidence Images Gallery */}
              {(() => {
                const imgs = getClaimImages(claimDetails.claim);
                return imgs.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      Farmer-Submitted Evidence Photos ({imgs.length})
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {imgs.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => openLightbox(imgs, idx)}
                          className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square cursor-zoom-in"
                        >
                          <img
                            src={img}
                            alt={`Evidence ${idx + 1}`}
                            className="w-full h-full object-cover transition group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="w-5 h-5 text-white" />
                          </div>
                          {idx === 0 && (
                            <span className="absolute top-1 left-1 bg-blue-600 text-white text-[8px] font-bold px-1 py-0.5 rounded">PRIMARY</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">Click any photo to enlarge · Navigate with arrows in fullscreen</p>
                  </div>
                ) : null;
              })()}

              {/* Supplemental evidence is intentionally separate from the original filing. */}
              {claimDetails.claim.supplementalEvidence?.map((submission: any, submissionIndex: number) => {
                const supplementalImages = Array.isArray(submission.imageUrls) ? submission.imageUrls : [];
                return (
                  <div key={submission.id || submissionIndex} className="rounded-2xl border-2 border-violet-200 bg-violet-50/35 p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-violet-100 pb-3">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-extrabold text-violet-950">
                          <RotateCcw className="h-4 w-4 text-violet-700" />
                          Farmer re-claim evidence · Round {submissionIndex + 1}
                        </p>
                        <p className="mt-1 text-[10px] text-violet-600">New response to the officer’s evidence request</p>
                      </div>
                      <time dateTime={submission.submittedAt} className="rounded-lg bg-white px-2.5 py-1.5 text-[9px] font-bold text-violet-700 ring-1 ring-violet-100">
                        {new Date(submission.submittedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </time>
                    </div>
                    {submission.description && (
                      <div className="mt-4">
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-violet-600">Additional farmer message</p>
                        <p className="mt-1 rounded-xl border border-violet-100 bg-white p-3 text-xs leading-5 text-slate-700">
                          &ldquo;{submission.description}&rdquo;
                        </p>
                      </div>
                    )}
                    <div className="mt-4">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-violet-600">
                        New evidence photos ({supplementalImages.length})
                      </p>
                      {supplementalImages.length > 0 ? (
                        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {supplementalImages.map((image: string, imageIndex: number) => (
                            <button
                              key={imageIndex}
                              type="button"
                              onClick={() => openLightbox(supplementalImages, imageIndex)}
                              className="group relative aspect-square overflow-hidden rounded-xl border border-violet-200 bg-white"
                            >
                              <img src={image} alt={`Re-claim evidence ${imageIndex + 1}`} className="h-full w-full object-cover transition group-hover:scale-105" />
                              <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                                <ZoomIn className="h-5 w-5" />
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 rounded-xl border border-dashed border-violet-200 bg-white/70 p-3 text-[10px] text-violet-600">No new photos were attached to this response.</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* AI Results Section */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Gemini AI Vision Assessment
                  </h3>
                  {claimDetails.aiResult ? (
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                      Truth Score: {Math.round(claimDetails.aiResult.confidenceScore * 100)}%
                    </span>
                  ) : (
                    <span className="bg-slate-50 text-slate-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      Awaiting Analysis
                    </span>
                  )}
                </div>

                {claimDetails.aiResult ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-slate-100 p-3 rounded-xl bg-slate-50/50">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Detected Crop</span>
                        <p className="text-xs font-semibold text-slate-700 mt-1">{claimDetails.aiResult.cropTypeDetected}</p>
                      </div>
                      <div className="border border-slate-100 p-3 rounded-xl bg-slate-50/50">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Severe Stress Index</span>
                        <p className="text-xs font-semibold text-red-600 mt-1">{claimDetails.aiResult.severity}</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">AI Evidence Reasoning</span>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100 font-serif italic">
                        {claimDetails.aiResult.reasoning}
                      </p>
                    </div>

                    {claimDetails.aiResult.manualReviewRequired && (
                      <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl flex items-start gap-2 text-xs">
                        <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Manual Flag Triggered:</span> Special inspection advised. Gemini flagged leaf necrosis boundaries or soil abnormalities requiring double-verification.
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    AI analysis report has not been triggered yet. Farmers trigger analysis or wait for automatic cron cycle.
                  </div>
                )}
              </div>

              {/* Weather Verification Section */}
              {claimDetails.weatherVerification && (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                    <CloudSun className="w-4.5 h-4.5 text-purple-600" />
                    Meteorological Weather Grid Crosscheck
                  </h3>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="border border-slate-100 p-2.5 rounded-xl bg-purple-50/10">
                      <span className="text-[9px] text-purple-600 font-bold uppercase block">Anomalous Precip</span>
                      <p className="text-sm font-bold text-purple-900 mt-0.5">{claimDetails.weatherVerification.precipitation} mm</p>
                    </div>
                    <div className="border border-slate-100 p-2.5 rounded-xl bg-purple-50/10">
                      <span className="text-[9px] text-purple-600 font-bold uppercase block">Soil Humidity</span>
                      <p className="text-sm font-bold text-purple-900 mt-0.5">{claimDetails.weatherVerification.humidity}%</p>
                    </div>
                    <div className="border border-slate-100 p-2.5 rounded-xl bg-purple-50/10">
                      <span className="text-[9px] text-purple-600 font-bold uppercase block">Local Temp</span>
                      <p className="text-sm font-bold text-purple-900 mt-0.5">{claimDetails.weatherVerification.temperature}°C</p>
                    </div>
                  </div>

                  <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3 text-xs text-purple-800">
                    <p className="font-semibold flex items-center gap-1 mb-1">
                      <FileCheck className="w-4 h-4 text-purple-600" />
                      Station Met Analysis ({claimDetails.weatherVerification.stationName}):
                    </p>
                    <p className="leading-relaxed font-sans">{claimDetails.weatherVerification.analysisNote}</p>
                  </div>
                </div>
              )}

              {/* Map geo verification */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-red-500" />
                  Geospatial Mapping Verification
                </h3>
                <div className="h-64 rounded-xl overflow-hidden border border-slate-200">
                  <MapComponent
                    latitude={claimDetails.claim.latitude}
                    longitude={claimDetails.claim.longitude}
                    cropType={claimDetails.claim.cropType}
                    damageType={claimDetails.claim.damageType}
                    farmerName={claimDetails.claim.farmerName}
                  />
                </div>
              </div>

              {/* Appeal Text details if any */}
              {claimDetails.appeal && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 border-b border-indigo-150 pb-2">
                    <AlertCircle className="w-4.5 h-4.5 text-indigo-600" />
                    <h4 className="text-sm font-bold text-indigo-950">Active Farmer Grievance / Appeal</h4>
                  </div>
                  <p className="text-xs text-indigo-800 leading-relaxed">
                    The farmer has filed a dispute following a previous claim decision. Inspect the appeal statement carefully before making your final determination.
                  </p>
                  <div className="bg-white/80 p-3 rounded-xl border border-indigo-100 text-xs italic text-indigo-900">
                    &ldquo;{claimDetails.appeal.reason}&rdquo;
                  </div>
                </div>
              )}

              <TimelineComponent
                claim={claimDetails.claim}
                aiResult={claimDetails.aiResult}
                weatherVerification={claimDetails.weatherVerification}
                decisions={claimDetails.decisions}
                appeal={claimDetails.appeal}
              />

              {/* Officer Audit Form & Sign to Ledger — for active AND reclaim cases */}
              {(activeTab === "active" || activeTab === "reclaim") && (
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900">
                      <Wallet className="w-4 h-4 text-emerald-700" />
                      Review & decision seal
                    </h3>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-semibold">
                      Kisan Nyay Ledger v1.0
                    </span>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-emerald-900">
                        <ListChecks className="h-4 w-4" /> Review checkpoints
                      </p>
                      <span className="text-[10px] font-bold text-emerald-700">{reviewProgress}/4 checked</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {([
                        ["evidence", "Photos", ImageIcon],
                        ["ai", "AI report", Sparkles],
                        ["weather", "Weather", Droplets],
                        ["location", "Location", MapPin],
                      ] as const).map(([key, label, ReviewIcon]) => {
                        const checked = reviewChecks[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={checked}
                            onClick={() => setReviewChecks((current) => ({ ...current, [key]: !current[key] }))}
                            className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[10px] font-bold transition ${
                              checked
                                ? "border-emerald-700 bg-emerald-700 text-white"
                                : "border-emerald-100 bg-white text-slate-600 hover:border-emerald-300"
                            }`}
                          >
                            {checked ? <Check className="h-3.5 w-3.5" /> : <ReviewIcon className="h-3.5 w-3.5" />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                      <span>Fallback officer wallet</span>
                      <span className="text-[9px] text-emerald-700 font-medium">Sepolia uses the authorized server signer</span>
                    </label>
                    <input
                      type="text"
                      value={officerWallet}
                      onChange={(e) => setOfficerWallet(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none font-mono focus:ring-2 focus:ring-emerald-600"
                      aria-describedby="walletHelp"
                      required
                    />
                    <p id="walletHelp" className="mt-1 text-[9px] leading-4 text-slate-400">
                      Used only when Sepolia is not configured or simulator fallback is active.
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                        Audit Findings & Justification (Required)
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {REVIEW_TEMPLATES.map((template) => (
                          <button
                            key={template.label}
                            type="button"
                            onClick={() => setComments(template.text)}
                            className="rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-[9px] font-bold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-800"
                          >
                            {template.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-600"
                      placeholder="Justify why this claim is approved, rejected, or flagged for more evidence based on Gemini AI vision and meteorological telemetry..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <button
                      onClick={() => handleDecision("approved" as ClaimStatus)}
                      disabled={isSealing}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-4 h-4" /> Approve & Mine Block
                    </button>
                    <button
                      onClick={() => handleDecision("rejected" as ClaimStatus)}
                      disabled={isSealing}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      <X className="w-4 h-4" /> Reject Claim
                    </button>
                    <button
                      onClick={() => handleDecision("more_evidence" as ClaimStatus)}
                      disabled={isSealing}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      <AlertCircle className="w-4 h-4 text-amber-700" /> Flag More Evidence
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-400 leading-normal pt-1.5 border-t border-slate-100">
                    ⚠️ *Notice:* Approving creates an immutable cryptographic transaction ledger block, recording the claim ID, your wallet address, previous block hash, and a Keccak-256 evidence payload hash.
                  </div>
                </div>
              )}

              {/* Read-only banner for non-active tabs */}
              {activeTab === "reclaim" && (
                <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex items-center gap-3">
                  <RotateCcw className="w-5 h-5 text-violet-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-violet-900">Farmer Has Responded with New Evidence</p>
                    <p className="text-[11px] text-violet-700 mt-0.5">
                      The farmer submitted additional description and photos after your evidence request. Review the updated images and description above, then make your final decision below.
                    </p>
                    {claimDetails?.claim?.supplementalEvidenceAt && (
                      <p className="text-[10px] text-violet-500 mt-1 font-mono">
                        Evidence submitted: {new Date(claimDetails.claim.supplementalEvidenceAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {activeTab === "approved" && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-900">Claim Approved & Sealed</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        This claim has been approved and recorded immutably on the Kisan Nyay Ledger.
                      </p>
                    </div>
                  </div>
                  {claimDetails?.decisions?.length > 0 && (
                    <div className="border-t border-emerald-200/60 pt-2 text-[11px] text-emerald-900 flex items-center justify-between">
                      <span>Reviewed by: <strong className="font-semibold">{claimDetails.decisions[claimDetails.decisions.length - 1].officerName}</strong></span>
                      <span className="text-[10px] bg-emerald-200/60 font-semibold px-2 py-0.5 rounded-full text-emerald-800">
                        {claimDetails.decisions[claimDetails.decisions.length - 1].officerPosition || "Senior Agricultural Inspection Officer"}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "rejected" && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-rose-900">Claim Rejected</p>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        This claim was rejected and sealed on the Kisan Nyay Ledger. The farmer may file an appeal.
                      </p>
                    </div>
                  </div>
                  {claimDetails?.decisions?.length > 0 && (
                    <div className="border-t border-rose-200/60 pt-2 text-[11px] text-rose-900 flex items-center justify-between">
                      <span>Reviewed by: <strong className="font-semibold">{claimDetails.decisions[claimDetails.decisions.length - 1].officerName}</strong></span>
                      <span className="text-[10px] bg-rose-200/60 font-semibold px-2 py-0.5 rounded-full text-rose-800">
                        {claimDetails.decisions[claimDetails.decisions.length - 1].officerPosition || "Senior Agricultural Inspection Officer"}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "evidence_vault" && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <FlaskConical className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">Awaiting Additional Evidence</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        You requested more evidence for this claim. It will move back to Active Cases once the farmer responds.
                      </p>
                    </div>
                  </div>
                  {claimDetails?.decisions?.length > 0 && (
                    <div className="border-t border-amber-200/60 pt-2 text-[11px] text-amber-900 flex items-center justify-between">
                      <span>Flagged by: <strong className="font-semibold">{claimDetails.decisions[claimDetails.decisions.length - 1].officerName}</strong></span>
                      <span className="text-[10px] bg-amber-200/60 font-semibold px-2 py-0.5 rounded-full text-amber-800">
                        {claimDetails.decisions[claimDetails.decisions.length - 1].officerPosition || "Senior Agricultural Inspection Officer"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-100 p-12 shadow-sm text-slate-400">
              <Layers className="w-12 h-12 mb-3 text-slate-200 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-800">Select a Claim for Audit</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Review claim photo, telemetry sensors, and Gemini reasoning algorithms by clicking on any case from the queue.
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
