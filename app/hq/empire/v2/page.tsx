import { redirect } from "next/navigation";

/** Legacy V2 path — canonical dashboard is /hq/empire (Phase 4D). */
export default function EmpireV2RedirectPage() {
  redirect("/hq/empire");
}
