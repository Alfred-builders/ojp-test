"use client";

import { Keyboard } from "@phosphor-icons/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SHORTCUTS = [
  {
    category: "Navigation",
    items: [
      { keys: ["Alt", "D"], description: "Aller au tableau de bord" },
      { keys: ["Alt", "L"], description: "Aller aux lots" },
      { keys: ["Alt", "S"], description: "Aller au stock" },
      { keys: ["Alt", "V"], description: "Aller aux ventes" },
      { keys: ["Alt", "C"], description: "Aller aux clients" },
    ],
  },
  {
    category: "Actions rapides",
    items: [
      { keys: ["Ctrl", "K"], description: "Recherche globale" },
      { keys: ["Ctrl", "N"], description: "Nouveau dossier" },
      { keys: ["/"], description: "Focus sur la recherche" },
      { keys: ["Escape"], description: "Fermer le dialog / popover" },
    ],
  },
  {
    category: "Tableaux",
    items: [
      { keys: ["←", "→"], description: "Page precedente / suivante" },
      { keys: ["Enter"], description: "Ouvrir l'element selectionne" },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border bg-muted px-1.5 text-xs font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function ProfileShortcutsSection() {
  return (
    <div className="space-y-6">
      {SHORTCUTS.map((group) => (
        <Card key={group.category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard size={20} weight="duotone" />
              {group.category}
            </CardTitle>
            <CardDescription>
              Raccourcis clavier pour {group.category.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {group.items.map((shortcut) => (
                <div
                  key={shortcut.description}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, i) => (
                      <span key={key} className="flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-xs text-muted-foreground">+</span>
                        )}
                        <Kbd>{key}</Kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
