"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/invoices", label: "Invoices" },
] as const;

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      <ul className="flex gap-1">
        {LINKS.map(({ href, label }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  active && "bg-accent text-accent-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Same links without active state; shown while the pathname resolves (cacheComponents). */
export function AppNavFallback() {
  return (
    <nav aria-label="Main">
      <ul className="flex gap-1">
        {LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
