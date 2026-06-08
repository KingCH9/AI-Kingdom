import Link from "next/link";
import { notFound } from "next/navigation";
import { getAgentProfile, getAgentProfileDefinition } from "@/lib/hq/workstations";
import { TrendBadge } from "@/components/hq/workstation-ui";
import { formatGbp } from "@/components/hq/finance-ui";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ agentKey: string }>;
};

export default async function AgentProfilePage({ params }: PageProps) {
  const { agentKey } = await params;
  const definition = getAgentProfileDefinition(agentKey);
  if (!definition) notFound();

  const { profile, rankings } = await getAgentProfile(agentKey);
  if (!profile) notFound();

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <Link
          href="/hq/agents"
          className="text-blue-400 hover:underline text-sm mb-2 inline-block"
        >
          ← Agents
        </Link>
        <div className="flex items-start gap-4">
          <span className="text-5xl">{profile.avatarEmoji}</span>
          <div>
            <h1 className="text-4xl font-bold">{profile.name}</h1>
            <p className="text-gray-400">{profile.title}</p>
            <p className="text-sm text-gray-500 mt-1">
              {profile.departmentName} · Rank #{profile.rank}
              {profile.isAggregate ? " · Executive aggregate" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          { label: "Level", value: profile.level },
          { label: "XP", value: profile.xp },
          { label: "Score", value: profile.score, highlight: true },
          {
            label: "Revenue Influenced",
            value: formatGbp(profile.revenueInfluenced),
            green: true,
          },
          { label: "Missions Worked", value: profile.missionsWorked },
          { label: "Missions Completed", value: profile.missionsCompleted },
          { label: "Rank", value: `#${profile.rank}` },
          { label: "Trend", value: null, trend: profile.performanceTrend },
        ].map((item) => (
          <div
            key={item.label}
            className="p-4 rounded-xl border border-gray-700 bg-gray-900"
          >
            <p className="text-xs text-gray-500 uppercase">{item.label}</p>
            {"trend" in item && item.trend ? (
              <div className="mt-2">
                <TrendBadge trend={item.trend} />
              </div>
            ) : (
              <p
                className={`text-xl font-bold ${item.highlight ? "text-amber-300" : item.green ? "text-green-400" : ""}`}
              >
                {item.value}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        <section>
          <h2 className="text-xl font-bold mb-3">Strengths</h2>
          <ul className="space-y-2">
            {profile.strengths.map((s) => (
              <li
                key={s}
                className="p-3 rounded-lg border border-emerald-500/20 bg-gray-900 text-sm text-emerald-300"
              >
                {s}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-bold mb-3">Weaknesses</h2>
          <ul className="space-y-2">
            {profile.weaknesses.map((w) => (
              <li
                key={w}
                className="p-3 rounded-lg border border-amber-500/20 bg-gray-900 text-sm text-amber-300"
              >
                {w}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Recent Activity</h2>
        {profile.recentActivity.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent mission events.</p>
        ) : (
          <ul className="space-y-2">
            {profile.recentActivity.map((event, index) => (
              <li
                key={`${event.createdAt}-${index}`}
                className="p-3 rounded-lg border border-gray-800 bg-gray-900 text-sm"
              >
                <p className="font-medium">{event.action}</p>
                <p className="text-gray-500">{event.missionTitle}</p>
                {event.detail ? (
                  <p className="text-xs text-gray-600 mt-1">{event.detail}</p>
                ) : null}
                <p className="text-xs text-gray-600 mt-1">
                  {new Date(event.createdAt).toLocaleString("en-GB")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">Peer Rankings</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm text-gray-500 mb-2">Top Agents</h3>
            <ul className="space-y-1 text-sm">
              {rankings.agents.topAgents.slice(0, 5).map((a, i) => (
                <li key={a.agentKey} className="flex justify-between">
                  <Link
                    href={`/hq/agents/${a.agentKey}`}
                    className={
                      a.agentKey === profile.agentKey
                        ? "text-amber-300 font-semibold"
                        : "hover:text-blue-300"
                    }
                  >
                    #{i + 1} {a.name}
                  </Link>
                  <span className="text-gray-500">{a.score}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm text-gray-500 mb-2">Department Standings</h3>
            <ul className="space-y-1 text-sm">
              {rankings.departments.map((d, i) => (
                <li key={d.departmentKey} className="flex justify-between">
                  <span
                    className={
                      d.departmentKey === profile.department
                        ? "text-amber-300 font-semibold"
                        : ""
                    }
                  >
                    #{i + 1} {d.departmentName}
                  </span>
                  <span className="text-gray-500">{d.averageScore}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
