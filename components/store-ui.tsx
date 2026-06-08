const STORE_STATUS_STYLES: Record<string, string> = {
  draft: "border-gray-500 text-gray-300 bg-gray-950/40",
  building: "border-indigo-500 text-indigo-400 bg-indigo-950/40",
  launched: "border-teal-500 text-teal-400 bg-teal-950/40",
  scaling: "border-purple-500 text-purple-400 bg-purple-950/40",
  profitable: "border-green-500 text-green-400 bg-green-950/40",
  killed: "border-red-500 text-red-400 bg-red-950/40",
};

export function StoreStatusBadge({ status }: { status: string }) {
  const style =
    STORE_STATUS_STYLES[status] ??
    "border-gray-600 text-gray-300 bg-gray-900";

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border capitalize ${style}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
