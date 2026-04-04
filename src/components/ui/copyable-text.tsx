"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export function CopyableText({
  value,
  children,
  className,
}: {
  value: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-muted transition-colors group cursor-pointer",
        className
      )}
      onClick={handleCopy}
      title="Cliquer pour copier"
    >
      {children ?? <span>{value}</span>}
      <span className="inline-flex items-center overflow-hidden transition-all duration-200 w-0 opacity-0 group-hover:w-5 group-hover:opacity-60">
        {copied ? (
          <Check weight="bold" className="size-3.5 ml-1.5 shrink-0 text-emerald-500" />
        ) : (
          <Copy weight="duotone" className="size-3.5 ml-1.5 shrink-0" />
        )}
      </span>
    </span>
  );
}
