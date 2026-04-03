"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SquaresFour, Diamond } from "@phosphor-icons/react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", href: "/dashboard", icon: SquaresFour },
  { title: "Stock", href: "/stock", icon: Diamond },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu className="gap-2">
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
            render={<Link href={item.href} />}
          >
            <item.icon size={18} weight="duotone" />
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
