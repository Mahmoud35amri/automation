"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LibraryIcon, PipelineIcon, PlusIcon } from "./icons";

const LINKS = [
  { href: "/", label: "Pipeline", short: "Pipeline", Icon: PipelineIcon },
  { href: "/tenders/new", label: "Nouveau tender", short: "Nouveau", Icon: PlusIcon },
  { href: "/assets", label: "Base de connaissances", short: "Portfolio", Icon: LibraryIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || (pathname.startsWith("/tenders/") && pathname !== "/tenders/new");
  return pathname.startsWith(href);
}

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5" aria-label="Navigation principale">
      {LINKS.map(({ href, label, short, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex shrink-0 items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors ${
              active ? "bg-ink-soft text-paper" : "text-paper/60 hover:bg-ink-soft/60 hover:text-paper"
            }`}
          >
            {active && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-amber md:inset-y-2 md:left-0 md:right-auto md:h-auto md:w-0.5" />}
            <Icon className={active ? "text-amber" : ""} />
            <span className="md:hidden">{short}</span>
            <span className="hidden md:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
