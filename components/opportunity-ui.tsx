interface StatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  launch_ready: "border-green-500 text-green-400 bg-green-950/40",
  validated: "border-blue-500 text-blue-400 bg-blue-950/40",
  researching: "border-yellow-500 text-yellow-400 bg-yellow-950/40",
  approved: "border-blue-500 text-blue-400 bg-blue-950/40",
  scaling: "border-purple-500 text-purple-400 bg-purple-950/40",
  profitable: "border-green-500 text-green-400 bg-green-950/40",
  launched: "border-teal-500 text-teal-400 bg-teal-950/40",
  killed: "border-red-500 text-red-400 bg-red-950/40",
  pass: "border-green-500 text-green-400 bg-green-950/40",
  warn: "border-yellow-500 text-yellow-400 bg-yellow-950/40",
  fail: "border-red-500 text-red-400 bg-red-950/40",
  healthy: "border-green-500 text-green-400 bg-green-950/40",
  degraded: "border-yellow-500 text-yellow-400 bg-yellow-950/40",
  unhealthy: "border-red-500 text-red-400 bg-red-950/40",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style =
    STATUS_STYLES[status] ??
    "border-gray-600 text-gray-300 bg-gray-900";

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${style}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: "green" | "blue" | "default";
}

const ACCENT_BORDERS = {
  green: "border-green-500",
  blue: "border-blue-500",
  default: "border-gray-700",
};

export function StatCard({ label, value, accent = "default" }: StatCardProps) {
  return (
    <div
      className={`bg-gray-900 p-4 rounded-xl border ${ACCENT_BORDERS[accent]}`}
    >
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
}

export function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <section className="border border-gray-700 rounded-2xl p-6 bg-gray-900">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </section>
  );
}

interface StringListSectionProps {
  title: string;
  items: string[];
  emptyMessage?: string;
}

export function StringListSection({
  title,
  items,
  emptyMessage = "No items recorded yet.",
}: StringListSectionProps) {
  return (
    <DetailSection title={title}>
      {items.length > 0 ? (
        <ul className="space-y-2 text-gray-300">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-2">
              <span className="text-blue-400 shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      )}
    </DetailSection>
  );
}

interface MetricGridProps {
  metrics: Array<{ label: string; value: string | number }>;
}

export function MetricGrid({ metrics }: MetricGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="border border-gray-700 rounded-xl p-4 bg-gray-950"
        >
          <div className="text-xs text-gray-400 uppercase tracking-wide">
            {metric.label}
          </div>
          <div className="text-2xl font-bold mt-2">{metric.value}</div>
        </div>
      ))}
    </div>
  );
}

interface AgentLogEntry {
  id: number;
  agentName: string;
  action: string;
  createdAt: Date;
}

interface AgentLogListProps {
  logs: AgentLogEntry[];
  emptyMessage?: string;
  /** When true, renders without the surrounding section card (for full pages). */
  standalone?: boolean;
}

function AgentLogTable({ logs }: { logs: AgentLogEntry[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-800">
      <div className="grid grid-cols-3 gap-4 p-3 bg-gray-950 text-sm font-semibold text-gray-400 border-b border-gray-800">
        <div>Agent</div>
        <div>Action</div>
        <div>Timestamp</div>
      </div>
      {logs.map((log) => (
        <div
          key={log.id}
          className="grid grid-cols-3 gap-4 p-3 border-b border-gray-800 last:border-b-0 text-sm"
        >
          <div className="font-medium text-blue-300">{log.agentName}</div>
          <div className="text-gray-300">{log.action}</div>
          <div className="text-gray-500">{log.createdAt.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

export function AgentLogList({
  logs,
  emptyMessage = "No agent activity recorded yet.",
  standalone = false,
}: AgentLogListProps) {
  if (logs.length === 0) {
    if (standalone) {
      return <p className="text-gray-500 text-sm">{emptyMessage}</p>;
    }

    return (
      <DetailSection title="Agent Activity">
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </DetailSection>
    );
  }

  if (standalone) {
    return <AgentLogTable logs={logs} />;
  }

  return (
    <DetailSection title="Agent Activity">
      <AgentLogTable logs={logs} />
    </DetailSection>
  );
}
