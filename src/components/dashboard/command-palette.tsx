"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  UsersThree,
  FolderOpen,
  ShoppingCart,
  Storefront,
  Diamond,
  Coins,
  CircleNotch,
  Plus,
  SquaresFour,
  ArrowRight,
} from "@phosphor-icons/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useGlobalSearch } from "@/hooks/use-global-search";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { ENTITY_LABELS, type SearchResult } from "@/types/search";

const ENTITY_ICONS: Record<SearchResult["entity_type"], typeof UsersThree> = {
  client: UsersThree,
  dossier: FolderOpen,
  lot: ShoppingCart,
  vente: Storefront,
  bijoux: Diamond,
  or_investissement: Coins,
};

const ENTITY_ORDER: SearchResult["entity_type"][] = [
  "client",
  "dossier",
  "lot",
  "vente",
  "bijoux",
  "or_investissement",
];

interface QuickAction {
  id: string;
  label: string;
  url: string;
  icon: typeof Plus;
  shortcut?: string;
  group: "actions" | "navigation";
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "new-client", label: "Nouveau client", url: "/clients/new", icon: Plus, group: "actions" },
  { id: "new-dossier", label: "Nouveau dossier", url: "/dossiers/new", icon: Plus, shortcut: "⌘⇧N", group: "actions" },
  { id: "nav-dashboard", label: "Aller au tableau de bord", url: "/dashboard", icon: SquaresFour, shortcut: "Alt+D", group: "navigation" },
  { id: "nav-lots", label: "Aller aux lots", url: "/lots", icon: ShoppingCart, shortcut: "Alt+L", group: "navigation" },
  { id: "nav-stock", label: "Aller au stock", url: "/stock", icon: Diamond, shortcut: "Alt+S", group: "navigation" },
  { id: "nav-ventes", label: "Aller aux ventes", url: "/ventes", icon: Storefront, shortcut: "Alt+V", group: "navigation" },
  { id: "nav-clients", label: "Aller aux clients", url: "/clients", icon: UsersThree, shortcut: "Alt+C", group: "navigation" },
  { id: "nav-dossiers", label: "Aller aux dossiers", url: "/dossiers", icon: FolderOpen, group: "navigation" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { query, setQuery, results, isLoading, groupedResults, reset } =
    useGlobalSearch();
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Register global shortcuts
  useGlobalShortcuts();

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset on close
  useEffect(() => {
    if (!open) {
      reset();
      setActiveIndex(0);
    }
  }, [open, reset]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  const showQuickActions = query.trim().length < 2;

  // Filter quick actions by query if partially typed
  const filteredActions = useMemo(() => {
    if (query.trim().length === 0) return QUICK_ACTIONS;
    const q = query.trim().toLowerCase();
    return QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(q));
  }, [query]);

  // Flat list of navigable items
  const flatItems = useMemo(() => {
    if (showQuickActions) {
      return filteredActions.map((a) => ({ id: a.id, url: a.url }));
    }
    return ENTITY_ORDER.flatMap(
      (type) => (groupedResults[type] ?? []).map((r) => ({ id: r.id, url: r.url }))
    );
  }, [showQuickActions, filteredActions, groupedResults]);

  const navigate = useCallback(
    (url: string) => {
      setOpen(false);
      router.push(url);
    },
    [router]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
      scrollToActive(activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      scrollToActive(activeIndex - 1);
    } else if (e.key === "Enter" && flatItems[activeIndex]) {
      e.preventDefault();
      navigate(flatItems[activeIndex].url);
    }
  }

  function scrollToActive(index: number) {
    requestAnimationFrame(() => {
      const item = listRef.current?.querySelector(
        `[data-index="${index}"]`
      );
      item?.scrollIntoView({ block: "nearest" });
    });
  }

  // Render helpers
  let flatIndex = -1;

  function renderQuickActions() {
    const actions = filteredActions.filter((a) => a.group === "actions");
    const navigation = filteredActions.filter((a) => a.group === "navigation");

    if (actions.length === 0 && navigation.length === 0) {
      return (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          Aucune action trouvée
        </div>
      );
    }

    return (
      <>
        {actions.length > 0 && (
          <div>
            <div className="px-4 pt-3 pb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions rapides
              </span>
            </div>
            {actions.map((action) => {
              flatIndex++;
              const idx = flatIndex;
              const isActive = idx === activeIndex;
              const Icon = action.icon;

              return (
                <button
                  key={action.id}
                  data-index={idx}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors outline-none ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => navigate(action.url)}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <Icon size={16} weight="duotone" className="shrink-0 text-muted-foreground" />
                  <span className="flex-1 font-medium">{action.label}</span>
                  {action.shortcut && (
                    <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                      {action.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {navigation.length > 0 && (
          <div>
            <div className="px-4 pt-3 pb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Navigation
              </span>
            </div>
            {navigation.map((action) => {
              flatIndex++;
              const idx = flatIndex;
              const isActive = idx === activeIndex;
              const Icon = action.icon;

              return (
                <button
                  key={action.id}
                  data-index={idx}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors outline-none ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => navigate(action.url)}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <Icon size={16} weight="duotone" className="shrink-0 text-muted-foreground" />
                  <span className="flex-1 font-medium">{action.label}</span>
                  {action.shortcut && (
                    <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                      {action.shortcut}
                    </kbd>
                  )}
                  <ArrowRight size={12} weight="regular" className="shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  }

  function renderSearchResults() {
    if (!isLoading && flatItems.length === 0) {
      return (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          Aucun résultat pour « {query} »
        </div>
      );
    }

    return ENTITY_ORDER.map((entityType) => {
      const items = groupedResults[entityType];
      if (!items?.length) return null;
      const Icon = ENTITY_ICONS[entityType];

      return (
        <div key={entityType}>
          <div className="px-4 pt-3 pb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {ENTITY_LABELS[entityType]}
            </span>
          </div>
          {items.map((item) => {
            flatIndex++;
            const idx = flatIndex;
            const isActive = idx === activeIndex;

            return (
              <button
                key={item.id}
                data-index={idx}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors outline-none ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                }`}
                onClick={() => navigate(item.url)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <Icon
                  size={16}
                  weight="duotone"
                  className="shrink-0 text-muted-foreground"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span className="text-xs text-muted-foreground truncate block">
                      {item.subtitle}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      );
    });
  }

  // Reset flatIndex before render
  flatIndex = -1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[15%] -translate-y-0 sm:max-w-lg p-0 gap-0 overflow-hidden"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4">
          {isLoading ? (
            <CircleNotch
              size={18}
              weight="bold"
              className="shrink-0 text-muted-foreground animate-spin"
            />
          ) : (
            <MagnifyingGlass
              size={18}
              weight="duotone"
              className="shrink-0 text-muted-foreground"
            />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher ou taper une commande..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results / Quick Actions */}
        <div
          ref={listRef}
          className="max-h-[min(60vh,400px)] overflow-y-auto py-1"
        >
          {showQuickActions ? renderQuickActions() : renderSearchResults()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
