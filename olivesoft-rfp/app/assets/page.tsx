import type { Metadata } from "next";
import Link from "next/link";
import { Chip, Command, EmptyState, PageHeader } from "@/components/ui";
import { listAssets, type Asset, type AssetType } from "@/lib/backend";
import { ASSET_TYPE, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Base de connaissances" };

const TYPES: AssetType[] = ["PAST_PROJECT", "CV", "TOOL_STACK"];

// Les listes du metadata_json (technologies, compétences, rôles…) servent de mots-clés.
function keywords(asset: Asset): string[] {
  const meta = asset.metadata_json ?? {};
  const lists = ["technologies", "skills", "roles", "certifications", "project_type"].map((k) => meta[k]);
  const words = lists.flatMap((l) => (Array.isArray(l) ? l.filter((v): v is string => typeof v === "string") : []));
  return [...new Set(words.map((w) => w.replace(/_/g, " ")))].slice(0, 8);
}

function summary(asset: Asset): string {
  const years = asset.metadata_json?.experience_years;
  return asset.asset_type === "CV" && typeof years === "number" ? `${years} ans d'expérience` : asset.description;
}

export default async function AssetsPage(props: PageProps<"/assets">) {
  const query = await props.searchParams;
  const assets = await listAssets();
  const active = TYPES.find((t) => t === query.type);
  const shown = active ? assets.filter((a) => a.asset_type === active) : assets;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow={`Portfolio OliveSoft · ${assets.length} actif${assets.length > 1 ? "s" : ""}`}
        title="Base de connaissances"
        lead="Projets passés, profils et outils enregistrés par le RAG lorsqu'ils correspondent à un appel d'offres. Chaque actif renvoie à son vecteur dans Qdrant."
      />

      <nav className="flex flex-wrap gap-2" aria-label="Filtrer par type">
        <Link href="/assets" aria-current={!active ? "true" : undefined} className={`rounded-full border px-3.5 py-1.5 text-sm ${!active ? "border-ink bg-ink text-paper" : "border-line-strong text-muted hover:text-ink"}`}>
          Tous · {assets.length}
        </Link>
        {TYPES.map((t) => {
          const count = assets.filter((a) => a.asset_type === t).length;
          return (
            <Link key={t} href={`/assets?type=${t}`} aria-current={active === t ? "true" : undefined} className={`rounded-full border px-3.5 py-1.5 text-sm ${active === t ? "border-ink bg-ink text-paper" : "border-line-strong text-muted hover:text-ink"}`}>
              {ASSET_TYPE[t]}s · {count}
            </Link>
          );
        })}
      </nav>

      {shown.length === 0 ? (
        <EmptyState title="Aucun actif enregistré">
          Les actifs sont créés par le RAG la première fois qu&apos;un projet ou un CV correspond à un tender :
          <br />
          <Command>cd rag/src && python link_backend.py &lt;tender_id&gt;</Command>
        </EmptyState>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((asset, i) => (
            <li key={asset.id} className="animate-rise flex flex-col rounded-sm border border-line bg-card p-6" style={{ animationDelay: `${i * 30}ms` }}>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-amber-deep">{ASSET_TYPE[asset.asset_type]}</p>
              <h2 className="mt-2 font-display text-xl leading-snug text-ink">{asset.title}</h2>
              <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted">{summary(asset)}</p>
              {keywords(asset).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {keywords(asset).map((k) => (
                    <Chip key={k}>{k}</Chip>
                  ))}
                </div>
              )}
              <p className="mt-auto flex justify-between gap-3 pt-5 font-mono text-[0.68rem] text-muted">
                <span>{asset.qdrant_point_id ? `Qdrant #${asset.qdrant_point_id}` : "Hors index vectoriel"}</span>
                <span>{formatDateTime(asset.created_at)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
