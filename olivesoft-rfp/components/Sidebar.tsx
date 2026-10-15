import Link from "next/link";
import { BACKEND_URL, backendOnline } from "@/lib/backend";
import { BrandMark } from "./icons";
import { NavLinks } from "./NavLinks";

export async function Sidebar() {
  const online = await backendOnline();

  return (
    <aside className="z-10 flex shrink-0 flex-col gap-4 bg-ink px-4 py-4 text-paper md:sticky md:top-0 md:h-dvh md:w-64 md:gap-10 md:px-5 md:py-8">
      <Link href="/" className="flex items-center gap-3 px-1">
        <BrandMark />
        <span className="leading-none">
          <span className="block font-display text-[1.35rem] tracking-tight">OliveSoft</span>
          <span className="mt-1 block font-mono text-[0.62rem] uppercase tracking-[0.22em] text-amber">
            RFP Intelligence
          </span>
        </span>
      </Link>

      <NavLinks />

      <div className="mt-auto hidden border-t border-paper/10 pt-5 text-xs md:block">
        <p className="flex items-center gap-2 text-paper/80">
          <span className={`size-2 rounded-full ${online ? "bg-olive" : "bg-brick"}`} />
          {online ? "Backend connecté" : "Backend injoignable"}
        </p>
        <p className="mt-1.5 truncate font-mono text-[0.68rem] text-paper/45" title={BACKEND_URL}>
          {new URL(BACKEND_URL).host}
        </p>
      </div>
    </aside>
  );
}
