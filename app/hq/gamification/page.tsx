import Link from "next/link";
import { getGamificationSnapshot } from "@/lib/hq/gamification";

export const dynamic = "force-dynamic";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-emerald-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default async function GamificationPage() {
  const snapshot = await getGamificationSnapshot();

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/hq" className="text-blue-400 hover:underline text-sm mb-2 inline-block">
            ← HQ Dashboard
          </Link>
          <h1 className="text-4xl font-bold mb-2">🏆 Gamification</h1>
          <p className="text-gray-400 max-w-2xl">
            Empire progression, department levels, achievements, and leaderboards.
            Read-only layer — visual rewards with no pipeline or spending changes.
          </p>
        </div>
        <div className="text-right text-sm text-gray-500">
          <p>Live snapshot</p>
          <p>{new Date(snapshot.generatedAt).toLocaleString("en-GB")}</p>
        </div>
      </div>

      <section className="mb-10 p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-gray-900 to-gray-950">
        <h2 className="text-xl font-bold mb-4">Empire Progress</h2>
        <div className="grid md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Empire Level</p>
            <p className="text-3xl font-bold text-amber-400">{snapshot.empire.empireLevel}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Empire XP</p>
            <p className="text-3xl font-bold">{snapshot.empire.empireXp.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Next Level</p>
            <p className="text-3xl font-bold">{snapshot.empire.nextLevelXp.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Achievements</p>
            <p className="text-3xl font-bold">{snapshot.unlockedAchievementCount}</p>
          </div>
        </div>
        <ProgressBar percent={snapshot.empire.progressPercent} />
        <p className="text-xs text-gray-500 mt-2">
          {snapshot.empire.xpToNextLevel > 0
            ? `${snapshot.empire.xpToNextLevel.toLocaleString()} XP to next level`
            : "Max empire level reached"}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Department Levels</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {snapshot.departments.map((dept) => (
            <div
              key={dept.key}
              className="p-4 rounded-xl border border-gray-700 bg-gray-900"
            >
              <p className="font-semibold">{dept.name}</p>
              <p className="text-2xl font-bold mt-1">Lv {dept.level}</p>
              <p className="text-xs text-gray-500 mt-1">
                {dept.xp.toLocaleString()} XP · {dept.missionCount} missions
              </p>
              <div className="mt-3">
                <ProgressBar percent={dept.progressPercent} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        <section>
          <h2 className="text-xl font-bold mb-4">Achievements</h2>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {snapshot.achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-3 rounded-xl border ${
                  achievement.unlocked
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-gray-700 bg-gray-900"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {achievement.unlocked ? "🏆" : "🔒"} {achievement.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{achievement.description}</p>
                  </div>
                  <span className="text-xs text-gray-400">{achievement.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">Unlocks</h2>
          <div className="space-y-2 mb-8">
            {snapshot.unlocks.map((unlock) => (
              <div
                key={unlock.id}
                className={`p-3 rounded-xl border ${
                  unlock.unlocked
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-gray-700 bg-gray-900"
                }`}
              >
                <p className="font-semibold">
                  {unlock.unlocked ? "✅" : "🔒"} {unlock.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">{unlock.description}</p>
                {!unlock.unlocked && (
                  <p className="text-xs text-cyan-400 mt-1">
                    Requires Empire Level {unlock.requiredEmpireLevel}
                  </p>
                )}
              </div>
            ))}
          </div>

          {snapshot.nextUnlock && (
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-gray-900">
              <p className="text-xs text-gray-500 uppercase">Next Unlock</p>
              <p className="font-bold mt-1">{snapshot.nextUnlock.name}</p>
              <p className="text-sm text-gray-400 mt-1">
                Empire Level {snapshot.nextUnlock.requiredEmpireLevel}
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Leaderboards</h2>
        <div className="grid lg:grid-cols-2 gap-6">
          <LeaderboardTable
            title="Top Agents"
            rows={snapshot.leaderboards.topAgents.map((r) => ({
              rank: r.rank,
              name: r.name,
              primary: `Lv ${r.level} · ${r.xp} XP`,
              secondary: `Score ${r.score} · ${formatMoney(r.revenue)}`,
            }))}
          />
          <LeaderboardTable
            title="Top Scouts"
            rows={snapshot.leaderboards.topScouts.map((r) => ({
              rank: r.rank,
              name: r.name,
              primary: `Lv ${r.level} · ${r.xp} XP`,
              secondary: `Score ${r.score} · ${formatMoney(r.revenue)}`,
            }))}
          />
          <LeaderboardTable
            title="Top Departments"
            rows={snapshot.leaderboards.topDepartments.map((r) => ({
              rank: r.rank,
              name: r.name,
              primary: `Lv ${r.level} · ${r.xp} XP`,
              secondary: `Score ${r.score} · ${formatMoney(r.revenue)}`,
            }))}
          />
          <LeaderboardTable
            title="Top Ventures"
            rows={snapshot.leaderboards.topVentures.map((r) => ({
              rank: r.rank,
              name: r.name,
              primary: `${r.missionCount} missions`,
              secondary: `${formatMoney(r.revenue)} · Score ${Math.round(r.score)}`,
            }))}
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Top Performers</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {snapshot.leaderboards.topAgents[0] && (
            <PerformerCard
              label="Top Agent"
              name={snapshot.leaderboards.topAgents[0].name}
              detail={`Score ${snapshot.leaderboards.topAgents[0].score}`}
            />
          )}
          {snapshot.leaderboards.topScouts[0] && (
            <PerformerCard
              label="Top Scout"
              name={snapshot.leaderboards.topScouts[0].name}
              detail={`Score ${snapshot.leaderboards.topScouts[0].score}`}
            />
          )}
          {snapshot.leaderboards.topDepartments[0] && (
            <PerformerCard
              label="Top Department"
              name={snapshot.leaderboards.topDepartments[0].name}
              detail={`Level ${snapshot.leaderboards.topDepartments[0].level}`}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function LeaderboardTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ rank: number; name: string; primary: string; secondary: string }>;
}) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
      <p className="px-4 py-3 font-semibold border-b border-gray-800">{title}</p>
      <div className="divide-y divide-gray-800">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">No data yet</p>
        ) : (
          rows.map((row) => (
            <div key={`${title}-${row.rank}`} className="px-4 py-3 flex gap-3">
              <span className="text-gray-500 w-6">#{row.rank}</span>
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-gray-400">{row.primary}</p>
                <p className="text-xs text-gray-500">{row.secondary}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PerformerCard({
  label,
  name,
  detail,
}: {
  label: string;
  name: string;
  detail: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="text-lg font-bold mt-1">{name}</p>
      <p className="text-sm text-gray-400 mt-1">{detail}</p>
    </div>
  );
}
