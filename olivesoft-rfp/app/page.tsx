import Form from "next/form";
import Link from "next/link";
import { ArrowRightIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { PipelineRail } from "@/components/PipelineRail";
import { BUTTON, Command, Deadline, EmptyState, INPUT, PageHeader, StatusBadge } from "@/components/ui";
import { displayTitle, listTenders, type Tender, type TenderStatus } from "@/lib/backend";
import { STATUS, hostname, today } from "@/lib/format";

const PAGE_SIZE = 20;

function param(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

function countByStatus(tenders: Tender[]): Record<TenderStatus, number> {
  const counts = Object.fromEntries(Object.keys(STATUS).map((s) => [s, 0])) as Record<TenderStatus, number>;
  return tenders.reduce((acc, t) => ({ ...acc, [t.status]: acc[t.status] + 1 }), counts);
}

export default async function PipelinePage(props: PageProps<"/">) {
  const query = await props.searchParams;
  const rawStatus = param(query.status);
  const status = rawStatus in STATUS ? (rawStatus as TenderStatus) : undefined;
  const search = param(query.q);
  const page = Math.max(0, Math.floor(Number(param(query.page))) || 0);

  const href = (next: { status?: TenderStatus; page?: number }) => {
    const params = new URLSearchParams();
    if (next.status) params.set("status", next.status);
    if (search) params.set("q", search);
    if (next.page) params.set("page", String(next.page));
    return params.size ? `/?${params}` : "/";
  };

  // ponytail: compteurs calculés sur les 100 derniers tenders (limite de GET /tenders/) ; endpoint de comptage côté backend si le pipeline grossit
  const [recent, tenders] = await Promise.all([
    listTenders({ limit: 100 }),
    listTenders({ status, search, skip: page * PAGE_SIZE, limit: PAGE_SIZE }),
  ]);
  const counts = countByStatus(recent);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow={`Appels d'offres · ${today()}`}
        title={
          <>
            Pipeline des <em className="text-amber-deep">marchés</em>
          </>
        }
        lead="Des portails publics à la proposition commerciale : chaque appel d'offres avance de la détection à la recherche prospect, puis à la rédaction."
      >
        <Link href="/tenders/new" className={BUTTON.primary}>
          <PlusIcon /> Nouveau tender
        </Link>
      </PageHeader>

      <PipelineRail counts={counts} active={status} href={(s) => href({ status: s })} />

      <section aria-label="Appels d'offres" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            {status ? (
              <>
                Étape <span className="font-medium text-ink">{STATUS[status].stage}</span> ·{" "}
                <Link href={href({})} className="underline decoration-line-strong underline-offset-4 hover:text-ink">
                  tout afficher
                </Link>
              </>
            ) : (
              <>
                <span className="font-medium text-ink">{recent.length}</span> appel{recent.length > 1 ? "s" : ""} d&apos;offres suivi{recent.length > 1 ? "s" : ""}
              </>
            )}
          </p>
          <Form action="/" className="relative w-full sm:w-80" role="search">
            {status && <input type="hidden" name="status" value={status} />}
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={search} placeholder="Rechercher un objet, un acheteur…" aria-label="Rechercher" className={`${INPUT} pl-9`} />
          </Form>
        </div>

        {tenders.length === 0 ? (
          recent.length === 0 ? (
            <EmptyState title="Aucun appel d'offres détecté pour l'instant">
              Lancez le scraper des portails publics, importez une extraction NLP, ou saisissez un tender à la main.
              <br />
              <Command>python scraper/cstam_pipeline.py --backend http://localhost:8000/api/v1</Command>
            </EmptyState>
          ) : (
            <EmptyState title="Aucun résultat">
              Aucun appel d&apos;offres ne correspond à ce filtre.{" "}
              <Link href="/" className="text-ink underline underline-offset-4">Réinitialiser</Link>
            </EmptyState>
          )
        ) : (
          <ol className="divide-y divide-line border-y border-line">
            {tenders.map((tender, i) => (
              <TenderRow key={tender.id} tender={tender} delay={i * 35} />
            ))}
          </ol>
        )}

        {(page > 0 || tenders.length === PAGE_SIZE) && (
          <div className="flex justify-between text-sm">
            {page > 0 ? <Link href={href({ status, page: page - 1 })} className="text-muted hover:text-ink">← Plus récents</Link> : <span />}
            {tenders.length === PAGE_SIZE && <Link href={href({ status, page: page + 1 })} className="text-muted hover:text-ink">Plus anciens →</Link>}
          </div>
        )}
      </section>
    </div>
  );
}

function TenderRow({ tender, delay }: { tender: Tender; delay: number }) {
  const host = hostname(tender.source_url);
  const reference = tender.nlp_metadata?.reference;

  return (
    <li className="animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <Link
        href={`/tenders/${tender.id}`}
        className="group grid grid-cols-[4.75rem_1fr] items-center gap-x-5 gap-y-3 px-3 py-5 transition-colors hover:bg-card md:grid-cols-[5.5rem_1fr_auto_1rem]"
      >
        <Deadline value={tender.deadline} />
        <div className="min-w-0">
          <p className="line-clamp-2 font-display text-[1.15rem] leading-snug text-ink">{displayTitle(tender)}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>{tender.organization_name ?? "Acheteur non identifié"}</span>
            {host && <span className="font-mono">{host}</span>}
            {reference && <span className="font-mono">{reference}</span>}
            {tender.nlp_metadata && <span className="text-olive">Extraction NLP</span>}
            {tender.is_partial && <span className="text-amber-deep">Dossier incomplet</span>}
          </p>
        </div>
        <div className="col-start-2 md:col-start-auto">
          <StatusBadge status={tender.status} />
        </div>
        <ArrowRightIcon className="hidden text-muted transition-transform group-hover:translate-x-1 group-hover:text-ink md:block" />
      </Link>
    </li>
  );
}
