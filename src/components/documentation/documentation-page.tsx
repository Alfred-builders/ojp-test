"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { categories } from "./doc-categories";
import type { DocSection } from "./doc-categories";

export function DocumentationPage() {
  const allSections: DocSection[] = categories.flatMap((c) => c.sections);
  const allIds = allSections.flatMap((s) => [s.id, ...(s.steps?.map((st) => st.id) ?? [])]);
  const [activeId, setActiveId] = useState(allIds[0]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isClickScrolling = useRef(false);

  // Find which section the activeId belongs to
  const activeSectionId = allSections.find(
    (s) => s.id === activeId || s.steps?.some((st) => st.id === activeId)
  )?.id ?? allSections[0].id;

  // Intersection observer to track scroll position
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { root: container, rootMargin: "-10% 0px -80% 0px", threshold: 0 }
    );

    const targets = container.querySelectorAll("[data-doc-section]");
    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el || !scrollRef.current) return;
    isClickScrolling.current = true;
    setActiveId(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  }

  const contentStyles = "text-sm leading-[2] [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_h4]:mt-6 [&_h4]:text-base [&_li]:leading-[2] [&_li]:my-0.5 [&_ol]:leading-[2] [&_p]:text-muted-foreground [&_p]:my-3 [&_ul]:leading-[2] [&_strong]:text-foreground [&_p>button]:align-middle [&_p>button]:mx-1.5 [&_p>[data-slot=badge]]:align-middle [&_p>[data-slot=badge]]:mx-1";

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Navigation latérale — masquée sur mobile */}
      <div className="hidden md:flex md:flex-col w-56 shrink-0 border-r overflow-hidden">
      <nav className="space-y-4 overflow-y-auto pr-4 pl-6 pt-4 h-full">
        {categories.map((category) => (
          <div key={category.label} className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {category.label}
            </p>
            {category.sections.map((section) => {
              const Icon = section.icon;
              const isSectionActive = section.id === activeSectionId;
              const isCurrent = section.id === activeId;
              return (
                <div key={section.id}>
                  <button
                    onClick={() => scrollTo(section.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                      isCurrent
                        ? "bg-muted font-medium text-foreground"
                        : isSectionActive
                          ? "font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Icon size={16} weight="duotone" />
                    {section.title}
                  </button>
                  {/* Sous-étapes */}
                  {isSectionActive && section.steps && (
                    <div className="ml-7 space-y-0.5 border-l py-1 pl-2">
                      {section.steps.map((step, idx) => (
                        <button
                          key={step.id}
                          onClick={() => scrollTo(step.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors text-left",
                            activeId === step.id
                              ? "bg-muted font-medium text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <span className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                            activeId === step.id ? "bg-foreground text-background" : "bg-muted"
                          )}>
                            {idx + 1}
                          </span>
                          <span className="leading-tight">{step.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
      </div>

      {/* Contenu scrollable — tout sur une page */}
      <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto scroll-smooth pl-6">
        <div className="pb-[50vh]">
          {allSections.map((section, sectionIdx) => (
            <div key={section.id} className="mx-auto max-w-4xl">
              {sectionIdx > 0 && <hr className="mb-16 mt-16 border-border/40" />}
              {/* Titre de la section */}
              <div
                id={section.id}
                data-doc-section
                className="mb-2 flex items-center gap-3 scroll-mt-4"
              >
                <section.icon size={28} weight="duotone" className="shrink-0 text-foreground" />
                <h2 className="text-2xl font-bold leading-none">{section.title}</h2>
              </div>
              <div className={contentStyles}>
                {section.content}
              </div>

              {/* Étapes */}
              {section.steps && (
                <div className="mt-10 space-y-6">
                  {section.steps.map((step, idx) => (
                    <div key={step.id}>
                      <Card
                        id={step.id}
                        data-doc-section
                        className="!gap-0 !py-0 scroll-mt-4 overflow-hidden"
                      >
                        <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-3">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
                            {idx + 1}
                          </span>
                          <h3 className="text-base font-semibold">{step.label}</h3>
                        </div>
                        <div className={cn(contentStyles, "px-5 py-4")}>
                          {step.content}
                        </div>
                      </Card>
                      {step.note && (
                        <div className="mt-6">
                          {step.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
