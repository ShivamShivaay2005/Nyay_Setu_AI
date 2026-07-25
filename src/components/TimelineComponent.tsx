import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CloudLightning,
  FileText,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";
import {
  AIResult,
  Appeal,
  Claim,
  ClaimStatus,
  OfficerDecision,
  WeatherVerification,
} from "../types";

interface TimelineComponentProps {
  claim: Claim;
  aiResult?: AIResult | null;
  weatherVerification?: WeatherVerification | null;
  decisions?: OfficerDecision[];
  appeal?: Appeal | null;
}

type TimelineTone = "green" | "blue" | "cyan" | "amber" | "violet" | "rose" | "slate";

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  time?: string;
  meta?: string;
  icon: typeof FileText;
  tone: TimelineTone;
}

const toneClasses: Record<TimelineTone, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  slate: "border-slate-200 bg-slate-50 text-slate-500",
};

const formatDateTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const decisionPresentation = (decision: OfficerDecision) => {
  if (decision.statusSelected === ClaimStatus.APPROVED) {
    return {
      title: "Officer approved the claim",
      icon: CheckCircle2,
      tone: "green" as TimelineTone,
    };
  }
  if (decision.statusSelected === ClaimStatus.REJECTED) {
    return {
      title: "Officer rejected the claim",
      icon: XCircle,
      tone: "rose" as TimelineTone,
    };
  }
  if (decision.statusSelected === ClaimStatus.MORE_EVIDENCE) {
    return {
      title: "Officer requested more evidence",
      icon: AlertTriangle,
      tone: "amber" as TimelineTone,
    };
  }
  return {
    title: `Officer updated status to ${decision.statusSelected.replaceAll("_", " ")}`,
    icon: Scale,
    tone: "blue" as TimelineTone,
  };
};

export default function TimelineComponent({
  claim,
  aiResult,
  weatherVerification,
  decisions = [],
  appeal,
}: TimelineComponentProps) {
  const events: TimelineEvent[] = [
    {
      id: `claim-${claim.id}`,
      title: "Farmer filed the original claim",
      description: "Initial statement, crop-loss photographs, GPS location and loss estimate were submitted.",
      time: claim.createdAt || claim.timestamp,
      meta: `${claim.cropType} · ${claim.damageType} · ${claim.areaAcres} acres`,
      icon: FileText,
      tone: "green",
    },
  ];

  if (aiResult) {
    events.push({
      id: `ai-${claim.id}`,
      title: "AI evidence assessment completed",
      description: `${aiResult.cropTypeDetected} detected with ${Math.round(aiResult.confidenceScore * 100)}% confidence and ${aiResult.severity.toLowerCase()} reported severity.`,
      time: aiResult.analyzedAt,
      icon: Sparkles,
      tone: "blue",
    });
  }

  if (weatherVerification) {
    events.push({
      id: `weather-${claim.id}`,
      title: "Weather record cross-checked",
      description: weatherVerification.analysisNote || "Available station observations were matched against the reported event.",
      time: weatherVerification.checkedAt,
      meta: weatherVerification.stationName ? `Station: ${weatherVerification.stationName}` : undefined,
      icon: CloudLightning,
      tone: "cyan",
    });
  }

  decisions.forEach((decision) => {
    const presentation = decisionPresentation(decision);
    events.push({
      id: decision.id,
      title: presentation.title,
      description: decision.comments,
      time: decision.decidedAt,
      meta: `${decision.officerName}${decision.officerPosition ? ` · ${decision.officerPosition}` : ""}`,
      icon: presentation.icon,
      tone: presentation.tone,
    });
  });

  (claim.supplementalEvidence || []).forEach((submission, index) => {
    const photoCount = submission.imageUrls?.length || 0;
    events.push({
      id: submission.id || `supplement-${claim.id}-${index}`,
      title: "Farmer re-submitted evidence",
      description: submission.description || "The farmer uploaded additional crop-loss photographs for re-review.",
      time: submission.submittedAt,
      meta: `${photoCount} new photo${photoCount === 1 ? "" : "s"} · Re-claim round ${index + 1}`,
      icon: RotateCcw,
      tone: "violet",
    });
  });

  if (appeal) {
    events.push({
      id: appeal.id,
      title: "Farmer filed an appeal",
      description: appeal.reason,
      time: appeal.createdAt,
      meta: "Grievance sent for re-evaluation",
      icon: Scale,
      tone: "violet",
    });
  }

  events.sort((a, b) => {
    const first = a.time ? new Date(a.time).getTime() : Number.MAX_SAFE_INTEGER;
    const second = b.time ? new Date(b.time).getTime() : Number.MAX_SAFE_INTEGER;
    return first - second;
  });

  const hasFinalDecision = [ClaimStatus.APPROVED, ClaimStatus.REJECTED].includes(claim.status);
  if (!hasFinalDecision) {
    const pendingCopy: Partial<Record<ClaimStatus, [string, string]>> = {
      [ClaimStatus.PENDING_AI]: ["AI review pending", "The original evidence is waiting for automated assessment."],
      [ClaimStatus.PENDING_WEATHER]: ["Weather verification pending", "The reported loss is being cross-checked against station data."],
      [ClaimStatus.PENDING_OFFICER]: ["Officer review pending", "The complete evidence record is in the officer queue."],
      [ClaimStatus.MORE_EVIDENCE]: ["Waiting for farmer evidence", "The officer’s request is open until the farmer submits a new response."],
      [ClaimStatus.APPEALED]: ["Appeal review pending", "The appealed decision is waiting for a fresh officer review."],
    };
    const pending = pendingCopy[claim.status];
    if (pending) {
      events.push({
        id: `pending-${claim.id}-${claim.status}`,
        title: pending[0],
        description: pending[1],
        meta: "Current step",
        icon: Clock,
        tone: "slate",
      });
    }
  }

  const explorerUrl =
    claim.blockchainExplorerUrl ||
    (claim.blockchainMode === "sepolia" && claim.blockchainTxHash
      ? `https://sepolia.etherscan.io/tx/${claim.blockchainTxHash}`
      : "");

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Clock className="h-4 w-4 text-emerald-700" />
            Complete claim journey
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">Every action is shown with its recorded date and time.</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-emerald-800">
          {events.length} events
        </span>
      </div>

      <ol className="relative ml-4 space-y-7 border-l-2 border-stone-100 pl-6">
        {events.map((event) => {
          const Icon = event.icon;
          return (
            <li key={event.id} className="relative">
              <span className={`absolute -left-[35px] top-0 rounded-full border p-1.5 shadow-sm ${toneClasses[event.tone]}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-slate-900">{event.title}</h4>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{event.description}</p>
                  {event.meta && (
                    <p className="mt-2 inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-[9px] font-bold text-stone-600">
                      {event.meta}
                    </p>
                  )}
                </div>
                {event.time && (
                  <time
                    dateTime={event.time}
                    className="shrink-0 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[9px] font-bold text-stone-600"
                  >
                    {formatDateTime(event.time)}
                  </time>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {claim.blockchainTxHash && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xs font-bold text-emerald-950">Latest decision proof</h4>
              <span className="rounded-full bg-white px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-emerald-100">
                {claim.blockchainMode === "sepolia" ? "Ethereum Sepolia" : "Local simulator"}
              </span>
            </div>
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all rounded border border-emerald-100 bg-white/70 p-1.5 font-mono text-[10px] font-semibold leading-normal text-emerald-800 hover:underline"
              >
                {claim.blockchainTxHash} ↗
              </a>
            ) : (
              <p className="mt-1 break-all rounded border border-emerald-100 bg-white/70 p-1.5 font-mono text-[10px] leading-normal text-emerald-800">
                {claim.blockchainTxHash}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
