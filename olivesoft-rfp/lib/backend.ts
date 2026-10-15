import { buildDescription, buildTitle } from "./ingestTender";
import type { ProposalSection } from "./pptx";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000/api/v1";

export class BackendError extends Error {
  constructor(public status: number, message: string, public body = "") {
    super(message);
  }
}

export async function backend<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store", // l'état des tenders est vivant : jamais figé au build
  });
  if (!res.ok) {
    const text = await res.text();
    throw new BackendError(res.status, `${method} ${path} -> ${res.status}: ${text}`, text);
  }
  return res.json();
}

export async function backendOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${new URL(BACKEND_URL).origin}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Types renvoyés par le backend (app/schemas/*.py) ---

export type TenderStatus =
  | "DETECTED"
  | "RESEARCHING"
  | "RESEARCHED"
  | "GENERATING_PROPOSAL"
  | "PROPOSAL_READY"
  | "FAILED";

export type NlpRole = {
  title: string;
  count: number | null;
  min_experience_years: number | null;
  required_certifications: string[];
};

export type NlpRequirement = {
  id: string;
  text: string;
  category: string;
  mandatory: boolean;
  min_experience_years: number | null;
};

export type NlpExtraction = {
  reference: string | null;
  title: string;
  client_name: string | null;
  client_sector: string | null;
  deadline: string | null;
  budget: number | null;
  currency: string | null;
  project_type: string[];
  required_technologies: string[];
  required_roles: NlpRole[];
  requirements: NlpRequirement[];
  language: string | null;
  missing_fields: string[];
  confidence: number | null;
};

export type Tender = {
  id: number;
  title: string;
  organization_name: string | null;
  source_url: string | null;
  raw_description: string;
  nlp_metadata: NlpExtraction | null;
  status: TenderStatus;
  is_partial: boolean;
  deadline: string | null;
  created_at: string;
  updated_at: string;
};

export type Research = {
  id: number;
  tender_id: number;
  sector: string | null;
  estimated_revenue: string | null;
  key_partners: string[];
  domain_requirements: string[];
  competitor_insights: Record<string, unknown> | null;
  estimated_budget_range: string | null;
  raw_research_notes: string | null;
  created_at: string;
};

export type AssetType = "CV" | "PAST_PROJECT" | "TOOL_STACK";

export type Asset = {
  id: number;
  title: string;
  asset_type: AssetType;
  description: string;
  qdrant_point_id: string | null;
  metadata_json: Record<string, unknown> | null;
  file_url: string | null;
  created_at: string;
};

export type AssetMatch = {
  id: number;
  tender_id: number;
  asset_id: number;
  relevance_score: number;
  match_reason: string | null;
  created_at: string;
  asset: Asset | null;
};

export type Proposal = {
  id: number;
  tender_id: number;
  version: number;
  content_json: { sections?: ProposalSection[] } & Record<string, unknown>;
  file_path_pptx: string | null;
  file_path_pdf: string | null;
  created_at: string;
  updated_at: string;
};

export type TenderDetail = Tender & {
  research: Research | null;
  asset_matches: AssetMatch[];
  proposals: Proposal[];
};

// Les tenders venant du NLP ont souvent un titre générique ("REQUEST FOR PROPOSAL") :
// même règle que l'ancien /api/tenders/ingest pour en construire un lisible.
export function displayTitle(tender: Tender): string {
  const title = tender.nlp_metadata ? buildTitle(tender.nlp_metadata) : tender.title;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export async function listTenders(query: { status?: TenderStatus; search?: string; skip?: number; limit?: number }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return backend<Tender[]>(`/tenders/?${params}`);
}

export async function listAssets(): Promise<Asset[]> {
  const assets: Asset[] = [];
  for (let skip = 0; ; skip += 100) {
    const page = await backend<Asset[]>(`/assets/?skip=${skip}&limit=100`);
    assets.push(...page);
    if (page.length < 100) return assets;
  }
}

// Les identifiants viennent de requêtes externes : seul un entier positif est interpolé dans une URL du backend
// (sinon "1/../../assets" viserait une autre ressource).
export function parseId(value: unknown): number | null {
  const id = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Le backend garde l'extraction NLP brute dans nlp_metadata (raw_description est vide pour /tenders/from-nlp) :
// titre, description, secteur et rôles en sont reconstruits avec les mêmes règles que l'ancien /api/tenders/ingest.
export async function getTender(rawId: unknown) {
  const id = parseId(rawId);
  if (id === null) return null;
  let tender: TenderDetail;
  try {
    tender = await backend<TenderDetail>(`/tenders/${id}`);
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) return null;
    throw err;
  }
  const meta = tender.nlp_metadata;
  return {
    ...tender,
    title: displayTitle(tender),
    raw_description: tender.raw_description || (meta ? buildDescription(meta) : ""),
    sector: meta?.client_sector ?? null,
    required_roles: meta?.required_roles ?? [],
  };
}
