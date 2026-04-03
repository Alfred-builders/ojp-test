"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SquaresFour, Storefront, Coins, UsersThree, FolderOpen, Package } from "@phosphor-icons/react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const stockItems = [
  { title: "Bijoux", href: "/stock", icon: Storefront, disabled: false },
  { title: "Or Investissement", href: "/or-investissement", icon: Coins, disabled: true },
];

const crmItems = [
  { title: "Clients", href: "/clients", icon: UsersThree, disabled: false },
  { title: "Dossiers", href: "/dossiers", icon: FolderOpen, disabled: true },
  { title: "Lots", href: "/lots", icon: Package, disabled: true },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu className="gap-2">
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/dashboard"}
                render={<Link href="/dashboard" />}
              >
                <SquaresFour size={18} weight="duotone" />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Stock</SidebarGroupLabel>
        <SidebarSeparator className="mb-2" />
        <SidebarGroupContent>
          <SidebarMenu className="gap-2">
            {stockItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                  disabled={item.disabled}
                  render={item.disabled ? undefined : <Link href={item.href} />}
                >
                  <item.icon size={18} weight="duotone" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>CRM</SidebarGroupLabel>
        <SidebarSeparator className="mb-2" />
        <SidebarGroupContent>
          <SidebarMenu className="gap-2">
            {crmItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                  disabled={item.disabled}
                  render={item.disabled ? undefined : <Link href={item.href} />}
                >
                  <item.icon size={18} weight="duotone" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}
