import { useState, ChangeEvent, FormEvent, useRef } from "react";
import { 
  FileText, Plus, Landmark, Eye, CloudRain, AlertCircle, Sparkles, 
  MapPin, CheckCircle2, ChevronRight, Upload, Calendar, ArrowLeft,
  Image as ImageIcon, X, ZoomIn, FlaskConical, Send
} from "lucide-react";
import { Claim, DamageType, ClaimStatus } from "../types";
import MapComponent from "./MapComponent";
import TimelineComponent from "./TimelineComponent";
import LocationPicker from "./LocationPicker";

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

  const statusColors: Record<ClaimStatus, string> = {
    pending_ai: "bg-slate-100 text-slate-700 border-slate-200",
    pending_weather: "bg-purple-50 text-purple-700 border-purple-100",
    pending_officer: "bg-blue-50 text-blue-700 border-blue-100",
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Claims list or submission form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">My Claims Hub</h2>
                <p className="text-xs text-slate-500">Log new crop losses or track on-chain resolutions.</p>
              </div>
              {!showSubmitForm && (
                <button
                  onClick={() => setShowSubmitForm(true)}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-sm transition-all"
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
              <div className="space-y-3">
                {farmerClaims.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold">No claims registered yet.</p>
                    <p className="text-[11px] mt-1 text-slate-400">Click &apos;New Claim&apos; above to file your first damage assessment.</p>
                  </div>
                ) : (
                  farmerClaims.map((claim) => {
                    const isSelected = selectedClaimId === claim.id;
                    const images = getClaimImages(claim);

                    return (
                      <div
                        key={claim.id}
                        onClick={() => setSelectedClaimId(claim.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/20 shadow-sm"
                            : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
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
                          <span className="flex items-center gap-0.5 text-blue-600 hover:underline">
                            Inspect Track <ChevronRight className="w-3 h-3" />
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
                  <div className="mt-6 p-4 bg-blue-50/55 border border-blue-100 rounded-xl flex items-center gap-4 animate-pulse">
                    <Sparkles className="w-5 h-5 text-blue-600 shrink-0 animate-spin" />
                    <div>
                      <h4 className="text-xs font-bold text-blue-900">AI Analysis Running Automatically...</h4>
                      <p className="text-[11px] text-slate-600">Gemini is currently assessing crop damage severity, local weather patterns and claim validity.</p>
                    </div>
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
                weatherChecked={!!claimDetails.weatherVerification}
                hasAiResult={!!claimDetails.aiResult}
                hasDecision={claimDetails.decisions?.length > 0}
                lastDecision={claimDetails.decisions?.[claimDetails.decisions.length - 1]}
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
    </>
  );
}
