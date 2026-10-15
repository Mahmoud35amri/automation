import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ArrowLeftIcon, ExternalIcon } from "@/components/icons";
import { ProposalDocument } from "@/components/ProposalDocument";
import { NextStep } from "@/components/tender/NextStep";
import { ProspectProfile } from "@/components/tender/ProspectProfile";
import { RagMatches } from "@/components/tender/RagMatches";
import { RfpAnalysis } from "@/components/tender/RfpAnalysis";
import { Deadline, EmptyState, Fact, Section, StatusBadge } from "@/components/ui";
import { BACKEND_URL, getTender, type TenderStatus } from "@/lib/backend";
import { IN_PROGRESS, STAGES, STATUS, formatAmount, formatDateTime, hostname, webUrl } from "@/lib/format";

// generateMetadata et la page partagent le même appel au backend
const loadTender = cache(async (id: string) => (/^\d+$/.test(id) ? getTender(id) : null));

export async function generateMetadata(props: PageProps<"/tenders/[id]">): Promise<Metadata> {
  const tender = await loadTender((await props.params).id);
  return { title: tender ? tender.title : "Tender introuvable" };
}

function StageTrack({ status }: { status: TenderStatus }) {
  const reached = STAGES.indexOf(status);
  const busy = IN_PROGRESS.includes(status);
  return (
    <div className="flex items-center gap-4">
      <ol className="flex gap-1.5" aria-label={`Étape ${reached + 1} sur ${STAGES.length}`}>
        {STAGES.map((s, i) => (
          <li
            key={s}
            title={STATUS[s].label}
            className={`h-1 w-8 rounded-full md:w-10 ${
              status === "FAILED" ? "bg-brick/40" : i < reached || (i === reached && !busy) ? "bg-ink" : i === reached ? "animate-pulse bg-amber" : "bg-line-strong/60"
            }`}
          />
        ))}
      </ol>
      <StatusBadge status={status} />
    </div>
  );
}

export default async function TenderPage(props: PageProps<"/tenders/[id]">) {
  const [{ id }, query] = await Promise.all([props.params, props.searchParams]);
  const tender = await loadTender(id);
  if (!tender) notFound();

  const meta = tender.nlp_metadata;
  const source = webUrl(tender.source_url);
  const proposals = [...tender.proposals].sort((a, b) => b.version - a.version);
  const selected = proposals.find((p) => String(p.version) === query.v) ?? proposals[0];
  const sections = selected?.content_json.sections;

  return (
    <div className="flex flex-col gap-10">
      {IN_PROGRESS.includes(tender.status) && <AutoRefresh />}

      <header className="animate-rise border-b border-line pb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
          <ArrowLeftIcon /> Pipeline
        </Link>
        <p className="mt-6 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted">
          <span>Tender #{tender.id}</span>
          {meta?.reference && <span>Réf. {meta.reference}</span>}
          {hostname(tender.source_url) && <span>{hostname(tender.source_url)}</span>}
        </p>
        <h1 className="mt-3 max-w-4xl font-display text-3xl leading-tight font-light tracking-tight text-ink md:text-[2.6rem]">
          {tender.title}
        </h1>
        <p className="mt-3 text-[0.95rem] text-muted">{tender.organization_name ?? meta?.client_name ?? "Acheteur non identifié"}</p>
        <div className="mt-6">
          <StageTrack status={tender.status} />
        </div>
      </header>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-14">
          <RfpAnalysis extraction={meta} description={tender.raw_description} tenderId={tender.id} />
          <ProspectProfile research={tender.research} />
          <RagMatches matches={tender.asset_matches} tenderId={tender.id} hasExtraction={Boolean(meta)} />

          <div id="proposition" className="scroll-mt-8">
            <Section
              index="04"
              title="Proposition commerciale"
              aside={
                proposals.length > 1 && (
                  <nav className="flex gap-1" aria-label="Versions">
                    {proposals.map((p) => (
                      <Link
                        key={p.id}
                        href={`?v=${p.version}#proposition`}
                        scroll={false}
                        aria-current={p.id === selected?.id ? "true" : undefined}
                        className={`rounded-sm px-2 py-1 font-mono ${p.id === selected?.id ? "bg-ink text-paper" : "hover:text-ink"}`}
                      >
                        v{p.version}
                      </Link>
                    ))}
                  </nav>
                )
              }
            >
              {!selected ? (
                <EmptyState title="Pas encore de proposition">
                  Une fois le prospect qualifié, « Générer la proposition » lance la rédaction : références, équipe, écarts identifiés, export .pptx.
                </EmptyState>
              ) : Array.isArray(sections) ? (
                <ProposalDocument
                  key={`${selected.id}-${selected.updated_at}`}
                  tenderId={tender.id}
                  proposalId={selected.id}
                  version={selected.version}
                  updated={formatDateTime(selected.updated_at)}
                  sections={sections}
                  downloadUrl={selected.file_path_pptx ? `${BACKEND_URL}/proposals/${selected.id}/download` : null}
                />
              ) : (
                <pre className="overflow-x-auto rounded-sm border border-line bg-card p-5 font-mono text-xs leading-relaxed">
                  {JSON.stringify(selected.content_json, null, 2)}
                </pre>
              )}
            </Section>
          </div>
        </div>

        <aside className="order-first flex flex-col gap-6 self-start lg:sticky lg:top-8 lg:order-none">
          <NextStep tenderId={tender.id} status={tender.status} />

          <dl className="animate-rise rounded-sm border border-line bg-card px-5 py-2">
            <div className="flex items-center justify-between gap-4 border-b border-line py-4">
              <dt className="text-sm text-muted">Échéance</dt>
              <dd className="text-right">
                <Deadline value={tender.deadline} large />
              </dd>
            </div>
            {tender.sector && <Fact label="Secteur">{tender.sector}</Fact>}
            {meta?.budget != null && <Fact label="Budget annoncé">{formatAmount(meta.budget, meta.currency)}</Fact>}
            {meta?.language && <Fact label="Langue">{meta.language.toUpperCase()}</Fact>}
            {tender.is_partial && <Fact label="Dossier">Incomplet</Fact>}
            <Fact label="Ajouté le">{formatDateTime(tender.created_at)}</Fact>
            {source && (
              <Fact label="Source">
                <a href={source.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                  Voir l&apos;avis <ExternalIcon />
                </a>
              </Fact>
            )}
          </dl>
        </aside>
      </div>
    </div>
  );
}
