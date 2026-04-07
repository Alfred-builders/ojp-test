"use client";

import type { EntityType } from "@/components/preview/preview-router";
import { usePreviewDrawer } from "@/hooks/use-preview-drawer";

interface PreviewLinkProps {
  entityType: EntityType;
  entityId: string;
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function PreviewLink({
  entityType,
  entityId,
  href,
  children,
  className,
}: PreviewLinkProps) {
  const { openPreview } = usePreviewDrawer();

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Let Cmd/Ctrl+click open in new tab naturally
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    openPreview(entityType, entityId);
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
