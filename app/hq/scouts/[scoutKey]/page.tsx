import Link from "next/link";
import { notFound } from "next/navigation";
import { getScoutProfile, getScoutProfileDefinition } from "@/lib/hq/workstations";
import { TrendBadge } from "@/components/hq/workstation-ui";
import { formatGbp } from "@/components/hq/finance-ui";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ scoutKey: string }>;
};

export default async function ScoutProfilePage({ params }: PageProps) {
  const { scoutKey } = await params;
  const definition = getScoutProfileDefinition(scoutKey);
  if (!definition) notFound();

  const { profile, rankings } = await getScoutProfile(scoutKey);
  if (!profile) notFound();

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <Link
          href="/hq/scouts"
          className="text-blue-400 hover:underline text-sm mb-2 inline-block"
        >
          ← Scouts
        </Link>
        <div className="flex items-start gap-4">
          <span className="text-5xl">🔎</span>
          <div>
            <h1 className="text-4xl font-bold text-emerald-300">{profile.name}</h1>
            <p className="text-gray-400">{profile.description}</p>
            <p className="text-sm text-gray-500 mt-1">
              {profile.ventureTypeKey} · Rank #{profile.rank}
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
            label: "Success Rate",
            value: `${profile.successRate}%`,
          },
          { label: "Opportunities Found", value: profile.opportunitiesFound },
          { label: "Opportunities Approved", value: profile.opportunitiesApproved },
          { label: "Missions Created", value: profile.missionsCreated },
          { label: "Missions Launched", value: profile.missionsLaunched },
          {
            label: "Revenue Generated",
            value: formatGbp(profile.revenueGenerated),
            green: true,
            wide: true,
          },
          { label: "Rank", value: `#${profile.rank}` },
          { label: "Trend", value: null, trend: profile.performanceTrend },
        ].map((item) => (
          <div
            key={item.label}
            className={`p-4 rounded-xl border border-gray-700 bg-gray-900 ${item.wide ? "md:col-span-2" : ""}`}
          >
            <p className="text-xs text-gray-500 uppercase">{item.label}</p>
            {"trend" in item && item.trend ? (
              <div className="mt-2">
                <TrendBadge trend={item.trend} />
              </div>
            ) : (
              <p
                className={`text-xl font-bold ${item.highlight ? "text-emerald-300" : item.green ? "text-green-400" : ""}`}
              >
                {item.value}
              </p>
            )}
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-xl font-bold mb-3">Scout Rankings</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm text-gray-500 mb-2">Top Scouts</h3>
            <ul className="space-y-1 text-sm">
              {rankings.topScouts.slice(0, 6).map((s, i) => (
                <li key={s.scoutKey} className="flex justify-between">
                  <Link
                    href={`/hq/scouts/${s.scoutKey}`}
                    className={
                      s.scoutKey === profile.scoutKey
                        ? "text-emerald-300 font-semibold"
                        : "hover:text-blue-300"
                    }
                  >
                    #{i + 1} {s.name}
                  </Link>
                  <span className="text-gray-500">{s.score}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm text-gray-500 mb-2">Revenue Leaders</h3>
            <ul className="space-y-1 text-sm">
              {rankings.highestRevenue.slice(0, 6).map((s, i) => (
                <li key={s.scoutKey} className="flex justify-between">
                  <Link
                    href={`/hq/scouts/${s.scoutKey}`}
                    className="hover:text-blue-300"
                  >
                    #{i + 1} {s.name}
                  </Link>
                  <span className="text-green-400">
                    {formatGbp(s.revenueGenerated)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
