/**
 * Repair orphan store ↔ opportunity links by matching product/store name.
 *
 * Run: npx tsx --env-file=.env scripts/repair-store-opportunity-links.ts
 */
import { repairStoreOpportunityLinks } from "../lib/store/link-opportunity";

async function main() {
  const report = await repairStoreOpportunityLinks();

  console.log(JSON.stringify(report, null, 2));
  console.log(
    `\nLinked: ${report.linked.length} | Skipped: ${report.skipped.length} | Reconciled: ${report.reconciled.synced}/${report.reconciled.checked}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
