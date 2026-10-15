import Link from "next/link";
import type { TenderStatus } from "@/lib/backend";
import { STAGES, STATUS } from "@/lib/format";

type PipelineRailProps = {
  counts: Record<TenderStatus, number>;
  active: TenderStatus | undefined;
  href: (status: TenderStatus | undefined) => string;
};

// La machine à états du backend, lisible d'un coup d'œil — et chaque étape filtre la liste.
export function PipelineRail({ counts, active, href }: PipelineRailProps) {
  const cells: TenderStatus[] = [...STAGES, "FAILED"];

  return (
    <nav aria-label="Filtrer par étape" className="animate-rise grid grid-cols-2 overflow-hidden rounded-sm border border-line bg-card sm:grid-cols-3 lg:grid-cols-6">
      {cells.map((status, i) => {
        const selected = active === status;
        const failed = status === "FAILED";
        return (
          <Link
            key={status}
            href={href(selected ? undefined : status)}
            aria-current={selected ? "true" : undefined}
            className={`group relative border-line px-5 py-5 transition-colors max-sm:[&:nth-child(odd)]:border-r max-sm:[&:nth-child(-n+4)]:border-b sm:max-lg:[&:not(:nth-child(3n))]:border-r sm:max-lg:[&:nth-child(-n+3)]:border-b lg:[&:not(:last-child)]:border-r ${
              selected ? "bg-paper" : "hover:bg-paper/60"
            } ${status === "PROPOSAL_READY" ? "lg:border-dashed" : ""}`}
          >
            {selected && <span className="absolute inset-x-0 top-0 h-0.5 bg-amber" />}
            <span className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">
              <span className={`size-1.5 rounded-full ${STATUS[status].dot}`} />
              {failed ? "—" : `0${i + 1}`} {STATUS[status].stage}
            </span>
            <span className={`mt-3 block font-display text-4xl font-light tabular-nums ${counts[status] ? "text-ink" : "text-line-strong"}`}>
              {counts[status]}
            </span>
            {!failed && i < STAGES.length - 1 && (
              <span aria-hidden="true" className="absolute top-1/2 -right-[5px] z-10 hidden size-2.5 -translate-y-1/2 rotate-45 border-t border-r border-line bg-card lg:block" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
