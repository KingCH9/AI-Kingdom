import type { EmpireFunnelStats } from "@/lib/queries/analytics";
import { STORE_REVENUE_THRESHOLDS } from "@/lib/store/thresholds";

const STAGE_COLORS = [
  "bg-blue-600",
  "bg-indigo-600",
  "bg-violet-600",
  "bg-purple-600",
  "bg-teal-600",
  "bg-cyan-600",
  "bg-green-600",
];

export function EmpireFunnel({ funnel }: { funnel: EmpireFunnelStats }) {
  const maxCount = Math.max(...funnel.stages.map((s) => s.count), 1);

  return (
    <div className="border border-gray-700 rounded-2xl p-6 bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold">Empire Conversion Funnel</h2>
          <p className="text-sm text-gray-400 mt-1">
            {funnel.activePipeline} active opportunities · {funnel.total} total
          </p>
        </div>
        <div className="text-xs text-gray-500 text-right">
          <p>
            Store scaling at £
            {STORE_REVENUE_THRESHOLDS.SCALING_MIN_REVENUE.toLocaleString()}
          </p>
          <p>
            Store profitable at £
            {STORE_REVENUE_THRESHOLDS.PROFITABLE_MIN_REVENUE.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-8">
        {funnel.stages.map((stage, index) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 8 : 0);

          return (
            <div key={stage.stage}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">{stage.label}</span>
                <span className="text-gray-400 font-medium">{stage.count}</span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${STAGE_COLORS[index] ?? "bg-gray-600"}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <ConversionRate
          label="Research → Validated"
          value={funnel.conversionRates.researchToValidated}
        />
        <ConversionRate
          label="Validated → Launch Ready"
          value={funnel.conversionRates.validatedToLaunchReady}
        />
        <ConversionRate
          label="Build → Launched"
          value={funnel.conversionRates.launchReadyToLaunched}
        />
        <ConversionRate
          label="Launched → Profitable"
          value={funnel.conversionRates.launchedToProfitable}
        />
      </div>
    </div>
  );
}

function ConversionRate({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded-lg border border-gray-800 bg-gray-950">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-white">{value}%</p>
    </div>
  );
}
