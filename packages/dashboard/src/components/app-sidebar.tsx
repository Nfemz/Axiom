"use client";

import {
  ActivityIcon,
  BellIcon,
  BotIcon,
  CpuIcon,
  DollarSignIcon,
  FileTextIcon,
  KeyIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  ShieldIcon,
  WorkflowIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const mainNavItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboardIcon },
  { label: "Agents", href: "/agents", icon: BotIcon },
  { label: "Definitions", href: "/definitions", icon: FileTextIcon },
  { label: "Pipelines", href: "/pipelines", icon: WorkflowIcon },
  { label: "Financial", href: "/financial", icon: DollarSignIcon },
  { label: "Skills", href: "/skills", icon: CpuIcon },
  { label: "Alerts", href: "/alerts", icon: BellIcon },
];

const managementNavItems = [
  { label: "Identities", href: "/identities", icon: ShieldIcon },
  { label: "Secrets", href: "/secrets", icon: KeyIcon },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3">
        <Link className="flex items-center gap-2 no-underline" href="/">
          <ActivityIcon className="size-5 text-primary" />
          <span className="font-bold text-foreground text-lg tracking-tight">
            Axiom
          </span>
        </Link>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
