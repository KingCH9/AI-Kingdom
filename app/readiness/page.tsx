import Link from "next/link";
import { DetailSection, StatusBadge } from "@/components/opportunity-ui";
import { runHealthChecks, type DiagnosticCheck } from "@/lib/ops/diagnostics";
import { isProduction } from "@/lib/env";
import { isStripeConfigured, isStripeTestMode } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

function CheckRow({ item }: { item: DiagnosticCheck }) {
  const statusLabel =
    item.status === "pass" ? "pass" : item.status === "warn" ? "warn" : "fail";

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 py-3 border-b border-gray-800 last:border-0">
      <div>
        <p className="font-medium text-white">{item.label}</p>
        <p className="text-sm text-gray-400 mt-1">{item.message}</p>
      </div>
      <StatusBadge status={statusLabel} />
    </div>
  );
}

export default async function ReadinessPage() {
  const report = await runHealthChecks();
  const passCount = report.checks.filter((c) => c.status === "pass").length;
  const warnCount = report.checks.filter((c) => c.status === "warn").length;
  const failCount = report.checks.filter((c) => c.status === "fail").length;

  return (
    <div className="p-10 max-w-4xl">
      <div className="mb-8">
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Production Readiness</h1>
          <p className="text-gray-400">
            Phase 8D.0 — environment, database, and integration diagnostics
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <section className="mb-8 grid md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Environment</p>
          <p className="text-lg font-semibold mt-1">{report.environment}</p>
        </div>
        <div className="bg-gray-900 border border-green-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Pass</p>
          <p className="text-lg font-semibold mt-1 text-green-400">{passCount}</p>
        </div>
        <div className="bg-gray-900 border border-yellow-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Warnings</p>
          <p className="text-lg font-semibold mt-1 text-yellow-400">{warnCount}</p>
        </div>
        <div className="bg-gray-900 border border-red-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase">Failures</p>
          <p className="text-lg font-semibold mt-1 text-red-400">{failCount}</p>
        </div>
      </section>

      <section className="mb-8">
        <DetailSection title="Live Diagnostics">
          <p className="text-xs text-gray-500 mb-4">
            Last checked: {new Date(report.timestamp).toLocaleString()}
          </p>
          {report.checks.map((item) => (
            <CheckRow key={item.id} item={item} />
          ))}
        </DetailSection>
      </section>

      <section className="mb-8">
        <DetailSection title="Deployment checklist">
          <ul className="space-y-3 text-sm text-gray-300">
            <li>
              Run{" "}
              <code className="text-gray-100">npx prisma migrate deploy</code> before
              first boot
            </li>
            <li>
              Set{" "}
              <code className="text-gray-100">EMPIRE_API_KEY</code> in production
              {isProduction() ? " (required)" : ""}
            </li>
            <li>
              Set <code className="text-gray-100">APP_URL</code> to your public domain
            </li>
            <li>
              Back up SQLite file or configure PostgreSQL with automated backups
            </li>
            <li>
              Health probe:{" "}
              <code className="text-gray-100">GET /api/health</code> (returns 503 when
              unhealthy)
            </li>
          </ul>
        </DetailSection>
      </section>

      <section className="mb-8">
        <DetailSection title="Stripe live mode checklist">
          {isStripeConfigured() && isStripeTestMode() && (
            <p className="text-sm text-amber-300 mb-4">
              Currently in test mode. Complete this checklist before accepting live
              payments.
            </p>
          )}
          <ul className="space-y-3 text-sm text-gray-300">
            <li>Replace <code className="text-gray-100">sk_test_</code> with live secret key</li>
            <li>
              Create live webhook endpoint pointing to{" "}
              <code className="text-gray-100">/api/webhooks/stripe</code>
            </li>
            <li>Update <code className="text-gray-100">STRIPE_WEBHOOK_SECRET</code> with live signing secret</li>
            <li>Verify Checkout success/cancel URLs use production APP_URL</li>
            <li>Run a small live payment and confirm order → revenue pipeline</li>
            <li>Enable Stripe Dashboard email alerts for failed webhooks</li>
          </ul>
        </DetailSection>
      </section>

      <section>
        <DetailSection title="Backup guidance">
          <ul className="space-y-3 text-sm text-gray-300">
            <li>
              SQLite: copy <code className="text-gray-100">prisma/dev.db</code> on a
              schedule (stop writes or use backup API for consistency)
            </li>
            <li>Store backups off-host with encryption at rest</li>
            <li>Test restore on staging before production cutover</li>
            <li>
              Document RPO/RTO targets — commerce data lives in Order, Revenue, Customer
              tables
            </li>
          </ul>
        </DetailSection>
      </section>
    </div>
  );
}
