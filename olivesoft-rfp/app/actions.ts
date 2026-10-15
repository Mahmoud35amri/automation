"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { backend, BackendError, getTender, parseId, type Tender } from "@/lib/backend";
import { saveProposalPptx, type ProposalSection } from "@/lib/pptx";

// values : saisie renvoyée avec l'erreur, car React 19 réinitialise le formulaire après l'action
export type FormState = { error: string | null; values?: Record<string, string> };

function positiveId(value: unknown): number {
  const id = parseId(value);
  if (id === null) throw new Error("Identifiant invalide");
  return id;
}

function field(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

// FastAPI répond {"detail": "..."} ou, pour une 422, {"detail": [{loc, msg}, ...]}.
function backendMessage(err: unknown): string {
  if (!(err instanceof BackendError)) {
    // fetch lève TypeError si le serveur ne répond pas, TimeoutError après AbortSignal.timeout
    const unreachable = err instanceof TypeError || (err instanceof Error && err.name === "TimeoutError");
    return unreachable
      ? "Le backend est injoignable — vérifiez qu'il tourne (uvicorn app.main:app --port 8000)."
      : `Erreur : ${err instanceof Error ? err.message : String(err)}`;
  }
  try {
    const { detail } = JSON.parse(err.body);
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => `${(d.loc ?? []).slice(1).join(".") || "requête"} : ${d.msg}`).join(" · ");
    }
  } catch {
    // corps non JSON : message générique ci-dessous
  }
  return `Le backend a répondu ${err.status}.`;
}

async function trigger(id: number, step: "trigger-research" | "trigger-proposal"): Promise<FormState> {
  try {
    await backend(`/tenders/${positiveId(id)}/${step}`, "POST");
  } catch (err) {
    return { error: backendMessage(err) };
  }
  refresh();
  return { error: null };
}

export async function triggerResearch(id: number): Promise<FormState> {
  return trigger(id, "trigger-research");
}

export async function triggerProposal(id: number): Promise<FormState> {
  return trigger(id, "trigger-proposal");
}

export async function createTenderFromNlp(_prev: FormState, form: FormData): Promise<FormState> {
  const raw = field(form, "payload");
  if (!raw) return { error: "Collez ou chargez le JSON produit par nlp/main.py." };

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    return { error: `JSON invalide : ${(err as Error).message}` };
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { error: "Le JSON doit être un objet : une extraction RFPExtraction." };
  }

  let tender: Tender;
  try {
    tender = await backend<Tender>("/tenders/from-nlp", "POST", payload);
  } catch (err) {
    return { error: backendMessage(err) };
  }
  redirect(`/tenders/${tender.id}`);
}

export async function createTender(_prev: FormState, form: FormData): Promise<FormState> {
  const title = field(form, "title");
  const organization = field(form, "organization_name");
  const source = field(form, "source_url");
  const deadline = field(form, "deadline");
  const description = field(form, "raw_description");
  const values = { title, organization_name: organization, source_url: source, deadline, raw_description: description };
  const fail = (error: string): FormState => ({ error, values });

  if (!title) return fail("Le titre est obligatoire.");
  if (title.length > 255 || organization.length > 255) return fail("Titre et client : 255 caractères maximum.");
  if (source && (!/^https?:\/\//i.test(source) || source.length > 500)) {
    return fail("L'URL source doit commencer par http:// ou https:// (500 caractères maximum).");
  }
  if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return fail("Date limite invalide.");

  let tender: Tender;
  try {
    tender = await backend<Tender>("/tenders/", "POST", {
      title,
      organization_name: organization || null,
      source_url: source || null,
      raw_description: description,
      // heure inconnue -> fin de journée, comme le scraper
      deadline: deadline ? `${deadline}T23:59:00` : null,
    });
  } catch (err) {
    return fail(backendMessage(err));
  }
  redirect(`/tenders/${tender.id}`);
}

function validSections(input: unknown): ProposalSection[] | null {
  if (!Array.isArray(input) || input.length > 50) return null;
  const sections: ProposalSection[] = [];
  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) return null;
    const { number, title, body, items } = raw as Record<string, unknown>;
    if (typeof number !== "number" || typeof title !== "string") return null;
    if (body !== undefined && typeof body !== "string") return null;
    if (items !== undefined) {
      if (!Array.isArray(items)) return null;
      if (!items.every((i) => typeof i?.heading === "string" && typeof i?.text === "string")) return null;
    }
    sections.push({
      number,
      title,
      ...(body !== undefined && { body }),
      ...(items !== undefined && { items: items.map(({ heading, text }) => ({ heading, text })) }),
    });
  }
  return sections;
}

// Relecture humaine : enregistre le contenu et régénère le .pptx servi par le backend.
export async function saveProposal(tenderId: number, proposalId: number, input: unknown): Promise<FormState> {
  const sections = validSections(input);
  if (!sections) return { error: "Contenu de proposition invalide." };

  try {
    const tender = await getTender(positiveId(tenderId));
    const proposal = tender?.proposals.find((p) => p.id === proposalId);
    if (!tender || !proposal) return { error: "Proposition introuvable pour ce tender." };

    const file_path_pptx = await saveProposalPptx(proposal.id, tender.title, sections);
    await backend(`/proposals/${proposal.id}`, "PATCH", {
      content_json: { ...proposal.content_json, sections },
      file_path_pptx,
    });
  } catch (err) {
    return { error: backendMessage(err) };
  }
  refresh();
  return { error: null };
}
