import Link from "next/link";
import { getCommandCenterSnapshot } from "@/lib/hq/orchestration";

export const dynamic = "force-dynamic";

export default async function CommandCenterPage() {
  const command = await getCommandCenterSnapshot();

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <Link href="/hq" className="text-blue-400 hover:underline text-sm mb-2 inline-block">
          ← HQ
        </Link>
        <h1 className="text-4xl font-bold mb-2">🎛️ Mission Command Center</h1>
        <p className="text-gray-400 max-w-2xl">
          Phase 3A orchestration — active missions, department routing, pending
          handoffs, and high-priority ventures. Advisory only; human approval
          required for launch and spend.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {new Date(command.generatedAt).toLocaleString("en-GB")}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
        {[
          { label: "Active", value: command.totals.active },
          { label: "Blocked", value: command.totals.blocked, color: "text-red-400" },
          {
            label: "Awaiting Approval",
            value: command.totals.awaitingApproval,
            color: "text-amber-400",
          },
          {
            label: "High Priority",
            value: command.totals.highPriority,
            color: "text-emerald-400",
          },
          { label: "Pending Handoffs", value: command.totals.pendingHandoffs },
        ].map((item) => (
          <div
            key={item.label}
            className="p-4 rounded-xl border border-gray-700 bg-gray-900"
          >
            <p className="text-xs text-gray-500 uppercase">{item.label}</p>
            <p className={`text-2xl font-bold ${"color" in item ? item.color : ""}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Routing Chain</h2>
        <div className="flex flex-wrap gap-2">
          {command.routingChain.map((step, index) => (
            <div key={step.label} className="flex items-center gap-2">
              <span className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 text-sm">
                {step.displayName} · {step.label}
              </span>
              {index < command.routingChain.length - 1 && (
                <span className="text-gray-600">→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        <section>
          <h2 className="text-2xl font-bold mb-4">Department Workstations</h2>
          <ul className="space-y-3">
            {command.departmentWorkloads.map((dept) => (
              <li
                key={dept.departmentKey}
                className="p-4 rounded-xl border border-gray-800 bg-gray-900"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">
                    {dept.avatarEmoji} {dept.displayName}
                  </span>
                  <span className="text-xs text-gray-500">{dept.departmentName}</span>
                </div>
                <p className="text-sm text-gray-400">
                  {dept.activeMissions} active · {dept.blockedMissions} blocked ·{" "}
                  {dept.awaitingHandoff} awaiting handoff
                </p>
                {dept.currentMission ? (
                  <Link
                    href={`/hq/missions/${dept.currentMission.id}`}
                    className="text-sm text-blue-400 hover:underline mt-2 block"
                  >
                    {dept.currentMission.title} ({dept.currentMission.stageLabel})
                  </Link>
                ) : (
                  <p className="text-sm text-gray-600 mt-2">No active mission</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">High Priority Missions</h2>
          {command.highRoiMissions.length === 0 ? (
            <p className="text-gray-500">No high-priority active missions.</p>
          ) : (
            <ul className="space-y-2">
              {command.highRoiMissions.slice(0, 8).map((m) => (
                <li
                  key={m.id}
                  className="p-4 rounded-xl border border-emerald-500/20 bg-gray-900"
                >
                  <Link
                    href={`/hq/missions/${m.id}`}
                    className="font-medium text-emerald-300 hover:underline"
                  >
                    {m.title}
                  </Link>
                  <p className="text-sm text-gray-400 mt-1">
                    {m.route.stage.label} · {m.ownerPersona} · score{" "}
                    {m.opportunityScore ?? "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{m.route.suggestedAction}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Pending Handoffs</h2>
        {command.pendingHandoffs.length === 0 ? (
          <p className="text-gray-500">No pending department handoffs.</p>
        ) : (
          <ul className="space-y-2">
            {command.pendingHandoffs.map((h) => (
              <li
                key={h.missionId}
                className="p-4 rounded-xl border border-amber-500/20 bg-gray-900"
              >
                <Link
                  href={`/hq/missions/${h.missionId}`}
                  className="font-medium hover:underline"
                >
                  {h.missionTitle}
                </Link>
                <p className="text-sm text-gray-400 mt-1">
                  {h.currentPersona} → {h.nextPersona} · {h.nextStageLabel}
                  {h.requiresHumanApproval ? " · approval required" : ""}
                </p>
                <p className="text-xs text-gray-500 mt-1">{h.suggestedAction}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Active Missions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-500">
                <th className="py-2 pr-4">Mission</th>
                <th className="py-2 pr-4">Stage</th>
                <th className="py-2 pr-4">Owner</th>
                <th className="py-2 pr-4">Department</th>
                <th className="py-2 pr-4">Next</th>
              </tr>
            </thead>
            <tbody>
              {command.activeMissions.map((m) => (
                <tr key={m.id} className="border-b border-gray-900">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/hq/missions/${m.id}`}
                      className="text-blue-400 hover:underline"
                    >
                      {m.title}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">{m.route.stage.label}</td>
                  <td className="py-3 pr-4">{m.ownerPersona}</td>
                  <td className="py-3 pr-4">{m.departmentName}</td>
                  <td className="py-3 pr-4 text-gray-400">
                    {m.route.nextStageLabel ?? "—"}
                    {m.route.requiresHumanApproval ? " ⚠" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
