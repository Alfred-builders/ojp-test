"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SquaresFour, Diamond, Coins, UsersThree, FolderOpen, ShoppingCart, Storefront, HandCoins, ClipboardText } from "@phosphor-icons/react";
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
  { title: "Bijoux", href: "/stock", icon: Diamond, disabled: false },
  { title: "Or Investissement", href: "/or-investissement", icon: Coins, disabled: false },
];

const commerceItems = [
  { title: "Rachat", href: "/lots", icon: ShoppingCart, disabled: false },
  { title: "Dépôt-vente", href: "/depot-vente", icon: HandCoins, disabled: false },
  { title: "Ventes", href: "/ventes", icon: Storefront, disabled: false },
  { title: "Commandes", href: "/commandes", icon: ClipboardText, disabled: false },
];

const crmItems = [
  { title: "Clients", href: "/clients", icon: UsersThree, disabled: false },
  { title: "Dossiers", href: "/dossiers", icon: FolderOpen, disabled: false },
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

      <SidebarGroup>
        <SidebarGroupLabel>Commerce</SidebarGroupLabel>
        <SidebarSeparator className="mb-2" />
        <SidebarGroupContent>
          <SidebarMenu className="gap-2">
            {commerceItems.map((item) => (
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
    </>
  );
}
