import { prisma } from "@/lib/prisma";

export default async function EmpirePage() {
  const agents = await prisma.agent.findMany();
  const stores = await prisma.store.findMany();
  const tasks = await prisma.task.findMany();
  const revenue = await prisma.revenue.findMany();

  const totalRevenue = revenue.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  return (
    <div className="p-8">
      <h1 className="text-5xl font-bold mb-8">
        🤖 Empire Control Centre
      </h1>

      <div className="grid grid-cols-4 gap-4 mb-8">

        <div className="bg-slate-800 p-6 rounded-xl">
          <h2>💰 Revenue</h2>
          <p className="text-3xl font-bold">
            £{totalRevenue.toLocaleString()}
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl">
          <h2>🏪 Stores</h2>
          <p className="text-3xl font-bold">
            {stores.length}
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl">
          <h2>🤖 Agents</h2>
          <p className="text-3xl font-bold">
            {agents.length}
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl">
          <h2>📋 Tasks</h2>
          <p className="text-3xl font-bold">
            {tasks.length}
          </p>
        </div>

      </div>

      <div className="bg-slate-900 p-6 rounded-xl">
        <h2 className="text-2xl mb-4">
          Agent Activity
        </h2>

        {agents.map((agent) => (
          <div
            key={agent.id}
            className="border-b border-slate-700 py-3"
          >
            🤖 {agent.name} | {agent.role}
            | Level {agent.level}
            | XP {agent.xp}
          </div>
        ))}
      </div>
    </div>
  );
}