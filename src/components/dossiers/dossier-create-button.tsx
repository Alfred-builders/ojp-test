"use client";

import { useState } from "react";
import { FolderPlus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DossierCreateDialog } from "@/components/dossiers/dossier-create-dialog";
import type { Client } from "@/types/client";

export function DossierCreateButton({ validClients }: { validClients: Client[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <FolderPlus size={16} weight="duotone" />
        Nouveau dossier
      </Button>
      <DossierCreateDialog open={open} onOpenChange={setOpen} validClients={validClients} />
    </>
  );
}
