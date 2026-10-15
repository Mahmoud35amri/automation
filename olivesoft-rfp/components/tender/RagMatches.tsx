import { Command, EmptyState, Meter, Section } from "@/components/ui";
import type { AssetMatch } from "@/lib/backend";
import { ASSET_TYPE } from "@/lib/format";

type RagMatchesProps = { matches: AssetMatch[]; tenderId: number; hasExtraction: boolean };

export function RagMatches({ matches, tenderId, hasExtraction }: RagMatchesProps) {
  if (matches.length === 0) {
    return (
      <Section index="03" title="Références & profils OliveSoft">
        <EmptyState title="Aucune correspondance enregistrée">
          {hasExtraction ? (
            <>
              Le RAG compare l&apos;extraction de ce tender au portfolio indexé dans Qdrant (projets passés, CV) :
              <br />
              <Command>{`cd rag/src && python link_backend.py ${tenderId}`}</Command>
            </>
          ) : (
            "Le RAG a besoin de l'extraction NLP du tender (exigences, technologies, rôles) pour chercher des correspondances."
          )}
        </EmptyState>
      </Section>
    );
  }

  const sorted = [...matches].sort((a, b) => b.relevance_score - a.relevance_score);

  return (
    <Section index="03" title="Références & profils OliveSoft" aside={`${matches.length} correspondance${matches.length > 1 ? "s" : ""} · RAG`}>
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {sorted.map((m) => (
          <li key={m.id} className="grid gap-x-6 gap-y-2 py-4 sm:grid-cols-[9rem_1fr]">
            <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
              <Meter value={m.relevance_score} />
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">
                {m.asset ? ASSET_TYPE[m.asset.asset_type] : "Actif"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-ink">{m.asset?.title ?? `Actif #${m.asset_id}`}</p>
              {m.match_reason && <p className="mt-1 text-sm leading-relaxed text-muted">{m.match_reason}</p>}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Vert : correspondance forte (≥ 55 %, seuil utilisé par la rédaction). Ambre : expérience seulement transposable.</p>
    </Section>
  );
}
