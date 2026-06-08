import "./globals.css";
import Link from "next/link";
import { EmpireMutationAccess } from "@/components/empire-mutation-access";

/** Claude opportunity generation can take 30–120s. */
export const maxDuration = 300;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <div className="flex min-h-screen">

          <aside className="w-64 bg-blue-950 p-6">
            <h1 className="text-4xl font-bold mb-10">
              👑 AI Empire
            </h1>

            <nav className="flex flex-col gap-6 text-xl">

              <Link href="/">
                🏠 Dashboard
              </Link>

              <Link href="/hq">
                🏛️ HQ
              </Link>

              <Link href="/hq/missions">
                🎯 Missions
              </Link>

              <Link href="/hq/command">
                🎛️ Command
              </Link>

              <Link href="/hq/atlas">
                👔 Atlas
              </Link>

              <Link href="/hq/scouts">
                🔬 Scouts
              </Link>

              <Link href="/hq/finance">
                💰 Finance
              </Link>

              <Link href="/hq/empire">
                👑 Empire
              </Link>

              <Link href="/validator">
                🔬 Validator Queue
              </Link>

              <Link href="/ceo">
                👔 CEO Queue
              </Link>

              <Link href="/agents">
                🤖 Agents
              </Link>

              <Link href="/agents/work-queue">
                ⚙️ Work Queue
              </Link>

              <Link href="/stores">
                🏪 Stores
              </Link>

              <Link href="/marketing-assets">
                📣 Marketing Assets
              </Link>

              <Link href="/products">
                📦 Products
              </Link>

              <Link href="/revenue">
                💰 Revenue
              </Link>

              <Link href="/sales">
                🛒 Sales
              </Link>

              <Link href="/opportunities">
                🔎 Opportunities
              </Link>

              <Link href="/agent-logs">
                📜 Agent Logs
              </Link>

              <Link href="/tasks">
                📋 Tasks
              </Link>

              <Link href="/readiness">
                🛡️ Readiness
              </Link>

              <Link href="/empire">
                🤖 Empire
              </Link>

              <EmpireMutationAccess />

            </nav>
          </aside>

          <main className="flex-1 p-8">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}