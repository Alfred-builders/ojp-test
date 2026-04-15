"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IconWeight } from "@phosphor-icons/react";
import {
  CheckCircle,
  XCircle,
  Stamp,
  ArrowCounterClockwise,
  ArrowUUpLeft,
  PenNib,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { executeAction } from "@/lib/actions/action-executor";
import type { LotAction, ActionContext, ActionId } from "@/lib/actions/action-types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  CheckCircle,
  XCircle,
  Stamp,
  ArrowCounterClockwise,
  ArrowUUpLeft,
  PenNib,
};

interface ActionButtonProps {
  action: LotAction;
  ctx: ActionContext;
  size?: "sm" | "default";
  onComplete?: () => void;
}

export function ActionButton({ action, ctx, size = "sm", onComplete }: ActionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const Icon = ICON_MAP[action.icon];

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    const result = await executeAction({
      actionId: action.id,
      supabase,
      ctx,
      referenceId: action.referenceId,
    });
    setLoading(false);
    if (result.success) {
      onComplete?.();
      router.refresh();
    }
  }

  return (
    <Button
      size={size}
      variant={action.variant === "destructive" ? "destructive" : action.variant === "outline" ? "outline" : action.variant === "secondary" ? "ghost" : "default"}
      disabled={loading || action.disabled}
      onClick={handleClick}
      title={action.disabledReason}
    >
      {Icon && <Icon size={size === "sm" ? 14 : 16} weight="duotone" />}
      {loading ? "Traitement..." : action.label}
    </Button>
  );
}
