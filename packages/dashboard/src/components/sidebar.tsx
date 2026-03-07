"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Agents", href: "/agents" },
  { label: "Definitions", href: "/definitions" },
  { label: "Pipelines", href: "/pipelines" },
  { label: "Financial", href: "/financial" },
  { label: "Skills", href: "/skills" },
  { label: "Alerts", href: "/alerts" },
  { label: "Identities", href: "/identities" },
  { label: "Secrets", href: "/secrets" },
  { label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarClasses = [
    "sidebar",
    collapsed ? "collapsed" : "",
    mobileOpen ? "open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className="mobile-header">
        <button className="sidebar-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? "\u2715" : "\u2630"}
        </button>
        <span style={{ fontWeight: 700 }}>Axiom</span>
      </div>
      <aside className={sidebarClasses}>
        <div className="sidebar-header">
          {!collapsed && <h1>Axiom</h1>}
          <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "\u25B6" : "\u25C0"}
          </button>
        </div>
        <nav>
          {navItems.map(({ label, href }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={isActive ? "active" : ""}
                onClick={() => setMobileOpen(false)}
              >
                {collapsed ? label[0] : label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
