"use client";

import { useRef, useCallback } from "react";
import { Sidebar, useSidebar } from "@/components/ui/sidebar";

export function HoverSidebar({
  children,
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { setOpen, open, isMobile } = useSidebar();
  const wasCollapsed = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (isMobile) return;
    if (!open) {
      wasCollapsed.current = true;
      setOpen(true);
    }
  }, [open, setOpen, isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (isMobile) return;
    if (wasCollapsed.current) {
      wasCollapsed.current = false;
      setOpen(false);
    }
  }, [setOpen, isMobile]);

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <Sidebar {...props}>{children}</Sidebar>
    </div>
  );
}
