import { AgentLogList } from "@/components/opportunity-ui";
import { prisma } from "@/lib/prisma";

export default async function AgentLogsPage() {
  const logs = await prisma.agentLog.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="p-10 max-w-6xl">
      <h1 className="text-5xl font-bold mb-4">📜 Agent Logs</h1>
      <p className="text-gray-400 mb-8">
        Complete audit trail of agent actions across the empire.
      </p>

      <AgentLogList
        logs={logs}
        standalone
        emptyMessage="No agent logs recorded yet. Run Trend Hunter or validate an opportunity to generate activity."
      />
    </div>
  );
}
