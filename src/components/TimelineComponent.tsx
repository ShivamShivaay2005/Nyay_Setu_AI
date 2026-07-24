import { CheckCircle2, Clock, ShieldCheck, CloudLightning, FileText, AlertTriangle } from "lucide-react";
import { ClaimStatus, Claim } from "../types";

interface TimelineComponentProps {
  claim: Claim;
  weatherChecked: boolean;
  hasAiResult: boolean;
  hasDecision: boolean;
  lastDecision?: {
    officerName: string;
    officerPosition?: string;
    comments?: string;
    decidedAt?: string;
  };
  blockchainBlockNumber?: number;
}

export default function TimelineComponent({
  claim,
  weatherChecked,
  hasAiResult,
  hasDecision,
  lastDecision,
}: TimelineComponentProps) {
  const steps = [
    {
      title: "Claim Submitted",
      description: `Farmer logged damage details with GPS tracking.`,
      time: claim.timestamp,
      icon: FileText,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      isDone: true,
    },
    {
      title: "Gemini AI Vision Audit",
      description: hasAiResult
        ? "Gemini analyzed crop damage severity and confidence score."
        : "Pending AI analysis and vegetation stress review.",
      time: hasAiResult ? "Completed" : "",
      icon: ShieldCheck,
      color: hasAiResult
        ? "text-blue-600 bg-blue-50 border-blue-200"
        : "text-slate-400 bg-slate-50 border-slate-200",
      isDone: hasAiResult,
    },
    {
      title: "Weather Cross-Reference",
      description: ["Flood", "Drought", "Hail"].includes(claim.damageType)
        ? weatherChecked
          ? "Localized meteorological anomaly threshold verified."
          : "Analyzing regional weather logs and AWS sensors."
        : "Skipped (Not a meteorological cause)",
      time: weatherChecked ? "Verified" : "",
      icon: CloudLightning,
      color: ["Flood", "Drought", "Hail"].includes(claim.damageType)
        ? weatherChecked
          ? "text-purple-600 bg-purple-50 border-purple-200"
          : "text-slate-400 bg-slate-50 border-slate-200"
        : "text-slate-300 bg-slate-50 border-slate-100",
      isDone: !["Flood", "Drought", "Hail"].includes(claim.damageType) || weatherChecked,
    },
    {
      title: "Officer Final Review",
      description: hasDecision
        ? `Status finalized: ${claim.status.replace("_", " ").toUpperCase()}`
        : "Awaiting local government officer field validation and dual-check.",
      time: hasDecision ? "Reviewed" : "In Queue",
      icon: CheckCircle2,
      color: hasDecision
        ? claim.status === "approved"
          ? "text-emerald-600 bg-emerald-50 border-emerald-200"
          : claim.status === "rejected"
          ? "text-rose-600 bg-rose-50 border-rose-200"
          : "text-amber-600 bg-amber-50 border-amber-200"
        : "text-slate-400 bg-slate-50 border-slate-200",
      isDone: hasDecision,
    },
    {
      title: "Kisan Nyay Ledger Sealing",
      description: claim.blockchainTxHash
        ? `Proof secured in block block tx: ${claim.blockchainTxHash.substring(0, 16)}...`
        : "Sealing block on approved audit outcome.",
      time: claim.blockchainTxHash ? "Secured" : "",
      icon: ShieldCheck,
      color: claim.blockchainTxHash
        ? "text-indigo-600 bg-indigo-50 border-indigo-200 font-semibold"
        : "text-slate-400 bg-slate-50 border-slate-200",
      isDone: !!claim.blockchainTxHash,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-6 flex items-center gap-2">
        <Clock className="w-4 h-4 text-emerald-600" />
        Claim Resolution Timeline
      </h3>

      <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-8">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={idx} className="relative">
              {/* Timeline dot */}
              <span className={`absolute -left-[35px] top-0 rounded-full border p-1.5 ${step.color} shadow-sm transition-all duration-300`}>
                <Icon className="w-4 h-4" />
              </span>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`text-sm font-medium ${step.isDone ? "text-slate-900 font-semibold" : "text-slate-500"}`}>
                    {step.title}
                  </h4>
                  {step.time && (
                    <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-medium">
                      {step.time.includes("Z") ? new Date(step.time).toLocaleDateString() : step.time}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {step.description}
                </p>

                {/* Show Reviewing Officer details if available on Officer Final Review step */}
                {idx === 3 && lastDecision && (
                  <div className="mt-2.5 bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">🏛️ {lastDecision.officerName}</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Assigned Auditor
                      </span>
                    </div>
                    {lastDecision.officerPosition && (
                      <p className="text-[11px] font-medium text-slate-600">
                        {lastDecision.officerPosition}
                      </p>
                    )}
                    {lastDecision.comments && (
                      <p className="text-[11px] text-slate-500 italic border-t border-slate-200/60 pt-1.5 mt-1">
                        &ldquo;{lastDecision.comments}&rdquo;
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {claim.blockchainTxHash && (
        <div className="mt-6 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-indigo-900">Cryptographically Sealed Block</h4>
            <p className="text-[11px] text-indigo-700 font-mono mt-1 select-all break-all leading-normal bg-indigo-100/50 p-1.5 rounded border border-indigo-100">
              {claim.blockchainTxHash}
            </p>
            <p className="text-[10px] text-indigo-500 mt-1">
              This digital certificate acts as proof of damage. It cannot be altered by third parties or officials.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
