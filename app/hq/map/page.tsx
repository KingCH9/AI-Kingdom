import Link from "next/link";
import { getHqMapState } from "@/lib/hq/map";
import { HqMapShell } from "@/components/hq-map/hq-map-shell";

export const dynamic = "force-dynamic";

export default async function HqMapPage() {
  const mapState = await getHqMapState();

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/hq" className="text-blue-400 hover:underline text-sm mb-2 inline-block">
            ← HQ Dashboard
          </Link>
          <h1 className="text-4xl font-bold mb-2">🏛️ HQ Map</h1>
          <p className="text-gray-400 max-w-2xl">
            Living headquarters view — Atlas, Athena, Forge, Nova, Mercury, scouts, and
            agents stationed in their departments. Read-only visualization; no automation.
          </p>
        </div>
        <div className="text-right text-sm text-gray-500">
          <p>Live snapshot</p>
          <p>{new Date(mapState.generatedAt).toLocaleString("en-GB")}</p>
          <p className="mt-2">
            {mapState.totals.agents} agents · {mapState.totals.scouts} scouts ·{" "}
            {mapState.totals.rooms} rooms
          </p>
        </div>
      </div>

      <HqMapShell state={mapState} />

      <section className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {mapState.rooms.map((room) => (
          <Link
            key={room.id}
            href={room.profileHref}
            className="p-4 rounded-xl border border-gray-700 bg-gray-900 hover:border-gray-600 block"
          >
            <p className="font-semibold">
              {room.emoji} {room.name}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {room.agentCount} stationed
              {room.currentMission ? ` · ${room.currentMission}` : ""}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
