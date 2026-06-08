import { isDashboardAutoUnlockEnabled } from "@/lib/env";
import { EmpireMutationUnlock } from "@/components/empire-mutation-unlock";

export function EmpireMutationAccess() {
  if (isDashboardAutoUnlockEnabled()) {
    return (
      <div className="mt-10 pt-6 border-t border-blue-800">
        <p className="text-sm text-blue-200 font-semibold">Mutation access</p>
        <p className="text-xs text-blue-300/80 mt-1">
          Automatic for dashboard actions. External APIs still require{" "}
          <code className="text-blue-100">x-api-key</code>.
        </p>
      </div>
    );
  }

  return <EmpireMutationUnlock />;
}
