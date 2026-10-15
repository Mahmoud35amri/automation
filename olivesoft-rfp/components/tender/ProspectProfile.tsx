import { Chip, EmptyState, Section } from "@/components/ui";
import type { Research } from "@/lib/backend";
import { formatDateTime } from "@/lib/format";

type ProspectProfileProps = { research: Research | null };

export function ProspectProfile({ research }: ProspectProfileProps) {
  if (!research) {
    return (
      <Section index="02" title="Profil prospect">
        <EmptyState title="Prospect pas encore qualifié">
          Lancez la recherche depuis « Prochaine étape » : l&apos;agent identifie le secteur, le budget probable et les partenaires de l&apos;acheteur.
        </EmptyState>
      </Section>
    );
  }

  const figures = [
    { label: "Secteur", value: research.sector },
    { label: "Budget estimé", value: research.estimated_revenue },
    { label: "Fourchette", value: research.estimated_budget_range },
  ].filter((f) => f.value);

  return (
    <Section index="02" title="Profil prospect" aside={`Recherche du ${formatDateTime(research.created_at)}`}>
      {figures.length > 0 && (
        <dl className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">
          {figures.map((f) => (
            <div key={f.label} className="bg-card px-5 py-4">
              <dt className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">{f.label}</dt>
              <dd className="mt-2 font-display text-xl leading-snug text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {research.key_partners.length > 0 && (
        <div className="mt-6">
          <p className="mb-2.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">Partenaires clés</p>
          <div className="flex flex-wrap gap-1.5">
            {research.key_partners.map((p) => (
              <Chip key={p}>{p}</Chip>
            ))}
          </div>
        </div>
      )}

      {research.domain_requirements.length > 0 && (
        <div className="mt-6">
          <p className="mb-2.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">Exigences du domaine</p>
          <div className="flex flex-wrap gap-1.5">
            {research.domain_requirements.map((r) => (
              <Chip key={r}>{r}</Chip>
            ))}
          </div>
        </div>
      )}

      {research.raw_research_notes && (
        <blockquote className="mt-6 border-l-2 border-amber pl-5 font-display text-lg leading-relaxed text-text italic">
          {research.raw_research_notes}
        </blockquote>
      )}
    </Section>
  );
}
