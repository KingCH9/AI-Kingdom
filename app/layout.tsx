import "./globals.css";
import Link from "next/link";
import { EmpireMutationAccess } from "@/components/empire-mutation-access";

/** Claude opportunity generation can take 30–120s. */
export const maxDuration = 300;

type NavLink = { href: string; label: string };

type NavGroup = { title: string; links: NavLink[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Command",
    links: [
      { href: "/", label: "🏠 Dashboard" },
      { href: "/hq", label: "🏛️ HQ" },
      { href: "/hq/map", label: "🗺️ HQ Map" },
      { href: "/hq/missions", label: "🎯 Missions" },
      { href: "/hq/command", label: "🎛️ Command" },
    ],
  },
  {
    title: "Departments",
    links: [
      { href: "/hq/atlas", label: "👔 Atlas" },
      { href: "/hq/scouts", label: "🔎 Scouts" },
      { href: "/hq/forge", label: "🔨 Forge" },
      { href: "/hq/nova", label: "📈 Nova" },
      { href: "/hq/mercury", label: "💰 Mercury" },
      { href: "/hq/agents", label: "👥 Agents" },
    ],
  },
  {
    title: "Engines",
    links: [
      { href: "/hq/empire", label: "👑 Empire" },
      { href: "/hq/revenue", label: "📈 Revenue" },
      { href: "/hq/capital", label: "💷 Capital" },
      { href: "/hq/ventures", label: "🚀 Scaling" },
    ],
  },
  {
    title: "Pipeline",
    links: [
      { href: "/validator", label: "🔬 Validator" },
      { href: "/ceo", label: "👔 CEO Queue" },
      { href: "/opportunities", label: "🔎 Opportunities" },
    ],
  },
  {
    title: "Operations",
    links: [
      { href: "/stores", label: "🏪 Stores" },
      { href: "/products", label: "📦 Products" },
      { href: "/marketing-assets", label: "📣 Marketing" },
      { href: "/sales", label: "🛒 Sales" },
      { href: "/revenue", label: "💵 Revenue" },
      { href: "/tasks", label: "📋 Tasks" },
    ],
  },
  {
    title: "System",
    links: [
      { href: "/agents/work-queue", label: "⚙️ Work Queue" },
      { href: "/agent-logs", label: "📜 Agent Logs" },
      { href: "/readiness", label: "🛡️ Readiness" },
    ],
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <div className="flex min-h-screen">
          <aside className="w-56 shrink-0 bg-blue-950 p-5 overflow-y-auto">
            <h1 className="text-2xl font-bold mb-8">👑 AI Empire</h1>

            <nav className="flex flex-col gap-5 text-sm">
              {NAV_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="text-[10px] uppercase tracking-wider text-blue-300/60 mb-2">
                    {group.title}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {group.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-blue-100/90 hover:text-white py-0.5"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              <EmpireMutationAccess />
            </nav>
          </aside>

          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
