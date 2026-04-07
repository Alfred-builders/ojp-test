"use client";

import { useContext } from "react";
import { PreviewDrawerContext } from "@/providers/preview-drawer-provider";

export function usePreviewDrawer() {
  const ctx = useContext(PreviewDrawerContext);
  if (!ctx) {
    throw new Error(
      "usePreviewDrawer must be used within PreviewDrawerProvider"
    );
  }
  return ctx;
}
