"use client";

import { ActionButton } from "./action-button";
import type { LotAction, ActionContext } from "@/lib/actions/action-types";

interface ActionListProps {
  actions: LotAction[];
  ctx: ActionContext;
  onComplete?: () => void;
}

/**
 * Renders a list of action buttons for a lot.
 * Used on the lot detail page.
 */
export function ActionList({ actions, ctx, onComplete }: ActionListProps) {
  if (actions.length === 0) return null;

  // Group by scope: lot-level first, then reference-level
  const lotActions = actions.filter((a) => a.scope === "lot");
  const refActions = actions.filter((a) => a.scope === "reference");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {lotActions.map((action) => (
        <ActionButton
          key={action.id}
          action={action}
          ctx={ctx}
          onComplete={onComplete}
        />
      ))}
      {refActions.map((action) => (
        <ActionButton
          key={`${action.id}-${action.referenceId}`}
          action={action}
          ctx={ctx}
          onComplete={onComplete}
        />
      ))}
    </div>
  );
}
