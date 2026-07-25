import { useState, ChangeEvent, FormEvent, useRef } from "react";
import { 
  FileText, Plus, Landmark, CloudRain, AlertCircle, Sparkles, 
  MapPin, CheckCircle2, ChevronRight, Upload, Calendar, ArrowLeft,
  Image as ImageIcon, X, ZoomIn, FlaskConical, Send, Bell, Search,
  ShieldCheck, IndianRupee, Wheat, Droplets, Sun, Wind, ExternalLink,
  TrendingUp, RefreshCw, Clock3, CircleHelp, ArrowUpRight, Tractor,
  RotateCcw
} from "lucide-react";
import { Claim, DamageType, ClaimStatus } from "../types";
import MapComponent from "./MapComponent";
import TimelineComponent from "./TimelineComponent";
import LocationPicker from "./LocationPicker";
import farmerHero from "../../landing_farmer_realistic.png";

interface FarmerDashboardProps {
  userId: string;
  userName: string;
  claims: Claim[];
  onAddClaim: (claim: Partial<Claim>) => Promise<void>;
  onTriggerAnalyze: (id: string) => Promise<void>;
  onAppeal: (id: string, reason: string, newEvidenceUrl?: string) => Promise<void>;
  onSubmitSupplementalEvidence: (id: string, additionalDescription: string, additionalImageUrls: string[]) => Promise<void>;
  selectedClaimId: string | null;
  setSelectedClaimId: (id: string | null) => void;
  claimDetails: any;
  loadingDetails: boolean;
  refreshClaims: () => void;
}

// Preset test images of crop damage
const TEST_CROP_PRESETS = [
  {
    name: "Submerged Paddy (Flood)",
    type: "Rice (Paddy)",
    damage: DamageType.FLOOD,
    loss: 95000,
    acres: 4.8,
    lat: 26.8467,
    lng: 80.9462,
    urls: [
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?auto=format&fit=crop&q=80&w=600",
    ],
    desc: "Severe local flash flooding submerged the entire low-lying paddy field. The crop has been waterlogged for over 4 days, causing anaerobic rot of the stems."
  },
  {
    name: "Shredded Wheat (Hail)",
    type: "Wheat",
    damage: DamageType.HAIL,
    loss: 130000,
    acres: 6.5,
    lat: 30.7333,
    lng: 76.7794,
    urls: [
      "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
    ],
    desc: "Unseasonal high-velocity wind and hailstones struck our village. The mature wheat crop suffered major physical shattering and lodging."
  },
  {
    name: "Arid Wilted Corn (Drought)",
    type: "Corn (Maize)",
    damage: DamageType.DROUGHT,
    loss: 75000,
    acres: 3.5,
    lat: 22.3072,
    lng: 73.1812,
    urls: [
      "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80&w=600",
    ],
    desc: "Monsoon failed entirely in our taluka. High summer temperatures exceeding 42°C dried the soil aquifer, leading to complete corn ear stunting."
  }
];

const CROP_GUIDES = {
  paddy: {
    name: "Paddy",
    variety: "Kharif · field stage",
    icon: "🌾",
    temperature: "28°C",
    humidity: "82%",
    moisture: "74%",
    outlook: "Rain watch",
    accent: "from-emerald-700 to-green-900",
    advisory: "Clear blocked drainage channels and photograph waterlogging before field work.",
    task: "Inspect bunds before 6:00 PM",
  },
  wheat: {
    name: "Wheat",
    variety: "Rabi · planning",
    icon: "🌱",
    temperature: "24°C",
    humidity: "58%",
    moisture: "48%",
    outlook: "Dry window",
    accent: "from-amber-600 to-orange-800",
    advisory: "Use the dry window for plot inspection and record any lodging or hail damage.",
    task: "Review seed and soil records",
  },
  cotton: {
    name: "Cotton",
    variety: "Kharif · growth",
    icon: "☁️",
    temperature: "31°C",
    humidity: "66%",
    moisture: "56%",
    outlook: "Pest watch",
    accent: "from-lime-700 to-emerald-900",
    advisory: "Check the underside of leaves and capture close, well-lit pest evidence.",
    task: "Complete a morning pest walk",
  },
} as const;

type CropGuideKey = keyof typeof CROP_GUIDES;
type ClaimFilter = "all" | "action" | "processing" | "approved";

const FARMER_REFERENCES = [
  {
    label: "PMFBY",
    title: "Policy & claim services",
    description: "Check application status, insurance tools and crop-loss support.",
    href: "https://pmfby.gov.in/claimProcess",
    icon: ShieldCheck,
  },
  {
    label: "IMD Agromet",
    title: "Weather advisories",
    description: "Open official agricultural weather services and farmer advisories.",
    href: "https://mausam.imd.gov.in/responsive/servicesMetAgriculture.php",
    icon: CloudRain,
  },
  {
    label: "e-NAM",
    title: "Live mandi prices",
    description: "Compare official commodity-wise and state-wise market information.",
    href: "https://enam.gov.in/web/dashboard/live_price",
    icon: TrendingUp,
  },
] as const;

export default function FarmerDashboard({
  userId,
  userName,
  claims,
  onAddClaim,
  onTriggerAnalyze,
  onAppeal,
  onSubmitSupplementalEvidence,
  selectedClaimId,
  setSelectedClaimId,
  claimDetails,
  loadingDetails,
  refreshClaims,
}: FarmerDashboardProps) {
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [cropType, setCropType] = useState("Rice (Paddy)");
  const [damageType, setDamageType] = useState<DamageType>(DamageType.FLOOD);
  const [sowingDate, setSowingDate] = useState("2026-05-15");
  const [damageDate, setDamageDate] = useState("2026-07-10");
  const [areaAcres, setAreaAcres] = useState("4.0");
  const [estimatedLossInr, setEstimatedLossInr] = useState("65000");
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [latitude, setLatitude] = useState(26.8467);
  const [longitude, setLongitude] = useState(80.9462);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<CropGuideKey>("paddy");
  const [claimFilter, setClaimFilter] = useState<ClaimFilter>("all");
  const [claimSearch, setClaimSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Appeal states
  const [appealReason, setAppealReason] = useState("");
  const [appealSubmitted, setAppealSubmitted] = useState(false);

  // Supplemental evidence states
  const [suppDescription, setSuppDescription] = useState("");
  const [suppImages, setSuppImages] = useState<string[]>([]);
  const [suppSubmitting, setSuppSubmitting] = useState(false);
  const [suppSubmitted, setSuppSubmitted] = useState(false);
  const suppFileInputRef = useRef<HTMLInputElement>(null);

  // Handle multiple file uploads
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrls((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file as Blob);
    });

    // Reset input so same file can be re-added
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const applyPreset = (preset: typeof TEST_CROP_PRESETS[0]) => {
    setCropType(preset.type);
    setDamageType(preset.damage);
    setEstimatedLossInr(preset.loss.toString());
    setAreaAcres(preset.acres.toString());
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setImageUrls(preset.urls);
    setDescription(preset.desc);
  };

  const handleSubmitClaim = async (e: FormEvent) => {
    e.preventDefault();
    if (!imageUrls.length) {
      alert("Please upload at least one crop damage image or select a sample preset.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddClaim({
        farmerId: userId,
        farmerName: userName,
        cropType,
        damageType,
        sowingDate,
        damageDate,
        areaAcres: Number(areaAcres),
        estimatedLossInr: Number(estimatedLossInr),
        description,
        imageUrl: imageUrls[0],
        imageUrls,
        latitude,
        longitude,
      });
      setShowSubmitForm(false);
      setDescription("");
      setImageUrls([]);
    } catch (err: any) {
      alert("Claim submission failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerAIEngine = async (id: string) => {
    setIsAnalyzing(true);
    try {
      await onTriggerAnalyze(id);
    } catch (err: any) {
      alert("AI analysis failed: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAppealSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!appealReason.trim()) return;

    try {
      await onAppeal(claimDetails.claim.id, appealReason);
      setAppealSubmitted(true);
      setAppealReason("");
    } catch (err: any) {
      alert("Appeal failed: " + err.message);
    }
  };

  const handleSuppFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSuppImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file as Blob);
    });
    if (suppFileInputRef.current) suppFileInputRef.current.value = "";
  };

  const handleSuppEvidenceSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!suppDescription.trim() && suppImages.length === 0) {
      alert("Please add a description or at least one photo as evidence.");
      return;
    }
    setSuppSubmitting(true);
    try {
      await onSubmitSupplementalEvidence(
        claimDetails.claim.id,
        suppDescription,
        suppImages
      );
      setSuppSubmitted(true);
      setSuppDescription("");
      setSuppImages([]);
    } catch (err: any) {
      alert("Evidence submission failed: " + err.message);
    } finally {
      setSuppSubmitting(false);
    }
  };

  const farmerClaims = claims.filter((c) => c.farmerId === userId);
  const cropGuide = CROP_GUIDES[selectedCrop];
  const firstName = userName.trim().split(/\s+/)[0] || "Kisan";
  const processingStatuses = new Set<ClaimStatus>([
    ClaimStatus.PENDING_AI,
    ClaimStatus.PENDING_WEATHER,
    ClaimStatus.PENDING_OFFICER,
    ClaimStatus.APPEALED,
  ]);
  const actionStatuses = new Set<ClaimStatus>([
    ClaimStatus.MORE_EVIDENCE,
    ClaimStatus.REJECTED,
  ]);
  const approvedClaims = farmerClaims.filter((claim) => claim.status === ClaimStatus.APPROVED);
  const processingClaims = farmerClaims.filter((claim) => processingStatuses.has(claim.status));
  const actionClaims = farmerClaims.filter((claim) => actionStatuses.has(claim.status));
  const protectedValue = farmerClaims.reduce((total, claim) => total + claim.estimatedLossInr, 0);
  const approvedValue = approvedClaims.reduce((total, claim) => total + claim.estimatedLossInr, 0);
  const normalizedSearch = claimSearch.trim().toLowerCase();
  const filteredClaims = farmerClaims.filter((claim) => {
    const matchesFilter =
      claimFilter === "all" ||
      (claimFilter === "action" && actionStatuses.has(claim.status)) ||
      (claimFilter === "processing" && processingStatuses.has(claim.status)) ||
      (claimFilter === "approved" && claim.status === ClaimStatus.APPROVED);
    const matchesSearch =
      !normalizedSearch ||
      claim.id.toLowerCase().includes(normalizedSearch) ||
      claim.cropType.toLowerCase().includes(normalizedSearch) ||
      claim.damageType.toLowerCase().includes(normalizedSearch);
    return matchesFilter && matchesSearch;
  });

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openClaimForm = () => {
    setShowSubmitForm(true);
    window.requestAnimationFrame(() => scrollToSection("claims-hub"));
  };

  const focusClaims = () => {
    setShowSubmitForm(false);
    scrollToSection("claims-hub");
  };

  const statusColors: Record<ClaimStatus, string> = {
    pending_ai: "bg-stone-100 text-stone-700 border-stone-200",
    pending_weather: "bg-cyan-50 text-cyan-800 border-cyan-100",
    pending_officer: "bg-sky-50 text-sky-800 border-sky-100",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rejected: "bg-rose-50 text-rose-700 border-rose-100",
    more_evidence: "bg-amber-50 text-amber-700 border-amber-100",
    appealed: "bg-indigo-50 text-indigo-700 border-indigo-100",
  };

  // All images for a claim (from imageUrls or fallback to imageUrl)
  const getClaimImages = (claim: any): string[] => {
    if (claim?.imageUrls?.length) return claim.imageUrls;
    if (claim?.imageUrl) return [claim.imageUrl];
    return [];
  };

  return (
    <>
      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={lightboxImg} alt="Damage evidence" className="w-full rounded-2xl object-contain max-h-[80vh]" referrerPolicy="no-referrer" />
          </div>
        </div>
      )}

      <div className="farmer-dashboard space-y-6">
        <section className={`farmer-command overflow-hidden rounded-[2rem] bg-gradient-to-br ${cropGuide.accent} text-white shadow-xl shadow-emerald-950/10`}>
          <div className="farmer-command__image" style={{ backgroundImage: `url(${farmerHero})` }} />
          <div className="farmer-command__veil" />
          <div className="farmer-command__content">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300 text-emerald-950 shadow-lg shadow-black/10">
                  <Tractor className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-amber-200">My farm command centre</p>
                  <p className="text-sm font-semibold text-white/80">Namaste, {firstName}. Your field record is ready.</p>
                </div>
              </div>

              <div className="relative">
                <button
                  type="button"
                  aria-label="Show farmer notifications"
                  aria-expanded={showNotifications}
                  onClick={() => setShowNotifications((visible) => !visible)}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                >
                  <Bell className="h-4 w-4" />
                  {actionClaims.length > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-300 px-1 text-[9px] font-black text-emerald-950">
                      {actionClaims.length}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 top-12 z-30 w-72 rounded-2xl border border-emerald-100 bg-white p-4 text-slate-800 shadow-2xl">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-extrabold">Farm notifications</p>
                      <button type="button" onClick={() => setShowNotifications(false)} aria-label="Close notifications">
                        <X className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>
                    <div className="space-y-2 text-[11px]">
                      <button type="button" onClick={() => { setClaimFilter("action"); focusClaims(); setShowNotifications(false); }} className="w-full rounded-xl bg-amber-50 p-3 text-left text-amber-900 transition hover:bg-amber-100">
                        <strong className="block">{actionClaims.length || "No"} claim{actionClaims.length === 1 ? "" : "s"} need attention</strong>
                        <span className="text-amber-700">Open requests for evidence or appeal options.</span>
                      </button>
                      <div className="rounded-xl bg-emerald-50 p-3 text-emerald-900">
                        <strong className="block">{cropGuide.name} field reminder</strong>
                        <span className="text-emerald-700">{cropGuide.task}.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-8 py-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-50 backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_0_4px_rgba(253,224,71,0.16)]" />
                  Kharif 2026 · Lucknow field ledger
                </div>
                <h1 className="max-w-2xl font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                  Protect the crop.<br />
                  <span className="text-amber-300">Prove every loss.</span>
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
                  File geo-tagged evidence, follow every verification step, and keep official farmer resources within reach.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={openClaimForm}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-extrabold text-emerald-950 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-amber-200"
                  >
                    <Plus className="h-4 w-4" /> Report crop loss
                  </button>
                  <button
                    type="button"
                    onClick={focusClaims}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    <FileText className="h-4 w-4" /> Track my claims
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/15 bg-black/15 p-4 backdrop-blur-md">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-white/60">Active crop view</p>
                    <p className="mt-1 text-sm font-bold">{cropGuide.name} field plan</p>
                  </div>
                  <span className="text-3xl" aria-hidden="true">{cropGuide.icon}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(CROP_GUIDES) as CropGuideKey[]).map((cropKey) => {
                    const crop = CROP_GUIDES[cropKey];
                    const isActive = selectedCrop === cropKey;
                    return (
                      <button
                        key={cropKey}
                        type="button"
                        onClick={() => setSelectedCrop(cropKey)}
                        aria-pressed={isActive}
                        className={`rounded-xl border px-2 py-2 text-left transition ${
                          isActive
                            ? "border-amber-300 bg-amber-300 text-emerald-950"
                            : "border-white/15 bg-white/5 text-white hover:bg-white/15"
                        }`}
                      >
                        <span className="block text-[9px] font-extrabold uppercase tracking-wide">{crop.name}</span>
                        <span className={`mt-0.5 block text-[8px] ${isActive ? "text-emerald-800" : "text-white/55"}`}>{crop.variety.split(" · ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-2 border-t border-white/15 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total claims", value: farmerClaims.length.toString(), meta: `${processingClaims.length} moving` },
                { label: "Protected value", value: `₹${protectedValue.toLocaleString("en-IN")}`, meta: "Across filed losses" },
                { label: "Approved", value: approvedClaims.length.toString(), meta: `₹${approvedValue.toLocaleString("en-IN")} assessed` },
                { label: "Needs action", value: actionClaims.length.toString(), meta: actionClaims.length ? "Review today" : "You are up to date" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/55">{stat.label}</p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <strong className="text-xl font-extrabold text-white">{stat.value}</strong>
                    <span className="text-[9px] text-amber-200">{stat.meta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-12" aria-label="Farm planning overview">
          <article className="agri-panel lg:col-span-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="eyebrow"><CloudRain className="h-3.5 w-3.5" /> Field conditions</span>
                <h2 className="mt-2 font-display text-xl font-extrabold text-slate-900">{cropGuide.name} weather watch</h2>
                <p className="mt-1 text-xs text-slate-500">Demo field snapshot · use IMD for official advisories</p>
              </div>
              <span className="rounded-xl bg-cyan-50 px-3 py-1.5 text-[10px] font-extrabold text-cyan-800">{cropGuide.outlook}</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="field-reading"><Sun className="h-4 w-4 text-amber-500" /><strong>{cropGuide.temperature}</strong><span>Temperature</span></div>
              <div className="field-reading"><Droplets className="h-4 w-4 text-cyan-600" /><strong>{cropGuide.humidity}</strong><span>Humidity</span></div>
              <div className="field-reading"><Wind className="h-4 w-4 text-emerald-600" /><strong>{cropGuide.moisture}</strong><span>Soil moisture</span></div>
            </div>
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-800">
                <Wheat className="h-4 w-4" /> Today’s field note
              </p>
              <p className="mt-2 text-xs leading-5 text-emerald-950">{cropGuide.advisory}</p>
            </div>
          </article>

          <article className="agri-panel lg:col-span-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="eyebrow"><Clock3 className="h-3.5 w-3.5" /> Claim readiness</span>
                <h2 className="mt-2 font-display text-xl font-extrabold text-slate-900">Evidence checklist</h2>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <ShieldCheck className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ["Wide crop photo", "Show the affected field boundary"],
                ["Close damage photo", "Capture leaves, stem or grain clearly"],
                ["GPS & date", "Confirm location and incident date"],
              ].map(([title, copy], index) => (
                <div key={title} className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-800">{index + 1}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{title}</p>
                    <p className="text-[10px] text-slate-500">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={openClaimForm} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-emerald-800">
              Start guided claim <ChevronRight className="h-4 w-4" />
            </button>
          </article>

          <article className="agri-panel lg:col-span-3">
            <span className="eyebrow"><CircleHelp className="h-3.5 w-3.5" /> Quick help</span>
            <h2 className="mt-2 font-display text-xl font-extrabold text-slate-900">Farmer support</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">For PMFBY grievances and crop-loss reporting, use the official Krishi Rakshak channel.</p>
            <a href="tel:14447" className="mt-5 flex items-center justify-between rounded-2xl bg-slate-950 p-4 text-white transition hover:bg-emerald-900">
              <span>
                <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-amber-300">Helpline</span>
                <strong className="mt-1 block text-2xl">14447</strong>
              </span>
              <ArrowUpRight className="h-5 w-5" />
            </a>
            <p className="mt-3 text-[9px] leading-4 text-slate-400">Official PMFBY support reference. Call availability may depend on your network and region.</p>
          </article>
        </section>

        <section id="farmer-resources" className="agri-panel scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow"><ExternalLink className="h-3.5 w-3.5" /> Trusted references</span>
              <h2 className="mt-2 font-display text-xl font-extrabold text-slate-900">Official tools for your next decision</h2>
              <p className="mt-1 text-xs text-slate-500">Open Government of India services in a new tab.</p>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-stone-600">External services</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {FARMER_REFERENCES.map((reference) => {
              const ReferenceIcon = reference.icon;
              return (
                <a
                  key={reference.label}
                  href={reference.href}
                  target="_blank"
                  rel="noreferrer"
                  className="resource-card group"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 transition group-hover:bg-emerald-700 group-hover:text-white">
                    <ReferenceIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[9px] font-extrabold uppercase tracking-[0.15em] text-emerald-700">{reference.label}</span>
                    <strong className="mt-1 block text-sm text-slate-900">{reference.title}</strong>
                    <span className="mt-1 block text-[10px] leading-4 text-slate-500">{reference.description}</span>
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-emerald-700" />
                </a>
              );
            })}
          </div>
        </section>

        <div id="claims-hub" className="grid scroll-mt-24 grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN: Claims list or submission form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="agri-panel">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="eyebrow"><FileText className="h-3.5 w-3.5" /> Claim workspace</span>
                <h2 className="mt-2 text-lg font-extrabold text-slate-900">My crop-loss ledger</h2>
                <p className="text-xs text-slate-500">File evidence and follow every verification step.</p>
              </div>
              {!showSubmitForm && (
                <button
                  onClick={() => setShowSubmitForm(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-800"
                >
                  <Plus className="w-4 h-4" /> New Claim
                </button>
              )}
            </div>

            {showSubmitForm ? (
              <form onSubmit={handleSubmitClaim} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">File Crop Loss</h3>
                  <button
                    type="button"
                    onClick={() => setShowSubmitForm(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>

                {/* Preset buttons */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Interactive Sample Presets:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {TEST_CROP_PRESETS.map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700 py-1.5 px-2 rounded-lg text-left truncate transition-colors"
                      >
                        🌱 {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Crop Type</label>
                    <select
                      value={cropType}
                      onChange={(e) => setCropType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    >
                      <option>Rice (Paddy)</option>
                      <option>Wheat</option>
                      <option>Corn (Maize)</option>
                      <option>Cotton</option>
                      <option>Sugarcane</option>
                      <option>Pulses / Lentils</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Damage Cause</label>
                    <select
                      value={damageType}
                      onChange={(e) => setDamageType(e.target.value as DamageType)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    >
                      {Object.values(DamageType).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sowing Date</label>
                    <input
                      type="date"
                      value={sowingDate}
                      onChange={(e) => setSowingDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Damage Date</label>
                    <input
                      type="date"
                      value={damageDate}
                      onChange={(e) => setDamageDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Affected Area (Acres)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={areaAcres}
                      onChange={(e) => setAreaAcres(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="e.g. 4.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estimate Loss (INR)</label>
                    <input
                      type="number"
                      value={estimatedLossInr}
                      onChange={(e) => setEstimatedLossInr(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="e.g. 65000"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Farm Location</label>
                  <LocationPicker
                    latitude={latitude}
                    longitude={longitude}
                    onChange={(lat, lng) => {
                      setLatitude(lat);
                      setLongitude(lng);
                    }}
                  />
                </div>

                {/* Multiple Images Upload */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Crop Damage Images ({imageUrls.length} added)
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] text-blue-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add More
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {imageUrls.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {imageUrls.map((url, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square">
                          <img
                            src={url}
                            alt={`Damage ${idx + 1}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setLightboxImg(url)}
                              className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg text-white transition"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="p-1.5 bg-red-500/70 hover:bg-red-600 rounded-lg text-white transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {idx === 0 && (
                            <span className="absolute top-1 left-1 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">PRIMARY</span>
                          )}
                        </div>
                      ))}
                      {/* Add more tile */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center gap-1 text-slate-400 transition-colors"
                      >
                        <Upload className="w-5 h-5" />
                        <span className="text-[9px] font-semibold">Add</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50 hover:bg-slate-100/50 transition-colors cursor-pointer"
                    >
                      <Upload className="w-6 h-6 mx-auto text-slate-400" />
                      <p className="text-xs text-slate-600 mt-1">Click to upload photos</p>
                      <p className="text-[10px] text-slate-400">Multiple images supported · JPG, PNG</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Damage Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Provide details about waterlogging, leaf spotting, etc."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Filing Claim on Ledger..." : "Register Claim"}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-3">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <span className="sr-only">Search claims</span>
                    <input
                      type="search"
                      value={claimSearch}
                      onChange={(event) => setClaimSearch(event.target.value)}
                      placeholder="Search crop, cause or claim ID"
                      className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
                    />
                  </label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Filter farmer claims">
                    {([
                      ["all", `All ${farmerClaims.length}`],
                      ["action", `Action ${actionClaims.length}`],
                      ["processing", `Processing ${processingClaims.length}`],
                      ["approved", `Approved ${approvedClaims.length}`],
                    ] as [ClaimFilter, string][]).map(([filter, label]) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setClaimFilter(filter)}
                        aria-pressed={claimFilter === filter}
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${
                          claimFilter === filter
                            ? "border-emerald-700 bg-emerald-700 text-white"
                            : "border-stone-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-800"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={refreshClaims}
                      className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-800"
                    >
                      <RefreshCw className="h-3 w-3" /> Refresh
                    </button>
                  </div>
                </div>

                {farmerClaims.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold">No claims registered yet.</p>
                    <p className="text-[11px] mt-1 text-slate-400">Click &apos;New Claim&apos; above to file your first damage assessment.</p>
                  </div>
                ) : filteredClaims.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-stone-200 py-10 text-center">
                    <Search className="mx-auto h-7 w-7 text-stone-300" />
                    <p className="mt-2 text-xs font-bold text-slate-700">No claims match this view</p>
                    <button
                      type="button"
                      onClick={() => { setClaimFilter("all"); setClaimSearch(""); }}
                      className="mt-2 text-[10px] font-bold text-emerald-700 hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  filteredClaims.map((claim) => {
                    const isSelected = selectedClaimId === claim.id;
                    const images = getClaimImages(claim);

                    return (
                      <div
                        key={claim.id}
                        onClick={() => setSelectedClaimId(claim.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/60 shadow-sm"
                            : "border-stone-200 bg-stone-50/50 hover:border-emerald-200 hover:bg-emerald-50/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400">{claim.id}</span>
                            <h4 className="text-sm font-semibold text-slate-800">{claim.cropType}</h4>
                          </div>
                          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${statusColors[claim.status] || "bg-slate-50 text-slate-500"}`}>
                            {claim.status.replace("_", " ")}
                          </span>
                        </div>

                        {/* Thumbnail strip */}
                        {images.length > 0 && (
                          <div className="mt-2 flex gap-1.5 overflow-x-auto">
                            {images.slice(0, 4).map((img, i) => (
                              <img
                                key={i}
                                src={img}
                                alt=""
                                className="h-10 w-14 object-cover rounded-lg border border-slate-200 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ))}
                            {images.length > 4 && (
                              <div className="h-10 w-14 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-[9px] text-slate-500 font-bold shrink-0">
                                +{images.length - 4}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-2 grid grid-cols-2 gap-2 text-slate-500 text-xs">
                          <div className="flex items-center gap-1">
                            <CloudRain className="w-3.5 h-3.5 text-slate-400" />
                            <span>{claim.damageType}</span>
                          </div>
                          <div className="flex items-center gap-1 font-mono text-slate-700">
                            <span className="text-slate-400 font-sans">₹</span>
                            <span>{claim.estimatedLossInr.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100/80 pt-2 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(claim.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-0.5 font-bold text-emerald-700 hover:underline">
                            View journey <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive details and timeline tracker */}
        <div className="lg:col-span-7 space-y-6">
          {selectedClaimId && claimDetails ? (
            <>
              {/* Header Summary */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">
                        Claim {claimDetails.claim.cropType} Analysis
                      </h2>
                      <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-mono px-2 py-0.5 rounded-full">
                        {claimDetails.claim.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Filed on {new Date(claimDetails.claim.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedClaimId(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Estimate Loss</p>
                    <p className="text-sm font-bold font-mono text-blue-600 mt-1">₹{claimDetails.claim.estimatedLossInr.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Acreage</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{claimDetails.claim.areaAcres} Acres</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Sown Date</p>
                    <p className="text-xs font-semibold text-slate-700 mt-1">{claimDetails.claim.sowingDate}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Status</p>
                    <p className="text-xs font-extrabold text-blue-700 uppercase mt-1">{claimDetails.claim.status.replace("_", " ")}</p>
                  </div>
                </div>

                {/* Auto AI Processing Indicator */}
                {claimDetails.claim.status === "pending_ai" && (
                  <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                    <Sparkles className={`h-5 w-5 shrink-0 text-emerald-700 ${isAnalyzing ? "animate-spin" : ""}`} />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-emerald-950">AI evidence review is queued</h4>
                      <p className="text-[11px] text-slate-600">Crop damage, weather patterns and claim consistency will be checked.</p>
                    </div>
                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => triggerAIEngine(claimDetails.claim.id)}
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-extrabold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isAnalyzing ? "Checking…" : "Run review now"}
                    </button>
                  </div>
                )}
              </div>

              {/* Evidence Photos Gallery */}
              {(() => {
                const imgs = getClaimImages(claimDetails.claim);
                return imgs.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      Evidence Photos ({imgs.length})
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {imgs.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setLightboxImg(img)}
                          className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square cursor-zoom-in"
                        >
                          <img
                            src={img}
                            alt={`Evidence ${idx + 1}`}
                            className="w-full h-full object-cover"
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
                  </div>
                ) : null;
              })()}

              {claimDetails.claim.supplementalEvidence?.map((submission: any, submissionIndex: number) => {
                const supplementalImages = Array.isArray(submission.imageUrls) ? submission.imageUrls : [];
                return (
                  <div key={submission.id || submissionIndex} className="rounded-2xl border-2 border-violet-200 bg-violet-50/35 p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-violet-100 pb-3">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-extrabold text-violet-950">
                          <RotateCcw className="h-4 w-4 text-violet-700" />
                          Your re-claim evidence · Round {submissionIndex + 1}
                        </p>
                        <p className="mt-1 text-[10px] text-violet-600">Kept separate from your original claim evidence</p>
                      </div>
                      <time dateTime={submission.submittedAt} className="rounded-lg bg-white px-2.5 py-1.5 text-[9px] font-bold text-violet-700 ring-1 ring-violet-100">
                        {new Date(submission.submittedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </time>
                    </div>
                    {submission.description && (
                      <div className="mt-4">
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-violet-600">Additional message</p>
                        <p className="mt-1 rounded-xl border border-violet-100 bg-white p-3 text-xs leading-5 text-slate-700">
                          &ldquo;{submission.description}&rdquo;
                        </p>
                      </div>
                    )}
                    <div className="mt-4">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-violet-600">New photos ({supplementalImages.length})</p>
                      {supplementalImages.length > 0 ? (
                        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {supplementalImages.map((image: string, imageIndex: number) => (
                            <button
                              key={imageIndex}
                              type="button"
                              onClick={() => setLightboxImg(image)}
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

              {/* AI Result & Weather Audit overlay if processed */}
              {claimDetails.aiResult && (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">Gemini AI Audit Report</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Detected Crop</span>
                      <p className="text-sm font-bold text-slate-800 mt-1">{claimDetails.aiResult.cropTypeDetected}</p>
                    </div>
                    <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Damage Severity</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                        <p className="text-sm font-bold text-red-600">{claimDetails.aiResult.severity}</p>
                      </div>
                    </div>
                    <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">AI Truth Score</span>
                      <p className="text-sm font-bold text-indigo-600 mt-1">
                        {Math.round(claimDetails.aiResult.confidenceScore * 100)}% Genuineness
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Evidence Reasoning</span>
                    <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-serif italic">
                      &ldquo;{claimDetails.aiResult.reasoning}&rdquo;
                    </p>
                  </div>

                  {claimDetails.weatherVerification && (
                    <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-900 flex items-center gap-1">
                          <CloudRain className="w-4 h-4 text-purple-600" />
                          OpenWeather Satellite Verification
                        </span>
                        <span className="text-[10px] font-mono bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded-full">
                          MATCH VERIFIED
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <span className="text-[9px] text-purple-500 uppercase">Temp</span>
                          <p className="font-bold text-purple-900">{claimDetails.weatherVerification.temperature}°C</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-purple-500 uppercase">Humidity</span>
                          <p className="font-bold text-purple-900">{claimDetails.weatherVerification.humidity}%</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-purple-500 uppercase">Precipitation</span>
                          <p className="font-bold text-purple-900">{claimDetails.weatherVerification.precipitation}mm</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-purple-700 leading-normal bg-white/70 p-2 rounded-lg border border-purple-100 mt-2">
                        {claimDetails.weatherVerification.analysisNote}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Interactive Timeline & Ledger proof */}
              <TimelineComponent
                claim={claimDetails.claim}
                aiResult={claimDetails.aiResult}
                weatherVerification={claimDetails.weatherVerification}
                decisions={claimDetails.decisions}
                appeal={claimDetails.appeal}
              />

              {/* Map GPS visualizer */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Geospatial GPS Coordinate Verification
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

              {/* Supplemental Evidence Form — only for more_evidence status */}
              {claimDetails.claim.status === "more_evidence" && !suppSubmitted && (
                <div className="bg-white rounded-2xl border-2 border-amber-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                    <FlaskConical className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">Submit Additional Evidence</h3>
                    <span className="ml-auto text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Officer Requested</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    The officer has asked for more evidence. Add a detailed description and/or upload additional photographs below. Your claim will be sent back for review once submitted.
                  </p>

                  <form onSubmit={handleSuppEvidenceSubmit} className="space-y-4">
                    {/* Description */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Additional Description</label>
                      <textarea
                        value={suppDescription}
                        onChange={(e) => setSuppDescription(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                        placeholder="Describe the damage in more detail — severity, area affected, timeline of events…"
                      />
                    </div>

                    {/* Photo upload */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Additional Photos</label>
                      <input
                        ref={suppFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleSuppFileChange}
                      />
                      <button
                        type="button"
                        onClick={() => suppFileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-amber-200 rounded-xl py-3 text-xs text-amber-700 hover:bg-amber-50 transition flex items-center justify-center gap-2 font-semibold"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload Evidence Photos
                      </button>

                      {suppImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {suppImages.map((img, i) => (
                            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-amber-100">
                              <img src={img} alt={`evidence-${i}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setSuppImages((prev) => prev.filter((_, j) => j !== i))}
                                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setLightboxImg(img)}
                                className="absolute bottom-1 left-1 bg-black/40 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                              >
                                <ZoomIn className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={suppSubmitting}
                      className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {suppSubmitting ? "Submitting…" : "Submit Evidence for Re-Review"}
                    </button>
                  </form>
                </div>
              )}

              {/* Evidence submitted success banner */}
              {suppSubmitted && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">Evidence Submitted Successfully</h4>
                    <p className="text-xs text-amber-800 mt-1">
                      Your additional evidence has been recorded. The officer will now re-evaluate your claim.
                    </p>
                  </div>
                </div>
              )}

              {/* Appeal Form — only for rejected claims */}
              {claimDetails.claim.status === "rejected" && !claimDetails.appeal && !appealSubmitted && (
                <div className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">File Official Claim Appeal</h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    If you disagree with the officer&apos;s decision, you can submit an appeal requesting higher authority re-evaluation.
                  </p>

                  <form onSubmit={handleAppealSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reason for Appeal</label>
                      <textarea
                        value={appealReason}
                        onChange={(e) => setAppealReason(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Explain why the physical crop damage matches claim parameters..."
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all"
                    >
                      Submit Appeal Request
                    </button>
                  </form>
                </div>
              )}

              {(claimDetails.appeal || appealSubmitted) && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950">Claim Appeal Registered</h4>
                    <p className="text-xs text-indigo-800 mt-1">
                      Your appeal has been successfully locked into the central grievance database. A high-ranking officer will re-evaluate your claim soon.
                    </p>
                    <p className="text-[11px] text-indigo-600 italic mt-1 bg-white/60 p-2 rounded border border-indigo-100">
                      &ldquo;{claimDetails.appeal?.reason || appealReason}&rdquo;
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-100 p-12 shadow-sm text-slate-400">
              <Landmark className="w-12 h-12 mb-3 text-slate-200 animate-bounce" />
              <h3 className="text-sm font-bold text-slate-800">Select a Crop Claim</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Click any filed claim on the left to review telemetry progress, weather cross-checks, and blockchain block validations.
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
