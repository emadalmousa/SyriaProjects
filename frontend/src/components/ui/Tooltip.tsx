"use client";

import { useLocale } from "next-intl";
import type { ReactNode } from "react";

interface TooltipProps {
  text: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ text, children, side = "top" }: TooltipProps) {
  const locale = useLocale();
  const isRtl = locale === "ar";

  const positions: Record<string, string> = {
    top:    "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left:   "right-full me-2 top-1/2 -translate-y-1/2",
    right:  "left-full ms-2 top-1/2 -translate-y-1/2",
  };

  const resolvedSide = isRtl
    ? side === "left" ? "right" : side === "right" ? "left" : side
    : side;

  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-[var(--clr-text)] px-2.5 py-1.5 text-xs font-medium text-[var(--clr-bg)] opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100 ${positions[resolvedSide]}`}
        role="tooltip"
      >
        {text}
      </span>
    </span>
  );
}
