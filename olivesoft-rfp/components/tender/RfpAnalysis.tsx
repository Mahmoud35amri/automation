import { Chip, Command, Section } from "@/components/ui";
import type { NlpExtraction } from "@/lib/backend";

const CATEGORY: Record<string, string> = {
  technical: "Technique",
  staffing: "Équipe",
  references: "Références",
  administrative: "Administratif",
  other: "Autre",
};

type RfpAnalysisProps = { extraction: NlpExtraction | null; description: string; tenderId: number };

function Label({ children }: { children: string }) {
  return <p className="mb-2.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">{children}</p>;
}

export function RfpAnalysis({ extraction, description, tenderId }: RfpAnalysisProps) {
  if (!extraction) {
    return (
      <Section index="01" title="Analyse de l'appel d'offres" aside="Détection portail">
        {description ? (
          <p className="border-l-2 border-line-strong pl-5 text-[0.95rem] leading-relaxed whitespace-pre-line text-text">{description}</p>
        ) : (
          <p className="text-sm text-muted">Aucune description fournie par la source.</p>
        )}
        <p className="mt-5 text-sm leading-relaxed text-muted">
          Ce tender vient du scraper : pas encore d&apos;extraction structurée (exigences, rôles, technologies). Passez son cahier des charges au pipeline NLP :
          <br />
          <Command>{`python nlp/main.py cahier-des-charges.pdf --backend http://localhost:8000/api/v1`}</Command>
        </p>
        <p className="mt-2 text-xs text-muted">Le NLP crée un nouveau tender structuré (#{tenderId} reste la fiche du portail).</p>
      </Section>
    );
  }

  const confidence = extraction.confidence ?? null;

  return (
    <Section
      index="01"
      title="Analyse de l'appel d'offres"
      aside={confidence !== null ? `Extraction NLP · confiance ${Math.round(confidence * 100)} %` : "Extraction NLP"}
    >
      {extraction.missing_fields.length > 0 && (
        <p className="mb-6 rounded-sm border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber-deep">
          Non trouvé dans le document : {extraction.missing_fields.join(", ")}.
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {extraction.project_type.length > 0 && (
          <div>
            <Label>Nature du projet</Label>
            <div className="flex flex-wrap gap-1.5">
              {extraction.project_type.map((t) => (
                <Chip key={t}>{t.replace(/_/g, " ")}</Chip>
              ))}
            </div>
          </div>
        )}
        {extraction.required_technologies.length > 0 && (
          <div>
            <Label>Technologies exigées</Label>
            <div className="flex flex-wrap gap-1.5">
              {extraction.required_technologies.map((t) => (
                <Chip key={t} strong>{t}</Chip>
              ))}
            </div>
          </div>
        )}
      </div>

      {extraction.required_roles.length > 0 && (
        <div className="mt-8">
          <Label>Équipe demandée</Label>
          <ul className="divide-y divide-line rounded-sm border border-line bg-card">
            {extraction.required_roles.map((role, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
                <span className="w-8 font-mono text-amber-deep tabular-nums">{role.count ?? "?"}×</span>
                <span className="font-medium text-ink">{role.title}</span>
                {role.min_experience_years != null && <span className="text-muted">{role.min_experience_years} ans min.</span>}
                {role.required_certifications.map((c) => (
                  <Chip key={c}>{c}</Chip>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}

      {extraction.requirements.length > 0 && (
        <div className="mt-8">
          <Label>{`Exigences (${extraction.requirements.length})`}</Label>
          <ol className="flex flex-col gap-3">
            {extraction.requirements.map((req) => (
              <li key={req.id} className="grid grid-cols-[2.5rem_1fr] gap-3 text-sm">
                <span className="pt-0.5 font-mono text-xs text-muted">{req.id}</span>
                <div>
                  <p className="leading-relaxed text-text">{req.text}</p>
                  <p className="mt-1.5 flex gap-2 text-xs">
                    <span className={req.mandatory ? "font-medium text-brick" : "text-muted"}>{req.mandatory ? "Obligatoire" : "Souhaité"}</span>
                    <span className="text-line-strong">·</span>
                    <span className="text-muted">{CATEGORY[req.category] ?? req.category}</span>
                    {req.min_experience_years != null && <span className="text-muted">· {req.min_experience_years} ans min.</span>}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Section>
  );
}
