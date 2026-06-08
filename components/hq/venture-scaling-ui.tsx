import { formatGbp, RoiBadge } from "@/components/hq/finance-ui";
import type {
  VentureScalingRecommendation,
  VentureGrowthLevers,
  ScalingPriorityQueue,
} from "@/lib/hq/ventures";

export const SCALING_REC_COLORS: Record<string, string> = {
  scale_now: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  scale_cautiously: "text-green-400 border-green-500/30 bg-green-500/10",
  optimize_first: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  hold: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  pause: "text-red-400 border-red-500/30 bg-red-500/10",
};

export function scalingRecLabel(rec: string): string {
  return rec.replace(/_/g, " ");
}

export function roiLabel(roi: number | null): "positive" | "negative" | "unknown" {
  if (roi == null) return "unknown";
  if (roi > 0) return "positive";
  if (roi < 0) return "negative";
  return "unknown";
}

export function ScalingScoreBar({ score }: { score: number }) {
  const color =
    score >= 85
      ? "bg-emerald-500"
      : score >= 70
        ? "bg-green-500"
        : score >= 50
          ? "bg-blue-500"
          : score >= 30
            ? "bg-amber-500"
            : "bg-red-500";

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8">{score}</span>
    </div>
  );
}

export function ScalingRecommendationRow({
  rec,
  index,
}: {
  rec: VentureScalingRecommendation;
  index: number;
}) {
  return (
    <li className="p-4 rounded-lg border border-gray-700 bg-gray-900 flex flex-wrap justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">#{index + 1}</p>
        <p className="font-medium truncate">{rec.title}</p>
        <p className="text-xs text-gray-500 mt-1 capitalize">
          Stage: {rec.scalingStage.replace(/_/g, " ")}
        </p>
        <p className="text-xs text-gray-500 mt-1">{rec.rationale}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <ScalingScoreBar score={rec.scalingScore} />
        <span
          className={`text-xs px-2 py-1 rounded border capitalize ${SCALING_REC_COLORS[rec.recommendation] ?? ""}`}
        >
          {scalingRecLabel(rec.recommendation)}
        </span>
        <div className="flex gap-2 text-sm text-gray-400">
          <span>{formatGbp(rec.revenueGbp)}</span>
          <span>Growth {rec.growthScore}</span>
        </div>
      </div>
    </li>
  );
}

export function PriorityQueuePanel({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: VentureScalingRecommendation[];
  emptyLabel: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
      <p className="font-bold mb-3">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((v) => (
            <li key={v.missionId} className="text-sm">
              <p className="truncate">{v.title}</p>
              <p className="text-xs text-gray-500">
                Score {v.scalingScore} · {scalingRecLabel(v.recommendation)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GrowthLeversPanel({ levers }: { levers: VentureGrowthLevers[] }) {
  if (levers.length === 0) {
    return <p className="text-sm text-gray-500">No growth levers identified.</p>;
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {levers.map((vg) => (
        <div
          key={vg.missionId}
          className="p-4 rounded-xl border border-gray-700 bg-gray-900"
        >
          <p className="font-medium truncate mb-2">{vg.title}</p>
          <ul className="space-y-2">
            {vg.levers.map((l) => (
              <li key={l.lever} className="text-sm">
                <p className="text-blue-400">{l.label}</p>
                <p className="text-xs text-gray-500">{l.rationale}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function ScalingSummaryGrid({
  summary,
}: {
  summary: {
    portfolioScalingScore: number;
    scaleNowCount: number;
    scaleCautiouslyCount: number;
    optimizeFirstCount: number;
    monthlyRevenueGbp: number;
  };
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {[
        {
          label: "Portfolio Scaling Score",
          value: `${summary.portfolioScalingScore}/100`,
          green: summary.portfolioScalingScore >= 70,
        },
        {
          label: "Scale Now",
          value: summary.scaleNowCount,
          green: true,
        },
        {
          label: "Scale Cautiously",
          value: summary.scaleCautiouslyCount,
        },
        {
          label: "Optimize First",
          value: summary.optimizeFirstCount,
        },
        {
          label: "Monthly Revenue",
          value: formatGbp(summary.monthlyRevenueGbp),
        },
      ].map((item) => (
        <div
          key={item.label}
          className="p-4 rounded-xl border border-gray-700 bg-gray-900"
        >
          <p className="text-xs text-gray-500 uppercase">{item.label}</p>
          <p
            className={`text-xl font-bold ${item.green ? "text-green-400" : ""}`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function PriorityQueueGrid({ queue }: { queue: ScalingPriorityQueue }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <PriorityQueuePanel
        title="Scale Now"
        items={queue.scaleNow}
        emptyLabel="No ventures ready for immediate scaling."
      />
      <PriorityQueuePanel
        title="Scale Cautiously"
        items={queue.scaleCautiously}
        emptyLabel="None in cautious scale tier."
      />
      <PriorityQueuePanel
        title="Optimize First"
        items={queue.optimizeFirst}
        emptyLabel="None need optimization."
      />
      <PriorityQueuePanel
        title="Hold"
        items={queue.hold}
        emptyLabel="None on hold."
      />
      <PriorityQueuePanel
        title="Pause"
        items={queue.pause}
        emptyLabel="None paused."
      />
    </div>
  );
}

export { RoiBadge };
