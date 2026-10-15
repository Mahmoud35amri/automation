"use client";

import { useActionState, useState, type ChangeEvent, type ReactNode } from "react";
import { createTender, createTenderFromNlp, type FormState } from "@/app/actions";
import { BUTTON, INPUT } from "./ui";

const INITIAL: FormState = { error: null };

type CardProps = { index: string; title: string; lead: string; children: ReactNode };

function Card({ index, title, lead, children }: CardProps) {
  return (
    <section className="animate-rise rounded-sm border border-line bg-card p-6 md:p-8">
      <p className="font-mono text-xs text-amber-deep">{index}</p>
      <h2 className="mt-2 font-display text-2xl text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{lead}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="mt-3 text-sm leading-relaxed text-brick">
      {error}
    </p>
  ) : null;
}

export function NlpImportForm() {
  const [state, action, pending] = useActionState(createTenderFromNlp, INITIAL);
  const [payload, setPayload] = useState("");

  const load = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setPayload(await file.text());
  };

  return (
    <Card
      index="A"
      title="Importer une extraction NLP"
      lead="Le JSON produit par nlp/main.py (--out result.json) : le backend le stocke tel quel et en tire titre, client et échéance."
    >
      <form action={action}>
        <label className={`${BUTTON.secondary} cursor-pointer`}>
          Charger un fichier .json
          <input type="file" accept="application/json,.json" className="sr-only" onChange={load} />
        </label>
        <label htmlFor="payload" className="mt-5 block text-sm font-medium text-ink">
          ou collez le JSON
        </label>
        <textarea
          id="payload"
          name="payload"
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={12}
          spellCheck={false}
          placeholder={'{\n  "title": "...",\n  "client_name": "...",\n  "requirements": [ ... ]\n}'}
          className={`${INPUT} mt-2 font-mono text-xs leading-relaxed`}
        />
        <ErrorLine error={state.error} />
        <button type="submit" disabled={pending} className={`${BUTTON.primary} mt-5`}>
          {pending ? "Import…" : "Importer l'extraction"}
        </button>
      </form>
    </Card>
  );
}

export function ManualTenderForm() {
  const [state, action, pending] = useActionState(createTender, INITIAL);

  return (
    <Card
      index="B"
      title="Saisie manuelle"
      lead="Un appel d'offres repéré hors des portails surveillés. Si l'URL source est déjà connue, le tender existant est rouvert."
    >
      <form action={action} className="grid gap-4">
        <div>
          <label htmlFor="title" className="text-sm font-medium text-ink">Objet de l&apos;appel d&apos;offres *</label>
          <input id="title" name="title" defaultValue={state.values?.title} required maxLength={255} className={`${INPUT} mt-1.5`} />
        </div>
        <div>
          <label htmlFor="organization_name" className="text-sm font-medium text-ink">Client / acheteur public</label>
          <input id="organization_name" name="organization_name" defaultValue={state.values?.organization_name} maxLength={255} className={`${INPUT} mt-1.5`} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="deadline" className="text-sm font-medium text-ink">Date limite</label>
            <input id="deadline" name="deadline" defaultValue={state.values?.deadline} type="date" className={`${INPUT} mt-1.5`} />
          </div>
          <div>
            <label htmlFor="source_url" className="text-sm font-medium text-ink">URL source</label>
            <input id="source_url" name="source_url" defaultValue={state.values?.source_url} type="url" maxLength={500} placeholder="https://" className={`${INPUT} mt-1.5`} />
          </div>
        </div>
        <div>
          <label htmlFor="raw_description" className="text-sm font-medium text-ink">Description / exigences</label>
          <textarea id="raw_description" name="raw_description" defaultValue={state.values?.raw_description} rows={5} className={`${INPUT} mt-1.5 leading-relaxed`} />
        </div>
        <ErrorLine error={state.error} />
        <button type="submit" disabled={pending} className={`${BUTTON.primary} justify-self-start`}>
          {pending ? "Création…" : "Créer le tender"}
        </button>
      </form>
    </Card>
  );
}
