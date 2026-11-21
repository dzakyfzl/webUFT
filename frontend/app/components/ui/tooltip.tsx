"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { useId, type ReactElement, type ReactNode } from "react";

export function TooltipGroup({ children }: { children: ReactNode }) {
  return <Tooltip.Provider delay={450} timeout={1400}>{children}</Tooltip.Provider>;
}

export function ActionTooltip({ label, trigger, side = "top" }: { label: string; trigger: ReactElement; side?: "top" | "bottom" | "left" | "right" }) {
  const descriptionId = useId();
  return <Tooltip.Root>
    <Tooltip.Trigger render={trigger} aria-describedby={descriptionId}/>
    <Tooltip.Portal>
      <Tooltip.Positioner className="motion-tooltip-position" side={side} sideOffset={8}>
        <Tooltip.Popup className="motion-tooltip" id={descriptionId} role="tooltip">{label}</Tooltip.Popup>
      </Tooltip.Positioner>
    </Tooltip.Portal>
  </Tooltip.Root>;
}
