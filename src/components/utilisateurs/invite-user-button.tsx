"use client";

import { useState } from "react";
import { UserPlus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { InviteUserDialog } from "@/components/utilisateurs/invite-user-dialog";

export function InviteUserButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus size={16} weight="duotone" />
        Inviter un vendeur
      </Button>
      <InviteUserDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
