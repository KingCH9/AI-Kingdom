export function formatGbp(amount: number, decimals = 0): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(amount);
}

export function BudgetUsageBar({
  percent,
  className = "",
}: {
  percent: number;
  className?: string;
}) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const barColor =
    clamped >= 90 ? "bg-red-500" : clamped >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className={`h-2 rounded-full bg-gray-800 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full ${barColor}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function RoiBadge({
  label,
  roi,
}: {
  label: "positive" | "negative" | "unknown";
  roi: number | null;
}) {
  const classes =
    label === "positive"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
      : label === "negative"
        ? "bg-red-500/20 text-red-300 border-red-500/40"
        : "bg-gray-500/20 text-gray-400 border-gray-600";

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${classes}`}>
      {label === "unknown" ? "Unknown" : `${roi}% ROI`}
    </span>
  );
}
