import type { ReactNode } from "react";
import type { TenderStatus } from "@/lib/backend";
import { STATUS, daysUntil, formatDate, percent } from "@/lib/format";

type PageHeaderProps = { eyebrow: ReactNode; title: ReactNode; lead?: ReactNode; children?: ReactNode };

export function PageHeader({ eyebrow, title, lead, children }: PageHeaderProps) {
  return (
    <header className="animate-rise flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted">{eyebrow}</p>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] font-light tracking-tight text-ink md:text-5xl">{title}</h1>
        {lead && <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-muted">{lead}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-3">{children}</div>}
    </header>
  );
}

export function StatusBadge({ status }: { status: TenderStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${s.badge}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function Chip({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs ${
        strong ? "border-ink bg-ink text-paper" : "border-line-strong/70 bg-card text-text"
      }`}
    >
      {children}
    </span>
  );
}

// Compte à rebours "J-12" : la donnée qu'une équipe commerciale regarde en premier.
export function Deadline({ value, large = false }: { value: string | null; large?: boolean }) {
  if (!value) {
    return <span className="font-mono text-sm text-muted">Sans date</span>;
  }
  const days = daysUntil(value);
  const tone = days < 0 ? "text-brick" : days <= 7 ? "text-amber-deep" : "text-ink";
  const label = days < 0 ? "Expiré" : days === 0 ? "Auj." : `J-${days}`;
  return (
    <span className="flex flex-col leading-none">
      <span className={`font-mono tabular-nums ${large ? "text-3xl" : "text-xl"} font-medium ${tone}`}>{label}</span>
      <span className="mt-1.5 text-xs text-muted">{formatDate(value, large)}</span>
    </span>
  );
}

type SectionProps = { index: string; title: string; aside?: ReactNode; children: ReactNode };

export function Section({ index, title, aside, children }: SectionProps) {
  return (
    <section className="animate-rise scroll-mt-8" aria-label={title}>
      <div className="mb-5 flex items-baseline gap-4 border-b border-line pb-3">
        <span className="font-mono text-xs text-amber-deep">{index}</span>
        <h2 className="font-display text-2xl tracking-tight text-ink">{title}</h2>
        {aside && <div className="ml-auto text-xs text-muted">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

export function Meter({ value, threshold = 0.55 }: { value: number; threshold?: number }) {
  const width = `${Math.max(2, Math.min(100, value * 100))}%`;
  return (
    <span className="flex items-center gap-3">
      <span className="relative h-1 w-24 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <span className={`absolute inset-y-0 left-0 rounded-full ${value >= threshold ? "bg-olive" : "bg-amber"}`} style={{ width }} />
      </span>
      <span className="w-10 font-mono text-xs tabular-nums text-text">{percent(value)}</span>
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-sm border border-dashed border-line-strong bg-card/60 px-6 py-10 text-center">
      <p className="font-display text-xl text-ink">{title}</p>
      <div className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}

export function Command({ children }: { children: string }) {
  return (
    <code className="mt-3 inline-block rounded-sm bg-ink px-3 py-2 text-left font-mono text-xs text-paper/90">{children}</code>
  );
}

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-text">{children}</dd>
    </div>
  );
}

export const BUTTON = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-sm bg-ink px-4 py-2.5 text-sm font-medium text-paper shadow-[inset_0_-2px_0_var(--color-amber)] transition-colors hover:bg-ink-soft disabled:cursor-wait disabled:opacity-70",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-sm border border-line-strong bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink disabled:cursor-wait disabled:opacity-70",
  // sur fond encre
  accent:
    "inline-flex items-center justify-center gap-2 rounded-sm bg-amber px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-amber/90 disabled:cursor-wait disabled:opacity-70",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-sm border border-paper/25 px-4 py-2.5 text-sm text-paper/85 transition-colors hover:border-paper/60 hover:text-paper disabled:cursor-wait disabled:opacity-70",
};

export const INPUT =
  "w-full rounded-sm border border-line-strong bg-card px-3 py-2 text-sm text-text placeholder:text-muted/70 transition-colors focus:border-ink";
