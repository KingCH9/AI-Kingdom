"use client";

import dynamic from "next/dynamic";
import type { HqMapLiveState } from "@/lib/hq/map";

const HqMap = dynamic(() => import("./hq-map").then((mod) => mod.HqMap), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[1024/720] rounded-2xl border border-gray-700 bg-gray-950 animate-pulse flex items-center justify-center text-gray-500 text-sm">
      Loading HQ map…
    </div>
  ),
});

type HqMapShellProps = {
  state: HqMapLiveState;
};

export function HqMapShell({ state }: HqMapShellProps) {
  return <HqMap state={state} />;
}
